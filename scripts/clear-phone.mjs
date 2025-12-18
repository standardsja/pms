import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProfileImage() {
    try {
        const result = await prisma.user.update({
            where: { email: 'srobinson@bsj.org.jm' },
            data: { profileImage: '/uploads/profiles/ldap-srobinson-bsj-org-jm-1765300256736.jpg' },
        });
        console.log('Profile image updated to:', result.profileImage);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixProfileImage();
