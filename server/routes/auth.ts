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
import path from 'path';
import fs from 'fs';
import { prisma } from '../prismaClient';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { asyncHandler, BadRequestError, UnauthorizedError } from '../middleware/errorHandler';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validate, loginSchema } from '../middleware/validation';
import { ldapService } from '../services/ldapService';
import { syncLDAPUserToDatabase, describeSyncResult } from '../services/ldapRoleSyncService';

const router = Router();

// Multer storage for profile photos
const profilePhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Get user ID from authenticated request (set by authMiddleware)
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.sub || 'unknown';
        const ext = path.extname(file.originalname);
        cb(null, `user-${userId}-${Date.now()}${ext}`);
    },
});

const uploadProfilePhoto = multer({
    storage: profilePhotoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    },
});

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window (increased from 5 for testing)
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
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

        if (!email || !password) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Email and password are required',
                statusCode: 400,
                timestamp: new Date().toISOString(),
                path: '/api/auth/login',
            });
        }
        let authMethod = 'DATABASE';
        let ldapAuthenticated = false;
        let ldapUser: any = null;

        // Try LDAP authentication first if enabled
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
            const token = jwt.sign({ sub: user.id, email: user.email, roles, name: user.name }, config.JWT_SECRET, { expiresIn: '24h' });

            logger.info('User logged in via LDAP with role sync', {
                userId: user.id,
                email: user.email,
                roles,
                syncMethod: syncResult.appliedFromADGroups ? 'AD_GROUPS' : 'ADMIN_PANEL',
            });

            return res.json({
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
        const token = jwt.sign({ sub: user.id, email: user.email, roles, name: user.name }, config.JWT_SECRET, { expiresIn: '24h' });

        logger.info('User logged in via database successfully', { userId: user.id, email: user.email });

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

        logger.info('User logged in via LDAP with role sync', {
            userId: user.id,
            email: user.email,
            ldapDN: ldapUser.dn,
            roles,
            syncMethod: syncResult.appliedFromADGroups ? 'AD_GROUPS' : 'ADMIN_PANEL',
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
    authMiddleware,
    asyncHandler(async (req, res) => {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;

        const user = await prisma.user.findUnique({
            where: { id: userId },
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
            profileImage: user.profileImage,
        });
    })
);

// Upload profile photo
router.post(
    '/upload-photo',
    authMiddleware,
    uploadProfilePhoto.single('photo'),
    asyncHandler(async (req, res) => {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;

        if (!req.file) {
            throw new BadRequestError('No photo file provided');
        }

        // Delete old profile photo if it exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { profileImage: true },
        });

        if (user?.profileImage) {
            const oldPhotoPath = path.join(process.cwd(), user.profileImage);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Update user with new profile photo path
        const relativePath = `/uploads/profiles/${req.file.filename}`;
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profileImage: relativePath },
            select: { id: true, profileImage: true },
        });

        logger.info('Profile photo updated', {
            userId: updatedUser.id,
            photoPath: relativePath,
        });

        res.json({
            success: true,
            profileImage: updatedUser.profileImage,
        });
    })
);

export { router as authRoutes };
