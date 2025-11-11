import fetch from 'node-fetch';

async function testLogin() {
  console.log('Testing login endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@bsj.gov.jm',
        password: 'Passw0rd!'
      })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.user) {
      console.log('\n✅ Login successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Roles:', data.user.roles);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testLogin();
