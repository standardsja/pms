// Seed script to add Innovation Hub demo data
// Run with: npm run innovation:seed

import { config as dotenvConfig } from 'dotenv';
import path from 'path';
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient, IdeaCategory, IdeaStatus } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function seedInnovationHub() {
    console.log('🌱 Seeding Innovation Hub demo data...');

    // Check if we already have ideas
    const existingIdeas = await prisma.idea.count();
    if (existingIdeas > 0) {
        console.log('✅ Innovation Hub already has data. Skipping seed.');
        return;
    }

    // Get or create a demo user (assuming admin user exists from main seed)
    let demoUser = await prisma.user.findUnique({
        where: { email: 'admin@example.com' }
    });

    if (!demoUser) {
        console.log('Creating demo user for Innovation Hub...');
        demoUser = await prisma.user.create({
            data: {
                email: 'innovator@bsj.org.jm',
                name: 'John Innovator',
                passwordHash: '$2a$10$K0O6sZ7W8v0rXrVFpKpG6ugr9z3bM6j0V1bY8d3E6QbK3xF8J9uY2', // Password123!
                role: 'USER',
            }
        });
    }

    // Create sample ideas
    const ideas = [
        {
            title: 'AI-Powered Document Analysis System',
            description: 'Implement artificial intelligence to automatically analyze, categorize, and extract key information from incoming documents. This would reduce manual processing time by approximately 70% and improve accuracy in document handling.',
            category: 'TECHNOLOGY' as IdeaCategory,
            status: 'APPROVED' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 45,
            viewCount: 128,
        },
        {
            title: 'Green Energy Initiative',
            description: 'Install solar panels on all BSJ building rooftops to reduce electricity costs and carbon footprint. Initial calculations show potential savings of 40% on energy bills while contributing to Jamaica\'s sustainable development goals.',
            category: 'SUSTAINABILITY' as IdeaCategory,
            status: 'APPROVED' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 38,
            viewCount: 95,
        },
        {
            title: 'Mobile App for Standards Lookup',
            description: 'Develop a mobile application that allows customers to quickly search and access standards on the go. The app would include offline functionality, QR code scanning, and integration with the main standards database.',
            category: 'CUSTOMER_SERVICE' as IdeaCategory,
            status: 'APPROVED' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 52,
            viewCount: 142,
        },
        {
            title: 'Automated Quality Control Testing',
            description: 'Implement automated testing equipment for routine quality control checks. This would free up staff time for more complex analysis and ensure consistent, unbiased test results across all samples.',
            category: 'PROCESS_IMPROVEMENT' as IdeaCategory,
            status: 'APPROVED' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 31,
            viewCount: 87,
        },
        {
            title: 'Digital Certificate Verification System',
            description: 'Create a blockchain-based system for issuing and verifying digital certificates. This would eliminate fraud, enable instant verification by third parties, and reduce paper usage.',
            category: 'TECHNOLOGY' as IdeaCategory,
            status: 'PROMOTED_TO_PROJECT' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 67,
            viewCount: 210,
            projectCode: 'BSJ-PROJ-2025-001',
            promotedAt: new Date('2025-10-15'),
        },
        {
            title: 'Customer Self-Service Portal',
            description: 'Develop a comprehensive online portal where customers can submit applications, track progress, make payments, and download certificates without visiting BSJ offices.',
            category: 'CUSTOMER_SERVICE' as IdeaCategory,
            status: 'APPROVED' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 58,
            viewCount: 165,
        },
        {
            title: 'Vendor Contract Optimization',
            description: 'Review and renegotiate all vendor contracts to identify cost-saving opportunities. Consolidate suppliers where possible and leverage bulk purchasing power.',
            category: 'COST_REDUCTION' as IdeaCategory,
            status: 'APPROVED' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 29,
            viewCount: 74,
        },
        {
            title: 'Virtual Reality Safety Training',
            description: 'Implement VR training modules for safety procedures and equipment handling. This would provide immersive, risk-free training that improves retention and reduces accidents.',
            category: 'PROCESS_IMPROVEMENT' as IdeaCategory,
            status: 'PENDING_REVIEW' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 0,
            viewCount: 12,
        },
        {
            title: 'E-Waste Recycling Program',
            description: 'Establish a program for responsibly recycling electronic waste from BSJ operations. Partner with certified recyclers and educate staff on proper e-waste disposal.',
            category: 'SUSTAINABILITY' as IdeaCategory,
            status: 'PENDING_REVIEW' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 0,
            viewCount: 8,
        },
        {
            title: 'Smart Lab Equipment Monitoring',
            description: 'Install IoT sensors on lab equipment to monitor usage, predict maintenance needs, and optimize calibration schedules. This would reduce downtime and extend equipment lifespan.',
            category: 'TECHNOLOGY' as IdeaCategory,
            status: 'APPROVED' as IdeaStatus,
            submittedBy: demoUser.id,
            voteCount: 41,
            viewCount: 103,
        },
    ];

    for (const ideaData of ideas) {
        await prisma.idea.create({
            data: ideaData,
        });
    }

    console.log(`✅ Created ${ideas.length} demo ideas`);
    console.log('🎉 Innovation Hub seed complete!');
}

seedInnovationHub()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
