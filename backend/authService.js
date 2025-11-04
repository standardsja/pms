import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail, getUserById, updateLastLogin } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Role name mapping to match frontend expectations
const roleMapping = {
    'Department Head': 'DEPARTMENT_HEAD',
    'procurement_officer': 'PROCUREMENT_OFFICER',
    'procurement_manager': 'PROCUREMENT_MANAGER',
    'supplier': 'SUPPLIER',
    'executive_director': 'EXECUTIVE_DIRECTOR',
    'finance': 'FINANCE',
    'admin': 'ADMIN',
    'user': 'USER'
};

// Transform database user to frontend format
function transformUser(dbUser) {
    if (!dbUser) return null;

    const role = roleMapping[dbUser.roleName] || dbUser.roleName.toUpperCase();
    
    return {
        id: dbUser.id,
        email: dbUser.email,
        full_name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
        department_id: null, // Your schema doesn't have department_id as number
        department_name: dbUser.department,
        status: dbUser.isActive ? 'active' : 'inactive',
        roles: [role], // Single role as array for compatibility
        last_login_at: dbUser.lastLogin,
        created_at: dbUser.createdAt,
        updated_at: dbUser.updatedAt,
        username: dbUser.username,
        role_permissions: dbUser.permissions ? JSON.parse(dbUser.permissions) : []
    };
}

// Login user
export async function loginUser(email, password) {
    try {
        // Get user from database
        const dbUser = await getUserByEmail(email);
        
        if (!dbUser) {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, dbUser.password);
        
        if (!isPasswordValid) {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // Check if user is active
        if (!dbUser.isActive) {
            return {
                success: false,
                message: 'Account is inactive. Please contact administrator.'
            };
        }

        // Update last login timestamp
        await updateLastLogin(dbUser.id);

        // Transform user for frontend
        const user = transformUser(dbUser);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                role: user.roles[0] 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            success: true,
            user: user,
            token: token,
            message: 'Login successful'
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: 'An error occurred during login. Please try again.'
        };
    }
}

// Verify JWT token
export async function verifyToken(token) {
    try {
        // Verify and decode token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get fresh user data from database
        const dbUser = await getUserById(decoded.userId);
        
        if (!dbUser) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        if (!dbUser.isActive) {
            return {
                success: false,
                message: 'Account is inactive'
            };
        }

        // Transform user for frontend
        const user = transformUser(dbUser);

        return {
            success: true,
            user: user,
            message: 'Token verified successfully'
        };

    } catch (error) {
        console.error('Token verification error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return {
                success: false,
                message: 'Token has expired'
            };
        } else if (error.name === 'JsonWebTokenError') {
            return {
                success: false,
                message: 'Invalid token'
            };
        }
        
        return {
            success: false,
            message: 'Token verification failed'
        };
    }
}

// Refresh token
export async function refreshToken(token) {
    try {
        // Verify current token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get fresh user data
        const dbUser = await getUserById(decoded.userId);
        
        if (!dbUser || !dbUser.isActive) {
            return {
                success: false,
                message: 'Unable to refresh token'
            };
        }

        // Generate new token
        const user = transformUser(dbUser);
        const newToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                role: user.roles[0]
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            success: true,
            user: user,
            token: newToken,
            message: 'Token refreshed successfully'
        };

    } catch (error) {
        console.error('Token refresh error:', error);
        return {
            success: false,
            message: 'Token refresh failed'
        };
    }
}