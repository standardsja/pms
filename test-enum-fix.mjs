#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEnumValidation() {
  try {
    console.log('Testing enum validation...');
    
    // This should work - valid enum value
    const validResult = await prisma.request.findMany({
      where: { status: 'DRAFT' },
      take: 1
    });
    console.log('✅ Valid status query succeeded');
    
    // This should fail if we pass an empty string directly
    try {
      const invalidResult = await prisma.request.findMany({
        where: { status: '' },
        take: 1
      });
      console.log('❌ Empty string query should have failed but succeeded');
    } catch (error) {
      console.log('✅ Empty string query failed as expected:', error.message);
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEnumValidation();