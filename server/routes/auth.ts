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

import { Client } from 'ldapts';

const url = 'ldap://BOS.local:389';
const bindDN = 'CN=Policy Test,OU=MIS_STAFF,OU=MIS,DC=BOS,DC=local';
const password = 'Password@101';
const searchDN = 'DC=BOS,DC=local';

const client = new Client({
    url,
});

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

// LDAP login
router.post(
    '/ldap-login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        let userAuthenticated = false;
        let ldapDN = '';
        const { email, password } = req.body;

        try {
            // Bind with admin credentials to search
            await client.bind(bindDN, password);
            const { searchEntries } = await client.search(searchDN, {
                filter: '(userPrincipalName=' + email + ')',
            });

            if (searchEntries.length === 0) {
                await client.unbind();
                throw new BadRequestError('User not found');
            }

            ldapDN = searchEntries[0].dn;
            logger.info('LDAP user details', { email, dn: ldapDN });

            // Unbind from admin and try to bind as the user
            await client.unbind();
            await client.bind(ldapDN, password);
            userAuthenticated = true;
            logger.info('User authenticated via LDAP successfully', { email, dn: ldapDN });
        } catch (ex) {
            await client.unbind().catch(() => null);
            console.error('LDAP authentication error:', ex);
            throw new UnauthorizedError('Invalid credentials');
        }

        // If we get here, user is authenticated
        if (!userAuthenticated) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Look up user in local database
        let user = await prisma.user.findUnique({
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

        logger.info('LDAP user lookup in local DB', { email, userExists: !!user });

        if (!user) {
            // User authenticated via LDAP but not in local DB - cannot proceed
            throw new BadRequestError('User account not found in system. Please contact your administrator.');
        }

        // Generate JWT token
        const roles = user.roles.map((r) => r.role.name);
        const token = jwt.sign({ sub: user.id, email: user.email, roles, name: user.name }, config.JWT_SECRET, { expiresIn: '24h' });

        logger.info('User logged in via LDAP successfully', { userId: user.id, email: user.email });

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

export { router as authRoutes };
