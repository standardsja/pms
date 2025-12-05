import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function addExecutiveApprovedStatus() {
    try {
        console.log('🔄 Adding EXECUTIVE_APPROVED status to Request table...\n');

        await prisma.$executeRawUnsafe(`
            ALTER TABLE Request 
            MODIFY COLUMN status ENUM(
                'DRAFT', 
                'SUBMITTED', 
                'DEPARTMENT_REVIEW', 
                'DEPARTMENT_RETURNED', 
                'DEPARTMENT_APPROVED', 
                'EXECUTIVE_REVIEW', 
                'EXECUTIVE_APPROVED',
                'HOD_REVIEW', 
                'PROCUREMENT_REVIEW', 
                'FINANCE_REVIEW', 
                'FINANCE_RETURNED', 
                'BUDGET_MANAGER_REVIEW', 
                'FINANCE_APPROVED', 
                'SENT_TO_VENDOR', 
                'CLOSED', 
                'REJECTED'
            ) NOT NULL DEFAULT 'DRAFT'
        `);

        console.log('✅ Successfully added EXECUTIVE_APPROVED status!\n');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addExecutiveApprovedStatus();
