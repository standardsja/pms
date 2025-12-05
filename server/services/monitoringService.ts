import { Request, Response, NextFunction } from 'express';

/**
 * Performance metrics storage
 */
interface PerformanceMetrics {
    requests: {
        total: number;
        success: number;
        errors: number;
        byEndpoint: Record<string, { count: number; avgDuration: number; errors: number }>;
    };
    cache: {
        hits: number;
        misses: number;
        hitRate: number;
    };
    database: {
        queries: number;
        slowQueries: number;
        avgQueryTime: number;
    };
    websocket: {
        connections: number;
        messagesReceived: number;
        messagesSent: number;
    };
    uptime: number;
    startTime: Date;
    lastReset: Date;
}

let metrics: PerformanceMetrics = {
    requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: {},
    },
    cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
    },
    database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0,
    },
    websocket: {
        connections: 0,
        messagesReceived: 0,
        messagesSent: 0,
    },
    uptime: 0,
    startTime: new Date(),
    lastReset: new Date(),
};

const queryTimes: number[] = [];
const MAX_QUERY_TIMES = 1000; // Keep last 1000 query times

/**
 * Request performance monitoring middleware
 */
export function requestMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // Track response
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        metrics.requests.total++;

        if (res.statusCode >= 200 && res.statusCode < 400) {
            metrics.requests.success++;
        } else if (res.statusCode >= 400) {
            metrics.requests.errors++;
        }

        // Track per-endpoint metrics
        if (!metrics.requests.byEndpoint[endpoint]) {
            metrics.requests.byEndpoint[endpoint] = { count: 0, avgDuration: 0, errors: 0 };
        }

        const endpointMetrics = metrics.requests.byEndpoint[endpoint];
        const prevAvg = endpointMetrics.avgDuration;
        const prevCount = endpointMetrics.count;

        endpointMetrics.count++;
        endpointMetrics.avgDuration = (prevAvg * prevCount + duration) / endpointMetrics.count;

        if (res.statusCode >= 400) {
            endpointMetrics.errors++;
        }

        // Log slow requests (>1s)
        if (duration > 1000) {
            console.warn(`[Monitoring] Slow request: ${endpoint} took ${duration}ms`);
        }
    });

    next();
}

/**
 * Track cache hit
 */
export function trackCacheHit(): void {
    metrics.cache.hits++;
    updateCacheHitRate();
}

/**
 * Track cache miss
 */
export function trackCacheMiss(): void {
    metrics.cache.misses++;
    updateCacheHitRate();
}

/**
 * Update cache hit rate
 */
function updateCacheHitRate(): void {
    const total = metrics.cache.hits + metrics.cache.misses;
    metrics.cache.hitRate = total > 0 ? (metrics.cache.hits / total) * 100 : 0;
}

/**
 * Track database query
 */
export function trackDatabaseQuery(duration: number): void {
    metrics.database.queries++;

    queryTimes.push(duration);
    if (queryTimes.length > MAX_QUERY_TIMES) {
        queryTimes.shift(); // Remove oldest
    }

    // Calculate average
    const sum = queryTimes.reduce((a, b) => a + b, 0);
    metrics.database.avgQueryTime = sum / queryTimes.length;

    // Track slow queries (>100ms)
    if (duration > 100) {
        metrics.database.slowQueries++;
        console.warn(`[Monitoring] Slow query detected: ${duration}ms`);
    }
}

/**
 * Track WebSocket connection
 */
export function trackWebSocketConnection(connected: boolean): void {
    if (connected) {
        metrics.websocket.connections++;
    } else {
        metrics.websocket.connections = Math.max(0, metrics.websocket.connections - 1);
    }
}

/**
 * Track WebSocket message
 */
export function trackWebSocketMessage(sent: boolean): void {
    if (sent) {
        metrics.websocket.messagesSent++;
    } else {
        metrics.websocket.messagesReceived++;
    }
}

/**
 * Get current metrics
 */
export function getMetrics(): PerformanceMetrics & { uptimeSeconds: number } {
    const uptimeSeconds = Math.floor((Date.now() - metrics.startTime.getTime()) / 1000);

    return {
        ...metrics,
        uptime: uptimeSeconds,
        uptimeSeconds,
    };
}

/**
 * Get health status
 */
export function getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        requestErrorRate: { status: string; value: number };
        cacheHitRate: { status: string; value: number };
        slowQueries: { status: string; value: number };
        uptime: { status: string; value: number };
    };
} {
    const errorRate = metrics.requests.total > 0 ? (metrics.requests.errors / metrics.requests.total) * 100 : 0;

    const slowQueryRate = metrics.database.queries > 0 ? (metrics.database.slowQueries / metrics.database.queries) * 100 : 0;

    const uptimeSeconds = Math.floor((Date.now() - metrics.startTime.getTime()) / 1000);

    const checks = {
        requestErrorRate: {
            status: errorRate < 5 ? 'pass' : errorRate < 10 ? 'warn' : 'fail',
            value: Math.round(errorRate * 100) / 100,
        },
        cacheHitRate: {
            status: metrics.cache.hitRate > 70 ? 'pass' : metrics.cache.hitRate > 50 ? 'warn' : 'fail',
            value: Math.round(metrics.cache.hitRate * 100) / 100,
        },
        slowQueries: {
            status: slowQueryRate < 5 ? 'pass' : slowQueryRate < 15 ? 'warn' : 'fail',
            value: Math.round(slowQueryRate * 100) / 100,
        },
        uptime: {
            status: uptimeSeconds > 60 ? 'pass' : 'warn',
            value: uptimeSeconds,
        },
    };

    const failCount = Object.values(checks).filter((c) => c.status === 'fail').length;
    const warnCount = Object.values(checks).filter((c) => c.status === 'warn').length;

    const status = failCount > 0 ? 'unhealthy' : warnCount > 1 ? 'degraded' : 'healthy';

    return { status, checks };
}

/**
 * Reset metrics
 */
export function resetMetrics(): void {
    metrics = {
        requests: {
            total: 0,
            success: 0,
            errors: 0,
            byEndpoint: {},
        },
        cache: {
            hits: 0,
            misses: 0,
            hitRate: 0,
        },
        database: {
            queries: 0,
            slowQueries: 0,
            avgQueryTime: 0,
        },
        websocket: {
            connections: metrics.websocket.connections, // Keep current connections
            messagesReceived: 0,
            messagesSent: 0,
        },
        uptime: 0,
        startTime: metrics.startTime, // Keep original start time
        lastReset: new Date(),
    };

    queryTimes.length = 0;
    console.log('[Monitoring] Metrics reset');
}

/**
 * Get top slow endpoints
 */
export function getSlowEndpoints(limit: number = 10): Array<{
    endpoint: string;
    avgDuration: number;
    count: number;
    errors: number;
}> {
    return Object.entries(metrics.requests.byEndpoint)
        .map(([endpoint, data]) => ({ endpoint, ...data }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, limit);
}

/**
 * Get endpoints with most errors
 */
export function getErrorProneEndpoints(limit: number = 10): Array<{
    endpoint: string;
    errors: number;
    count: number;
    errorRate: number;
}> {
    return Object.entries(metrics.requests.byEndpoint)
        .map(([endpoint, data]) => ({
            endpoint,
            errors: data.errors,
            count: data.count,
            errorRate: (data.errors / data.count) * 100,
        }))
        .filter((e) => e.errors > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, limit);
}
