#!/usr/bin/env node
/**
 * Comprehensive flow test for Innovation Hub
 * Tests: Login, Ideas CRUD, Voting, Committee Review
 */

const BASE_URL = 'http://localhost:4000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(status, message) {
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : 'ℹ';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.cyan;
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

async function testEndpoint(name, method, url, body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

async function runTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Innovation Hub Flow Test${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
  
  let token = null;
  let userId = null;
  let ideaId = null;
  
  // Test 1: Database connectivity
  log('info', 'Test 1: Checking server connectivity...');
  const pingTest = await testEndpoint('Ping', 'GET', `${BASE_URL}/api/ideas`);
  if (!pingTest.ok && pingTest.status === 0) {
    log('fail', 'Cannot connect to server. Is it running on port 4000?');
    process.exit(1);
  }
  log('pass', 'Server is running');
  
  // Test 2: Committee user login
  log('info', '\nTest 2: Committee user login...');
  const loginResult = await testEndpoint(
    'Login',
    'POST',
    `${BASE_URL}/auth/login`,
    { email: 'committee@bsj.gov.jm', password: 'Passw0rd!' }
  );
  
  if (!loginResult.ok) {
    log('fail', `Login failed: ${loginResult.data?.message || loginResult.error}`);
    process.exit(1);
  }
  
  if (!loginResult.data.user || !loginResult.data.user.roles || !loginResult.data.user.roles.includes('INNOVATION_COMMITTEE')) {
    log('fail', 'Committee user does not have INNOVATION_COMMITTEE role');
    console.log('  User data:', JSON.stringify(loginResult.data.user, null, 2));
    process.exit(1);
  }
  
  token = loginResult.data.token;
  userId = loginResult.data.user.id;
  log('pass', `Committee user logged in (ID: ${userId}, Roles: ${loginResult.data.user.roles.join(', ')})`);
  
  // Test 3: Fetch pending ideas
  log('info', '\nTest 3: Fetching pending ideas...');
  const pendingIdeas = await testEndpoint(
    'Fetch Pending',
    'GET',
    `${BASE_URL}/api/ideas?status=PENDING_REVIEW`,
    null,
    { 'x-user-id': userId }
  );
  
  if (!pendingIdeas.ok) {
    log('fail', `Failed to fetch pending ideas: ${pendingIdeas.data?.error || pendingIdeas.error}`);
  } else {
    log('pass', `Fetched ${pendingIdeas.data.length} pending ideas`);
  }
  
  // Test 4: Submit a new idea (as regular user)
  log('info', '\nTest 4: Submitting a new idea...');
  const regularLogin = await testEndpoint(
    'Login Regular User',
    'POST',
    `${BASE_URL}/auth/login`,
    { email: 'test1@bsj.gov.jm', password: 'Passw0rd!' }
  );
  
  if (!regularLogin.ok) {
    log('fail', 'Regular user login failed');
  } else {
    const regularUserId = regularLogin.data.user.id;
    const newIdea = await testEndpoint(
      'Submit Idea',
      'POST',
      `${BASE_URL}/api/ideas`,
      {
        title: `Test Idea ${Date.now()}`,
        description: 'This is a comprehensive test idea',
        category: 'TECHNOLOGY',
        expectedBenefits: 'Better testing',
        implementationNotes: 'Run tests regularly'
      },
      { 'x-user-id': regularUserId }
    );
    
    if (!newIdea.ok) {
      log('fail', `Failed to submit idea: ${newIdea.data?.error || newIdea.error}`);
    } else {
      ideaId = newIdea.data.id;
      log('pass', `Idea submitted (ID: ${ideaId})`);
    }
  }
  
  // Test 5: Vote on idea
  if (ideaId) {
    log('info', '\nTest 5: Voting on idea...');
    const voteResult = await testEndpoint(
      'Vote',
      'POST',
      `${BASE_URL}/api/ideas/${ideaId}/vote`,
      null,
      { 'x-user-id': userId }
    );
    
    if (!voteResult.ok) {
      log('fail', `Failed to vote: ${voteResult.data?.error || voteResult.error}`);
    } else {
      log('pass', `Voted on idea ${ideaId}, vote count: ${voteResult.data.voteCount}`);
      
      // Test duplicate vote prevention
      const dupVote = await testEndpoint(
        'Duplicate Vote',
        'POST',
        `${BASE_URL}/api/ideas/${ideaId}/vote`,
        null,
        { 'x-user-id': userId }
      );
      
      if (dupVote.ok) {
        log('fail', 'Duplicate vote was not prevented!');
      } else {
        log('pass', 'Duplicate vote correctly prevented');
      }
    }
  }
  
  // Test 6: Fetch popular ideas
  log('info', '\nTest 6: Fetching popular ideas...');
  const popularIdeas = await testEndpoint(
    'Fetch Popular',
    'GET',
    `${BASE_URL}/api/ideas?sort=popularity`,
    null,
    { 'x-user-id': userId }
  );
  
  if (!popularIdeas.ok) {
    log('fail', `Failed to fetch popular ideas: ${popularIdeas.data?.error || popularIdeas.error}`);
  } else {
    const topIdea = popularIdeas.data[0];
    log('pass', `Fetched ${popularIdeas.data.length} ideas, top has ${topIdea?.voteCount || 0} votes`);
  }
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}  Flow test completed!${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
}

runTests().catch(err => {
  log('fail', `Test suite failed: ${err.message}`);
  process.exit(1);
});
