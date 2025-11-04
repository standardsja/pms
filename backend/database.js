import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'pms',
    charset: 'utf8mb4',
    timezone: '+00:00'
};

// Create connection pool for better performance
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
export async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Get user by email with role information
export async function getUserByEmail(email) {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.password,
                u.firstName,
                u.lastName,
                u.department,
                u.isActive,
                u.lastLogin,
                u.createdAt,
                u.updatedAt,
                r.id as roleId,
                r.roleName,
                r.description as roleDescription,
                r.permissions
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.id
            WHERE u.email = ? AND u.isActive = TRUE
        `, [email]);

        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching user by email:', error);
        throw error;
    }
}

// Get user by ID with role information
export async function getUserById(userId) {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.firstName,
                u.lastName,
                u.department,
                u.isActive,
                u.lastLogin,
                u.createdAt,
                u.updatedAt,
                r.id as roleId,
                r.roleName,
                r.description as roleDescription,
                r.permissions
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.id
            WHERE u.id = ? AND u.isActive = TRUE
        `, [userId]);

        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        throw error;
    }
}

// Update user last login timestamp
export async function updateLastLogin(userId) {
    try {
        await pool.execute(`
            UPDATE users 
            SET lastLogin = NOW(), updatedAt = NOW()
            WHERE id = ?
        `, [userId]);
    } catch (error) {
        console.error('Error updating last login:', error);
        throw error;
    }
}

// Get all roles (for reference)
export async function getAllRoles() {
    try {
        const [rows] = await pool.execute(`
            SELECT id, roleName, description, permissions
            FROM roles
            ORDER BY roleName
        `);
        return rows;
    } catch (error) {
        console.error('Error fetching roles:', error);
        throw error;
    }
}

export default pool;