import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * Get profile image for current user
 * Used as fallback when /api/auth/me doesn't return profileImage
 */
router.get('/api/auth/profile-photo', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthenticatedRequest).user?.sub;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                userId: user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            },
        });
    } catch (error) {
        console.error('Profile photo endpoint error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
