/**
 * Verify all Prisma models have corresponding database tables
 */
import { prisma } from '../prismaClient.js';

async function verifyTables() {
    console.log('🔍 Verifying database tables...\n');

    const tables = [
        // Core Auth & Users
        'User',
        'Department',
        'Role',
        'UserRole',
        'RoleRequest',

        // Procurement
        'Request',
        'RequestItem',
        'RequestAttachment',
        'RequestAction',
        'RequestStatusHistory',
        'CombinedRequest',
        'FundingSource',
        'Vendor',

        // Evaluation
        'Evaluation',
        'EvaluationAssignment',

        // Innovation Hub
        'Idea',
        'Vote',
        'IdeaComment',
        'IdeaAttachment',
        'Tag',
        'IdeaTag',
        'IdeaCount',
        'Challenge',
        'IdeaStageHistory',

        // System
        'AuditLog',
        'Notification',
        'Message',
        'LoadBalancingSettings',
        'OfficerPerformanceMetrics',
        'RequestAssignmentLog',
        'SplinteringAlert',
    ];

    let allGood = true;

    for (const tableName of tables) {
        try {
            // Try to query the table (will fail if it doesn't exist)
            const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
            const count = await (prisma as any)[modelName].count();
            console.log(`✅ ${tableName.padEnd(30)} - ${count} records`);
        } catch (error: any) {
            console.log(`❌ ${tableName.padEnd(30)} - ERROR: ${error.message}`);
            allGood = false;
        }
    }

    if (allGood) {
        console.log('\n🎉 All tables verified successfully!');
    } else {
        console.log('\n⚠️  Some tables are missing or inaccessible');
    }

    await prisma.$disconnect();
}

verifyTables().catch(console.error);
