/**
 * Production-Ready Procurement Management System API Server
 * BSJ Government Implementation
 */
import { config as dotenvConfig } from 'dotenv';

// Load environment variables first
dotenvConfig();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
// @ts-ignore
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import http from 'http';

import { config } from './config/environment.js';
import { logger } from './config/logger.js';
import { prisma, ensureDbConnection } from './prismaClient.js';
import { initRedis, closeRedis } from './config/redis.js';
import { initTrendingScoreJob } from './services/trendingService.js';
import { initAnalyticsJob, stopAnalyticsJob } from './services/analyticsService.js';
import { initWebSocket } from './services/websocketService.js';
import { requestMonitoringMiddleware, getHealthStatus } from './services/monitoringService.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/validation-clean.js';
import { authMiddleware } from './middleware/auth.js';

// Route imports
import { authRoutes } from './routes/auth.js';
import { ideasRoutes } from './routes/ideas.js';
import { innovationRoutes } from './routes/innovation.js';
import { requestsRoutes } from './routes/requests.js';
import roleRequestsRouter from './routes/roleRequests.js';
import hodRouter from './routes/hod.js';
import { adminRoutes } from './routes/admin.js';
import combineRoutes from './routes/combine.js';

// Initialize Express app
const app = express();
const httpServer = http.createServer(app);

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req): boolean => {
        // More lenient in development
        const isDev = config.NODE_ENV !== 'production';
        const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || (req.ip && req.ip.includes('localhost'));
        return Boolean(isDev && isLocalhost);
    },
});

// Security and performance middleware
if (config.NODE_ENV === 'production') {
    app.use(helmet());
    app.use(compression());
}

// CORS configuration
const corsOptions = {
    origin: config.CORS_ORIGIN ? [config.CORS_ORIGIN] : true,
    credentials: true,
    optionsSuccessStatus: 200,
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Monitoring and security
app.use(requestMonitoringMiddleware);
app.use(sanitizeInput);
app.use(globalLimiter);

// Static file serving
if (!fs.existsSync(config.UPLOAD_DIR)) {
    fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(config.UPLOAD_DIR));

// Health check endpoint
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        const health = getHealthStatus();
        res.json({
            status: health.status,
            database: 'connected',
            checks: health.checks,
            timestamp: new Date(),
            version: process.env.npm_package_version || '1.0.0',
        });
    } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            message: error instanceof Error ? error.message : 'Database connection failed',
            timestamp: new Date(),
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/innovation', innovationRoutes);
app.use('/api/v1', hodRouter);
app.use('/api/requests/combinable', combineRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/role-requests', roleRequestsRouter);
app.use('/api/admin', adminRoutes);

// Error handling - must be last
app.use(notFoundHandler);
app.use(errorHandler);

// Server state
let trendingJobInterval: NodeJS.Timeout | null = null;

/**
 * Start the server with proper initialization
 */
async function startServer(): Promise<void> {
    try {
        logger.info('Starting server initialization...');

        // Database connection
        await ensureDbConnection();
        logger.info('Database connection established');

        // Cache layer
        await initRedis();

        // Background jobs
        trendingJobInterval = initTrendingScoreJob();
        initAnalyticsJob();
        logger.info('Background jobs initialized');

        // WebSocket server
        initWebSocket(httpServer);
        logger.info('WebSocket server initialized');

        // Start HTTP server
        const server = httpServer.listen(config.PORT, () => {
            const apiUrl = config.NODE_ENV === 'production' ? `https://${process.env.DOMAIN || 'api.example.com'}:${config.PORT}` : `http://localhost:${config.PORT}`;

            logger.info('Server started successfully', {
                port: config.PORT,
                environment: config.NODE_ENV,
                apiUrl,
            });
        });

        // Graceful shutdown handling
        setupGracefulShutdown(server);
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server: http.Server): void {
    const shutdown = (signal: string) => {
        logger.info('Shutdown signal received', { signal });

        // Stop accepting new connections
        server.close((err) => {
            if (err) {
                logger.error('Error during server shutdown', { error: err });
            } else {
                logger.info('HTTP server closed');
            }

            // Cleanup resources
            Promise.all([cleanupResources(), prisma.$disconnect(), closeRedis()])
                .then(() => {
                    logger.info('Cleanup completed, exiting...');
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Error during cleanup', { error });
                    process.exit(1);
                });
        });

        // Force exit after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    };

    // Handle various shutdown signals
    ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach((signal) => {
        process.on(signal as NodeJS.Signals, () => shutdown(signal));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', { error });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', { reason });
        // Don't exit on unhandled rejection in production, just log it
        if (config.NODE_ENV !== 'production') {
            process.exit(1);
        }
    });
}

/**
 * Cleanup background jobs and resources
 */
async function cleanupResources(): Promise<void> {
    if (trendingJobInterval) {
        clearInterval(trendingJobInterval);
        trendingJobInterval = null;
        logger.info('Trending score job stopped');
    }

    stopAnalyticsJob();
    logger.info('Analytics job stopped');
}

// Start the server
startServer();

export { app, startServer };
