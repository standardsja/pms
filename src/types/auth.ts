// User roles enum - matching your schema
export enum UserRole {
    ADMIN = 'Administrator',
    DEPARTMENT_HEAD = 'Department Head',
    PROCUREMENT_OFFICER = 'Procurement Officer',
    PROCUREMENT_MANAGER = 'Procurement Manager',
    SUPPLIER = 'Supplier',
    EXECUTIVE_DIRECTOR = 'Executive Director',
    FINANCE = 'Finance Officer',
    USER = 'User',
    INNOVATION_COMMITTEE = 'INNOVATION_COMMITTEE'
}

// User interface matching your schema
export interface User {
    id: number;
    email: string;
    full_name: string;
    department_id?: number;
    department_name?: string;
    status: 'active' | 'inactive' | 'locked';
    roles: UserRole[];
    last_login_at?: Date;
    created_at?: Date;
    updated_at?: Date;
}

// Department interface
export interface Department {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
}

// Role interface
export interface Role {
    id: number;
    name: string;
    description?: string;
}

// Auth response interface
export interface AuthResponse {
    success: boolean;
    user?: User;
    token?: string;
    message?: string;
}

// Login credentials interface
export interface LoginCredentials {
    email: string;
    password: string;
}