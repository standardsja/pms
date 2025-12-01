import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCombinedRequest() {
    try {
        // Find the most recent combined request
        const combinedRequests = await prisma.request.findMany({
            where: {
                reference: {
                    startsWith: 'CMB-',
                },
            },
            include: {
                items: true,
                requester: { select: { name: true } },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 1,
        });

        if (combinedRequests.length === 0) {
            console.log('❌ No combined requests found');
            return;
        }

        const request = combinedRequests[0];

        console.log('\n📦 Combined Request Details:');
        console.log(`   Reference: ${request.reference}`);
        console.log(`   Title: ${request.title}`);
        console.log(`   Total Estimated: ${request.totalEstimated}`);
        console.log(`   Currency: ${request.currency}`);
        console.log(`   Created: ${request.createdAt}`);

        console.log('\n📋 Items:');
        let calculatedTotal = 0;
        request.items.forEach((item, index) => {
            const itemTotal = Number(item.totalPrice);
            calculatedTotal += itemTotal;
            console.log(`   ${index + 1}. ${item.description}`);
            console.log(`      Qty: ${item.quantity}, Unit Price: ${item.unitPrice}, Total: ${item.totalPrice}`);
        });

        console.log(`\n🧮 Calculation Check:`);
        console.log(`   Sum of items: ${calculatedTotal}`);
        console.log(`   Request total: ${request.totalEstimated}`);
        console.log(`   Match: ${calculatedTotal === Number(request.totalEstimated) ? '✅' : '❌'}`);

        if (calculatedTotal !== Number(request.totalEstimated)) {
            console.log(`   Difference: ${Math.abs(calculatedTotal - Number(request.totalEstimated))}`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCombinedRequest();
