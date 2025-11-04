-- PMS Database Schema
-- Run this SQL script in your MySQL Workbench to set up the database

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS pms;
USE pms;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    roleName VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(50),
    lastName VARCHAR(50),
    department VARCHAR(100),
    roleId INT,
    isActive BOOLEAN DEFAULT TRUE,
    lastLogin TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE SET NULL
);

-- Insert default roles
INSERT INTO roles (roleName, description, permissions) VALUES 
('admin', 'System Administrator', '["all"]'),
('Department Head', 'Department Head with approval authority', '["department_approvals", "view_reports", "manage_evaluations"]'),
('procurement_officer', 'Procurement Officer', '["create_rfq", "manage_suppliers", "process_orders"]'),
('procurement_manager', 'Procurement Manager', '["validate_evaluations", "approve_rfqs", "view_analytics"]'),
('supplier', 'Supplier/Vendor', '["submit_quotes", "view_orders", "update_profile"]'),
('executive_director', 'Executive Director', '["strategic_approvals", "view_all_reports", "digital_signoffs"]'),
('finance', 'Finance Department', '["process_payments", "financial_reports", "budget_management"]'),
('user', 'General User', '["create_requests", "view_status"]);

-- Insert sample users (passwords are hashed with bcrypt)
-- Default password for all sample users is "password123"
-- You should hash passwords properly in your application
INSERT INTO users (username, email, password, firstName, lastName, department, roleId, isActive) VALUES 
('admin', 'admin@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Admin', 'IT', 1, TRUE),
('dept_head', 'depthead@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Smith', 'Operations', 2, TRUE),
('proc_officer', 'officer@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Doe', 'Procurement', 3, TRUE),
('proc_manager', 'manager@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Johnson', 'Procurement', 4, TRUE),
('supplier1', 'supplier@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ABC', 'Supplies', 'External', 5, TRUE),
('exec_dir', 'executive@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Robert', 'Wilson', 'Executive', 6, TRUE),
('finance_user', 'finance@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Davis', 'Finance', 7, TRUE),
('regular_user', 'user@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tom', 'Brown', 'General', 8, TRUE);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(roleId);
CREATE INDEX idx_users_active ON users(isActive);

-- Display the created data
SELECT 
    u.id,
    u.username,
    u.email,
    u.firstName,
    u.lastName,
    u.department,
    r.roleName as role,
    u.isActive
FROM users u
LEFT JOIN roles r ON u.roleId = r.id
ORDER BY u.id;