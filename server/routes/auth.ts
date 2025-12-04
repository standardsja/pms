/**
 * Authentication Routes
 * Handles user login, token validation, and user profile endpoints
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prismaClient';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { asyncHandler, BadRequestError, UnauthorizedError } from '../middleware/errorHandler';
import { validate, loginSchema } from '../middleware/validation';
import { ldapService } from '../services/ldapService';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
});

// Login endpoint
router.post(
    '/login',
    authLimiter,
    (req, res, next) => {
        console.log('[Auth Route] Body:', req.body);
        console.log('[Auth Route] Headers:', req.headers);
        next();
    },
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
                department: true,
            },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const roles = user.roles.map((r) => r.role.name);
        const token = jwt.sign({ sub: user.id, email: user.email, roles, name: user.name }, config.JWT_SECRET, { expiresIn: '24h' });

        logger.info('User logged in successfully', { userId: user.id, email: user.email });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roles,
                department: user.department
                    ? {
                          id: user.department.id,
                          name: user.department.name,
                          code: user.department.code,
                      }
                    : null,
            },
        });
    })
);

// LDAP Login endpoint
router.post(
    '/ldap-login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Check if LDAP is enabled
        if (!ldapService.isEnabled()) {
            throw new BadRequestError('LDAP authentication is not configured');
        }

        // Authenticate user against LDAP
        const ldapUser = await ldapService.authenticateUser(email, password);

        logger.info('LDAP authentication successful', { email, dn: ldapUser.dn });

        // Look up user in local database
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
                department: true,
            },
        });

        if (!user) {
            logger.warn('LDAP authenticated user not found in local database', { email });
            throw new UnauthorizedError('User account not found in system. Please contact your administrator.');
        }

        // Generate JWT token
        const roles = user.roles.map((r) => r.role.name);
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                roles,
                name: user.name,
            },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info('User logged in via LDAP successfully', {
            userId: user.id,
            email: user.email,
            ldapDN: ldapUser.dn,
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roles,
                department: user.department
                    ? {
                          id: user.department.id,
                          name: user.department.name,
                          code: user.department.code,
                      }
                    : null,
            },
        });
    })
);

// Get current user profile
router.get(
    '/me',
    asyncHandler(async (req, res) => {
        const payload = (req as any).user as { sub: number };

        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
                department: true,
            },
        });

        if (!user) {
            throw new BadRequestError('User not found');
        }

        const roles = user.roles.map((r) => r.role.name);

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            roles,
            department: user.department
                ? {
                      id: user.department.id,
                      name: user.department.name,
                      code: user.department.code,
                  }
                : null,
        });
    })
);

export { router as authRoutes };
