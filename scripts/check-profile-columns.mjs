import mysql from 'mysql2/promise';

async function checkColumns() {
  const connection = await mysql.createConnection({
    host: 'Stork',
    port: 3306,
    user: 'database_admin',
    password: '03un5gZ1QBls',
    database: 'db_spinx'
  });

  try {
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'db_spinx' 
        AND TABLE_NAME = 'User'
        AND COLUMN_NAME IN ('profilePicture', 'phoneNumber', 'location', 'joinedAt')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('\n✅ Profile Columns in User Table:');
    console.log('=================================\n');
    
    if (columns.length === 0) {
      console.log('❌ No profile columns found');
    } else {
      columns.forEach(col => {
        console.log(`Column: ${col.COLUMN_NAME}`);
        console.log(`  Type: ${col.DATA_TYPE}`);
        console.log(`  Nullable: ${col.IS_NULLABLE}`);
        console.log(`  Default: ${col.COLUMN_DEFAULT || 'None'}`);
        console.log('');
      });
      console.log(`Total profile columns: ${columns.length}/4`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkColumns();
