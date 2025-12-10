import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * TEST ENDPOINT: Get profile image for current user
 * This is a clean test to see if code changes are being picked up
 */
router.get('/api/test/my-photo', authMiddleware, async (req: Request, res: Response) => {
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
                timestamp: new Date().toISOString(),
                testMessage: 'This is from the NEW test-photo.ts endpoint',
            },
        });
    } catch (error) {
        console.error('Test photo endpoint error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
