/**
 * Test script to verify the idea approval workflow:
 * 1. Regular user creates idea → status = PENDING_REVIEW
 * 2. Regular users cannot see PENDING_REVIEW ideas in vote list
 * 3. Committee members can see PENDING_REVIEW ideas
 * 4. Committee approves idea → status = APPROVED
 * 5. Now all users can see the idea
 */

async function testWorkflow() {
  const BASE_URL = 'http://localhost:4000';
  
  console.log('\n=== Testing Idea Approval Workflow ===\n');
  
  // 1. Login as regular user
  console.log('1. Logging in as regular user (ICT staff)...');
  const userLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ict.staff1@bsj.gov.jm',
      password: 'Test123!'
    })
  });
  const userAuth = await userLogin.json();
  console.log(`✓ Logged in: ${userAuth.user.email}`);
  console.log(`  Roles: ${userAuth.user.roles.join(', ')}`);
  
  // 2. Create an idea as regular user
  console.log('\n2. Creating new idea...');
  const createIdea = await fetch(`${BASE_URL}/api/ideas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userAuth.token}`
    },
    body: JSON.stringify({
      title: 'Test Idea - Requires Approval',
      description: 'This idea should go to PENDING_REVIEW status and only be visible to committee',
      category: 'PROCESS_IMPROVEMENT'
    })
  });
  const newIdea = await createIdea.json();
  console.log(`✓ Idea created (ID: ${newIdea.id})`);
  console.log(`  Status: ${newIdea.status}`);
  console.log(`  Title: ${newIdea.title}`);
  
  // 3. Try to fetch ideas as regular user (should not see PENDING_REVIEW)
  console.log('\n3. Fetching ideas as regular user...');
  const userIdeasResponse = await fetch(`${BASE_URL}/api/ideas`, {
    headers: { 'Authorization': `Bearer ${userAuth.token}` }
  });
  const userIdeas = await userIdeasResponse.json();
  const pendingInUserList = userIdeas.filter((i: any) => i.status === 'PENDING_REVIEW');
  console.log(`✓ Total ideas visible: ${userIdeas.length}`);
  console.log(`  PENDING_REVIEW ideas: ${pendingInUserList.length}`);
  if (pendingInUserList.length === 0) {
    console.log('  ✓ Correct! Regular users cannot see pending ideas');
  } else {
    console.log('  ✗ ERROR: Regular users should not see pending ideas!');
  }
  
  // 4. Login as committee member
  console.log('\n4. Logging in as committee member...');
  const committeeLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'committee@bsj.gov.jm',
      password: 'Committee123!'
    })
  });
  const committeeAuth = await committeeLogin.json();
  console.log(`✓ Logged in: ${committeeAuth.user.email}`);
  console.log(`  Roles: ${committeeAuth.user.roles.join(', ')}`);
  
  // 5. Fetch ideas as committee (should see PENDING_REVIEW)
  console.log('\n5. Fetching ideas as committee member...');
  const committeeIdeasResponse = await fetch(`${BASE_URL}/api/ideas`, {
    headers: { 'Authorization': `Bearer ${committeeAuth.token}` }
  });
  const committeeIdeas = await committeeIdeasResponse.json();
  const pendingInCommitteeList = committeeIdeas.filter((i: any) => i.status === 'PENDING_REVIEW');
  console.log(`✓ Total ideas visible: ${committeeIdeas.length}`);
  console.log(`  PENDING_REVIEW ideas: ${pendingInCommitteeList.length}`);
  if (pendingInCommitteeList.length > 0) {
    console.log('  ✓ Correct! Committee can see pending ideas');
  } else {
    console.log('  ✗ ERROR: Committee should see pending ideas!');
  }
  
  // 6. Approve the idea
  console.log('\n6. Approving the idea...');
  const approveResponse = await fetch(`${BASE_URL}/api/ideas/${newIdea.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${committeeAuth.token}`
    },
    body: JSON.stringify({
      notes: 'Great idea! Approved for voting.'
    })
  });
  const approvedIdea = await approveResponse.json();
  console.log(`✓ Idea approved`);
  console.log(`  New status: ${approvedIdea.status}`);
  
  // 7. Verify regular user can now see the approved idea
  console.log('\n7. Fetching ideas again as regular user...');
  const userIdeasResponse2 = await fetch(`${BASE_URL}/api/ideas`, {
    headers: { 'Authorization': `Bearer ${userAuth.token}` }
  });
  const userIdeas2 = await userIdeasResponse2.json();
  const ourIdea = userIdeas2.find((i: any) => i.id === newIdea.id);
  if (ourIdea) {
    console.log(`✓ Idea is now visible to regular users!`);
    console.log(`  Status: ${ourIdea.status}`);
    console.log('  ✓ Workflow complete! Ideas require committee approval before appearing in voting.');
  } else {
    console.log('  ✗ ERROR: Approved idea should be visible to all users!');
  }
  
  console.log('\n=== Test Complete ===\n');
}

testWorkflow().catch(console.error);
