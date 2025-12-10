import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000';

async function listRoutes() {
    try {
        const response = await fetch(`${API_BASE}/api/_routes`);
        const data = await response.json();
        const routes = data.routes || data || [];

        console.log('Full response:', JSON.stringify(routes, null, 2).slice(0, 500));
        const meRoutes = routes.filter((r: any) => r.path && r.path.includes('/me'));

        console.log('Routes containing /me:');
        meRoutes.forEach((r: any) => {
            console.log(`  ${r.path} - ${r.methods.join(', ')}`);
        });

        // Also show auth routes
        const authRoutes = routes.filter((r: any) => r.path && r.path.includes('/auth'));
        console.log('\n/auth routes:');
        authRoutes.slice(0, 10).forEach((r: any) => {
            console.log(`  ${r.path} - ${r.methods.join(', ')}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

listRoutes();
