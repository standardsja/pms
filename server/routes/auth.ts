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
import { computePermissionsForUser, computeDeptManagerForUser } from '../utils/permissionUtils';
import { syncLDAPUserToDatabase, describeSyncResult } from '../services/ldapRoleSyncService';
import { bulkSyncADUsers, getSyncStatistics } from '../services/ldapBulkSyncService';

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
            const permissions = computePermissionsForUser(user);
            const deptManagerFor = computeDeptManagerForUser(user);
            const token = jwt.sign({ sub: user.id, email: user.email, roles, name: user.name, permissions, deptManagerFor }, config.JWT_SECRET, { expiresIn: '24h' });

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
                    permissions,
                    deptManagerFor,
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
        const permissions = computePermissionsForUser(user);
        const deptManagerFor = computeDeptManagerForUser(user);
        const token = jwt.sign({ sub: user.id, email: user.email, roles, name: user.name, permissions, deptManagerFor }, config.JWT_SECRET, { expiresIn: '24h' });

        logger.info('User logged in via database successfully', { userId: user.id, email: user.email });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roles,
                permissions,
                deptManagerFor,
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
        const permissions = computePermissionsForUser(user);
        const deptManagerFor = computeDeptManagerForUser(user);
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                roles,
                name: user.name,
                permissions,
                deptManagerFor,
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
                permissions,
                deptManagerFor,
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
        const permissions = computePermissionsForUser(user);
        const deptManagerFor = computeDeptManagerForUser(user);

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            roles,
            permissions,
            deptManagerFor,
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

// Simple LDAP test endpoint (development helper) - reports LDAP enabled and connection status
router.get(
    '/test-connection',
    asyncHandler(async (_req, res) => {
        try {
            const enabled = ldapService.isEnabled();
            const connected = enabled ? await ldapService.testConnection() : false;
            return res.json({ enabled, connected, ldapConfig: enabled ? { url: config.LDAP?.url, searchDN: config.LDAP?.searchDN } : null });
        } catch (err: any) {
            return res.status(500).json({ enabled: ldapService.isEnabled(), connected: false, error: err?.message || String(err) });
        }
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

/**
 * POST /api/auth/sync-ldap-photo
 * Sync profile photo from LDAP/Active Directory
 * Pulls the user's thumbnailPhoto attribute from AD and saves it
 */
router.post(
    '/sync-ldap-photo',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;

        // Get current user from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, profileImage: true, ldapDN: true },
        });

        if (!user) {
            throw new BadRequestError('User not found');
        }

        // Check if LDAP is enabled
        if (!ldapService.isEnabled()) {
            throw new BadRequestError('LDAP is not configured on this server');
        }

        // Check if user has LDAP DN (was synced from AD)
        if (!user.ldapDN) {
            throw new BadRequestError('This account is not linked to Active Directory');
        }

        logger.info('Syncing LDAP photo for user', { userId, email: user.email });

        // Find user in LDAP to get their photo
        const ldapUser = await ldapService.findUser(user.email);

        if (!ldapUser) {
            throw new BadRequestError('User not found in Active Directory');
        }

        if (!ldapUser.profileImage) {
            throw new BadRequestError('No profile photo found in Active Directory');
        }

        // Delete old profile photo if it exists and is not from LDAP
        if (user.profileImage && !user.profileImage.includes('ldap-')) {
            const oldPhotoPath = path.join(process.cwd(), user.profileImage);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                logger.info('Deleted old custom profile photo', { path: user.profileImage });
            }
        }

        // Update user with LDAP profile photo
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profileImage: ldapUser.profileImage },
            select: { id: true, profileImage: true },
        });

        logger.info('LDAP profile photo synced', {
            userId: updatedUser.id,
            photoPath: ldapUser.profileImage,
        });

        res.json({
            success: true,
            profileImage: updatedUser.profileImage,
            message: 'Profile photo synced from Active Directory',
        });
    })
);

/**
 * GET /api/auth/ldap/sync-stats
 * Get LDAP synchronization statistics
 * Shows how many AD users exist vs. how many are synced to database
 */
router.get(
    '/ldap/sync-stats',
    authMiddleware,
    asyncHandler(async (req, res) => {
        // Type assertion after authMiddleware ensures user exists
        const userId = (req as AuthenticatedRequest).user!.sub;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        const isAdmin = user?.roles.some((r) => r.role.name === 'ADMIN');
        if (!isAdmin) {
            throw new UnauthorizedError('Only administrators can view sync statistics');
        }

        const stats = await getSyncStatistics();

        res.json({
            success: true,
            statistics: stats,
        });
    })
);

/**
 * POST /api/auth/ldap/bulk-sync
 * Bulk synchronize all users from Active Directory
 * Imports all AD users and assigns roles based on group memberships
 *
 * ADMIN ONLY
 */
router.post(
    '/ldap/bulk-sync',
    authMiddleware,
    asyncHandler(async (req, res) => {
        // Type assertion after authMiddleware ensures user exists
        const userId = (req as AuthenticatedRequest).user!.sub;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        const isAdmin = user.roles.some((r) => r.role.name === 'ADMIN');
        if (!isAdmin) {
            throw new UnauthorizedError('Only administrators can perform bulk synchronization');
        }

        logger.info('LDAP Bulk Sync: Initiated by admin', {
            adminId: userId,
            adminEmail: user.email,
        });

        // Optional: custom LDAP filter from request body
        const { filter } = req.body;

        // Perform bulk sync
        const result = await bulkSyncADUsers(filter);

        logger.info('LDAP Bulk Sync: Completed', {
            result,
            adminId: userId,
        });

        res.json({
            success: true,
            message: 'Bulk synchronization completed',
            result: {
                totalUsersFound: result.totalUsersFound,
                usersImported: result.usersImported,
                usersUpdated: result.usersUpdated,
                usersFailed: result.usersFailed,
                duration: `${(result.duration / 1000).toFixed(2)}s`,
                errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined, // Show max 10 errors
            },
        });
    })
);

export { router as authRoutes };
