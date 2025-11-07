// Quick test of the login endpoint
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.requester@bsj.gov.jm',
        password: 'Passw0rd!'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Login successful!');
    } else {
      console.log('\n❌ Login failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

testLogin();
