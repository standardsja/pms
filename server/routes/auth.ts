/**
 * Authentication Routes
 * Handles user login, token validation, and user profile endpoints
 *
 * Now includes hybrid LDAP approach:
 * 1. Authenticate against LDAP
 * 2. Sync user roles from AD groups (via ldapRoleSyncService)
 * 3. Fall back to admin-assigned roles if no AD groups
 * 4. Always assign REQUESTER if no roles found
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prismaClient';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { asyncHandler, BadRequestError, UnauthorizedError } from '../middleware/errorHandler';
import { validate, loginSchema } from '../middleware/validation';
import { ldapService } from '../services/ldapService';
import { syncLDAPUserToDatabase, describeSyncResult } from '../services/ldapRoleSyncService';
import { createRefreshToken, verifyAndRotateRefreshToken, revokeRefreshToken } from '../services/tokenService';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Access token helper
function generateAccessToken(user: { id: number; email: string; name?: string; roles?: string[] }) {
    return jwt.sign({ sub: user.id, email: user.email, roles: user.roles, name: user.name }, config.JWT_SECRET, {
        expiresIn: '24h',
    });
}

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window (increased from 5 for testing)
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
});

// Multer storage for profile images
const profileUploadDir = path.resolve(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(profileUploadDir)) {
    fs.mkdirSync(profileUploadDir, { recursive: true });
}

const profileImageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profileUploadDir),
    filename: (req, file, cb) => {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.sub || 'anon';
        const ext = path.extname(file.originalname) || '.jpg';
        const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '');
        cb(null, `profile-${userId}-${Date.now()}-${safeBase}${ext}`);
    },
});

const profileImageUpload = multer({
    storage: profileImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        // Accept common image uploads; defer strict validation to downstream processing if needed
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('INVALID_FILE_TYPE'));
        }
        cb(null, true);
    },
});

// Login endpoint - Unified LDAP + database authentication with hybrid role sync
router.post(
    '/login',
    authLimiter,
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        logger.info('Auth login request received', {
            email,
            hasPassword: Boolean(password),
        });

        let authMethod = 'DATABASE';
        let ldapAuthenticated = false;
        let ldapUser: any = null;
        if (ldapService.isEnabled()) {
            try {
                logger.info('Attempting LDAP authentication', { email });
                ldapUser = await ldapService.authenticateUser(email, password);
                ldapAuthenticated = true;
                authMethod = 'LDAP';
                logger.info('LDAP authentication successful', {
                    email,
                    groupCount: ldapUser.memberOf?.length || 0,
                });
            } catch (ldapError) {
                logger.warn('LDAP authentication failed, falling back to database', {
                    email,
                    error: ldapError instanceof Error ? ldapError.message : 'Unknown error',
                });
                // Fall through to database authentication
            }
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

        // If LDAP succeeded, sync user data and roles
        if (ldapAuthenticated && ldapUser) {
            if (!user) {
                logger.info('LDAP authenticated user not in database, creating new user', { email });
                user = await prisma.user.create({
                    data: {
                        email,
                        name: ldapUser.name || email,
                        externalId: ldapUser.dn,
                        ldapDN: ldapUser.dn,
                    },
                    include: {
                        roles: {
                            include: {
                                role: true,
                            },
                        },
                        department: true,
                    },
                });
            } else {
                // Update LDAP-synced fields for existing user
                try {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            name: ldapUser.name || user.name,
                            ldapDN: ldapUser.dn,
                            externalId: ldapUser.dn,
                            // Only update if LDAP provided these values
                            ...(ldapUser.email && { email: ldapUser.email }),
                        },
                        include: {
                            roles: {
                                include: {
                                    role: true,
                                },
                            },
                            department: true,
                        },
                    });
                    logger.info('LDAP user profile updated', { email, userId: user.id });
                } catch (updateErr) {
                    logger.warn('Failed to update LDAP user profile', { email, error: updateErr });
                }
            }

            // Perform hybrid role sync: AD groups → admin panel → default REQUESTER
            const syncResult = await syncLDAPUserToDatabase(ldapUser, user);

            logger.info('LDAP user roles synced', {
                email,
                syncSummary: describeSyncResult(syncResult),
            });

            // Refresh user data from database with new roles
            user = await prisma.user.findUnique({
                where: { id: user.id },
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
                throw new UnauthorizedError('User account not found in system.');
            }

            const roles = user.roles.map((r) => r.role.name);
            const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name, roles });
            const refreshToken = await createRefreshToken(user.id);

            logger.info('User logged in via LDAP with role sync', {
                userId: user.id,
                email: user.email,
                roles,
                syncMethod: syncResult.appliedFromADGroups ? 'AD_GROUPS' : 'ADMIN_PANEL',
            });

            return res.json({
                token: accessToken,
                refreshToken,
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
        }

        // If LDAP didn't work or is disabled, try database authentication
        if (!user || !user.passwordHash) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const roles = user.roles.map((r) => r.role.name);
        const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name, roles });
        const refreshToken = await createRefreshToken(user.id);

        logger.info('User logged in via database successfully', { userId: user.id, email: user.email });

        res.json({
            token: accessToken,
            refreshToken,
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

// Logout (revoke a refresh token)
router.post(
    '/logout',
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken required' });

        const ok = await revokeRefreshToken(refreshToken);
        return res.json({ success: Boolean(ok) });
    })
);

// LDAP Login endpoint (explicit LDAP only, with hybrid role sync)
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

        logger.info('LDAP authentication successful', {
            email,
            dn: ldapUser.dn,
            groupCount: ldapUser.memberOf?.length || 0,
        });

        // Look up or create user in local database
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

        if (!user) {
            logger.info('LDAP authenticated user not in database, creating new user', { email });
            user = await prisma.user.create({
                data: {
                    email,
                    name: ldapUser.name || email,
                },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                    department: true,
                },
            });
        }

        // Perform hybrid role sync: AD groups → admin panel → default REQUESTER
        const syncResult = await syncLDAPUserToDatabase(ldapUser, user!);

        logger.info('LDAP user roles synced', {
            email,
            syncSummary: describeSyncResult(syncResult),
        });

        // Refresh user data from database with new roles
        user = await prisma.user.findUnique({
            where: { id: user.id },
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
            throw new UnauthorizedError('User account not found in system.');
        }

        const roles = user.roles.map((r) => r.role.name);
        const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name, roles });
        const refreshToken = await createRefreshToken(user.id);

        logger.info('User logged in via LDAP with role sync', {
            userId: user.id,
            email: user.email,
            ldapDN: ldapUser.dn,
            roles,
            syncMethod: syncResult.appliedFromADGroups ? 'AD_GROUPS' : 'ADMIN_PANEL',
        });

        res.json({
            token: accessToken,
            refreshToken,
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
            profileImage: user.profileImage || null,
            phone: user.phone || null,
            jobTitle: user.jobTitle || null,
        });
    })
);

// Upload profile image
router.post(
    '/profile-image',
    authMiddleware,
    (req, res, next) => {
        profileImageUpload.single('profileImage')(req, res, (err: any) => {
            if (err) {
                if (err.message === 'INVALID_FILE_TYPE') {
                    return res.status(400).json({ success: false, message: 'Invalid file type. Please upload an image.' });
                }
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ success: false, message: 'File too large. Max size is 5MB.' });
                }
                return res.status(400).json({ success: false, message: 'Upload failed. Please try again.' });
            }
            return next();
        });
    },
    asyncHandler(async (req, res) => {
        const authReq = req as AuthenticatedRequest;
        const userId = Number(authReq.user?.sub);

        if (!Number.isFinite(userId)) {
            throw new UnauthorizedError('Not authenticated');
        }

        if (!req.file) {
            throw new BadRequestError('No file uploaded');
        }

        const relativePath = `/uploads/profiles/${req.file.filename}`;

        try {
            await prisma.user.update({
                where: { id: userId },
                data: { profileImage: relativePath },
            });

            logger.info('Profile image updated', {
                userId,
                path: relativePath,
                mimetype: req.file.mimetype,
                size: req.file.size,
                filename: req.file.filename,
            });

            res.json({ success: true, profileImage: relativePath });
        } catch (err: any) {
            const errMsg = err?.message || String(err);
            const errCode = err?.code;

            logger.warn('Profile image update failed', {
                userId,
                error: errMsg,
                code: errCode,
                mimetype: req.file.mimetype,
                size: req.file.size,
                filename: req.file.filename,
            });

            if (errCode === 'P2025') {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            return res.status(400).json({ success: false, message: errMsg || 'Invalid data provided' });
        }
    })
);

export { router as authRoutes };

// Refresh token endpoint
router.post(
    '/refresh',
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'refreshToken required' });
        }

        const refreshSecret = process.env.REFRESH_SECRET || config.JWT_SECRET;

        try {
            const rotated = await verifyAndRotateRefreshToken(refreshToken);
            if (!rotated) {
                return res.status(401).json({ success: false, message: 'Invalid refresh token' });
            }

            const user = await prisma.user.findUnique({ where: { id: rotated.userId }, include: { roles: { include: { role: true } } } });
            if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

            const roles = user.roles.map((r) => r.role.name);
            const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name, roles });

            return res.json({ token: accessToken, refreshToken: rotated.newRefreshToken });
        } catch (err: any) {
            logger.warn('Refresh token rotation failed', { message: err?.message || String(err) });
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }
    })
);
