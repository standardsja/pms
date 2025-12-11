import fetch from 'node-fetch';

const LOGIN_HOSTS = ['http://sphinx-dev:4000', 'http://heron:4000'];

async function tryLoginAt(host) {
    const url = `${host}/api/auth/login`;
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'proc.manager@bsj.gov.jm', password: 'Passw0rd!' }),
            timeout: 5000,
        });

        if (resp.ok) {
            const data = await resp.json();
            console.log(`Login succeeded at ${host}:`, data);
            return true;
        }

        console.log(`Login failed at ${host} (status ${resp.status})`);
        return false;
    } catch (err) {
        console.log(`Error contacting ${host}: ${err.message}`);
        return false;
    }
}

async function checkProcurementManagerRole() {
    for (const host of LOGIN_HOSTS) {
        const ok = await tryLoginAt(host);
        if (ok) return;
    }
    console.log('Procurement manager login failed on all hosts');
}

checkProcurementManagerRole();
