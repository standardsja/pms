import { getLDAPService } from '../dist/services/ldapService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔐 LDAP Connection Test');
    console.log('═══════════════════════════════════════════════════════\n');

    // Display configuration (without password)
    console.log('Configuration:');
    console.log(`  LDAP URL: ${process.env.LDAP_URL || '(not set)'}`);
    console.log(`  Bind DN: ${process.env.LDAP_BIND_DN || '(not set)'}`);
    console.log(`  Search Base: ${process.env.LDAP_SEARCH_BASE || '(not set)'}`);
    console.log(`  Search Filter: ${process.env.LDAP_SEARCH_FILTER || '(not set)'}`);
    console.log('');

    // Check if all required environment variables are set
    const requiredEnvVars = ['LDAP_URL', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD', 'LDAP_SEARCH_BASE', 'LDAP_SEARCH_FILTER'];
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
        console.log('❌ Missing required environment variables:');
        missingVars.forEach((v) => console.log(`   - ${v}`));
        console.log('\n💡 Please add these to your .env file');
        console.log('   You can copy from .env.ldap.example\n');
        process.exit(1);
    }

    try {
        console.log('Testing LDAP connection...\n');
        const ldap = getLDAPService();

        const connected = await ldap.testConnection();

        if (connected) {
            console.log('✅ LDAP connection successful!');
            console.log('');
            console.log('Next steps:');
            console.log('  1. Test authentication with a real user:');
            console.log('     POST http://spinx-dev:4000/api/auth/ldap-login');
            console.log('     Body: { "email": "user@bos.local", "password": "..." }');
            console.log('');
            console.log('  2. Update frontend login form to add LDAP option');
            console.log('');
        } else {
            console.log('❌ LDAP connection failed');
            console.log('');
            console.log('Troubleshooting:');
            console.log('  1. Check if LDAP server is reachable:');
            console.log('     ping BOS.local');
            console.log('');
            console.log('  2. Test LDAP port:');
            console.log('     telnet BOS.local 389');
            console.log('');
            console.log('  3. Verify service account credentials in .env');
            console.log('');
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ Error during LDAP connection test:');
        console.log(`   ${error.message}`);
        console.log('');
        console.log('Error details:', error);
        console.log('');
        process.exit(1);
    }
}

testConnection().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
