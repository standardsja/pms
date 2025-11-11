#!/usr/bin/env node
import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function checkApprovedIdeas() {
  try {
    const res = await fetch(`${BASE_URL}/api/ideas?status=APPROVED&t=${Date.now()}`);
    if (!res.ok) {
      console.error('Failed to fetch APPROVED ideas:', res.status, await res.text());
      process.exit(1);
    }
    const ideas = await res.json();
    console.log(`\nFound ${ideas.length} APPROVED ideas:\n`);
    
    if (ideas.length === 0) {
      console.log('No APPROVED ideas found. Checking all ideas by status:');
      const allRes = await fetch(`${BASE_URL}/api/ideas?t=${Date.now()}`);
      const allIdeas = await allRes.json();
      
      const byStatus = {};
      allIdeas.forEach(idea => {
        byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
      });
      
      console.log('\nIdea counts by status:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      console.log('\n📝 To make ideas available for voting, the committee needs to approve them.');
      console.log('   Go to Committee Dashboard → Pending Review → Approve ideas\n');
    } else {
      ideas.forEach(idea => {
        console.log(`  #${idea.id} "${idea.title}" - Score: ${idea.voteCount}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkApprovedIdeas();
