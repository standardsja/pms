import fetch from 'node-fetch';

async function checkProcurementManagerRole() {
    try {
        const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'proc.manager@bsj.gov.jm',
                password: 'Passw0rd!'
            })
        });

        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Procurement Manager login data:', loginData);
        } else {
            console.log('Procurement manager login failed');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkProcurementManagerRole();