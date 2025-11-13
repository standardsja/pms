// Quick database connection test
import mysql from 'mysql2/promise';

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'Stork',
      port: 3306,
      user: 'database_admin',
      password: '03un5gZ1QBls',
      database: 'db_spinx'
    });
    
    console.log('✅ Connected successfully!');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query executed:', rows);
    
    await connection.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
  }
}

testConnection();
