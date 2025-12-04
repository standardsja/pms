// Debug script to check what's in localStorage/sessionStorage
console.log(`
📋 To debug authentication:

1. Open browser console
2. Run these commands:

   console.log('Auth Token:', localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'));
   console.log('User Profile:', JSON.parse(localStorage.getItem('userProfile') || '{}'));
   
3. Check the output to see:
   - If auth_token exists
   - If userProfile has an id
   - What roles the user has

If tokens are missing, you need to login again.
`);
