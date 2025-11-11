import mysql from 'mysql2/promise';

async function addProfileColumns() {
  const connection = await mysql.createConnection({
    host: 'Stork',
    port: 3306,
    user: 'database_admin',
    password: '03un5gZ1QBls',
    database: 'db_spinx'
  });

  try {
    console.log('Adding profile columns to User table...');
    
    await connection.query(`
      ALTER TABLE User 
      ADD COLUMN profilePicture VARCHAR(191) NULL,
      ADD COLUMN phoneNumber VARCHAR(191) NULL,
      ADD COLUMN location VARCHAR(191) NULL,
      ADD COLUMN joinedAt DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)
    `);
    
    console.log('✅ Profile columns added successfully');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Profile columns already exist');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await connection.end();
  }
}

addProfileColumns();
