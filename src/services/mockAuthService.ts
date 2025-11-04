// Mock authentication service for development when backend is not available
import { User, UserRole, LoginCredentials, AuthResponse } from '../types/auth';

// Mock user database for development
const mockUsers: Record<string, { user: User; password: string }> = {
    'depthead@pms.com': {
        password: 'password123',
        user: {
            id: 1,
            email: 'depthead@pms.com',
            full_name: 'John Smith',
            department_id: 2,
            department_name: 'Operations',
            status: 'active',
            roles: [UserRole.DEPARTMENT_HEAD],
            last_login_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    'officer@pms.com': {
        password: 'password123',
        user: {
            id: 2,
            email: 'officer@pms.com',
            full_name: 'Jane Doe',
            department_id: 3,
            department_name: 'Procurement',
            status: 'active',
            roles: [UserRole.PROCUREMENT_OFFICER],
            last_login_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    'manager@pms.com': {
        password: 'password123',
        user: {
            id: 3,
            email: 'manager@pms.com',
            full_name: 'Mike Johnson',
            department_id: 3,
            department_name: 'Procurement',
            status: 'active',
            roles: [UserRole.PROCUREMENT_MANAGER],
            last_login_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    'executive@pms.com': {
        password: 'password123',
        user: {
            id: 4,
            email: 'executive@pms.com',
            full_name: 'Robert Wilson',
            department_id: 5,
            department_name: 'Executive',
            status: 'active',
            roles: [UserRole.EXECUTIVE_DIRECTOR],
            last_login_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    'finance@pms.com': {
        password: 'password123',
        user: {
            id: 5,
            email: 'finance@pms.com',
            full_name: 'Sarah Davis',
            department_id: 4,
            department_name: 'Finance',
            status: 'active',
            roles: [UserRole.FINANCE],
            last_login_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    }
};

class MockAuthService {
    private delay(ms: number = 500): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        await this.delay(); // Simulate network delay

        const { email, password } = credentials;
        const mockUser = mockUsers[email.toLowerCase()];

        if (!mockUser || mockUser.password !== password) {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // Update last login time
        mockUser.user.last_login_at = new Date();

        // Generate a mock token
        const token = `mock_token_${Date.now()}_${mockUser.user.id}`;

        return {
            success: true,
            user: mockUser.user,
            token: token,
            message: 'Login successful'
        };
    }

    async verifyToken(token: string): Promise<AuthResponse> {
        await this.delay(200);

        // Parse user ID from mock token
        const tokenParts = token.split('_');
        if (tokenParts.length !== 3 || tokenParts[0] !== 'mock' || tokenParts[1] !== 'token') {
            return {
                success: false,
                message: 'Invalid token'
            };
        }

        const userId = parseInt(tokenParts[2]);
        const user = Object.values(mockUsers).find(u => u.user.id === userId);

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        return {
            success: true,
            user: user.user,
            message: 'Token verified'
        };
    }

    async logout(): Promise<void> {
        await this.delay(200);
        localStorage.removeItem('token');
    }

    async refreshToken(): Promise<AuthResponse> {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            return {
                success: false,
                message: 'No token available'
            };
        }

        // Verify current token and issue new one
        const verifyResult = await this.verifyToken(currentToken);
        if (!verifyResult.success || !verifyResult.user) {
            return verifyResult;
        }

        const newToken = `mock_token_${Date.now()}_${verifyResult.user.id}`;
        
        return {
            success: true,
            user: verifyResult.user,
            token: newToken,
            message: 'Token refreshed'
        };
    }

    getAuthHeaders(): Record<string, string> {
        const token = localStorage.getItem('token');
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }

    isAuthenticated(): boolean {
        return !!localStorage.getItem('token');
    }
}

export default new MockAuthService();