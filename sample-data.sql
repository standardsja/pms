-- Sample data insertion for PMS database
-- This script inserts sample users and roles into your existing schema

USE pms;

-- Insert departments
INSERT INTO departments (name, code, is_active) VALUES 
('Information Technology', 'IT', 1),
('Operations', 'OPS', 1),
('Procurement', 'PROC', 1),
('Finance', 'FIN', 1),
('Executive', 'EXEC', 1),
('Human Resources', 'HR', 1);

-- Insert roles
INSERT INTO roles (name, description) VALUES 
('Administrator', 'System administrator with full access'),
('Department Head', 'Head of department with approval authority'),
('Procurement Officer', 'Officer responsible for procurement processes'),
('Procurement Manager', 'Manager overseeing procurement operations'),
('Supplier', 'External supplier/vendor'),
('Executive Director', 'Executive with strategic oversight'),
('Finance Officer', 'Finance department staff'),
('User', 'General system user');

-- Insert sample users
-- Note: All passwords are hashed version of "password123"
-- In production, use proper password hashing in your application
INSERT INTO users (email, password_hash, full_name, department_id, status) VALUES 
('admin@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 1, 'active'),
('depthead@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Smith', 2, 'active'),
('officer@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane Doe', 3, 'active'),
('manager@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike Johnson', 3, 'active'),
('supplier@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ABC Supplies Ltd', NULL, 'active'),
('executive@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Robert Wilson', 5, 'active'),
('finance@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Davis', 4, 'active'),
('user@pms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tom Brown', 6, 'active');

-- Assign roles to users (user_roles junction table)
INSERT INTO user_roles (user_id, role_id) VALUES 
-- Admin user (ID: 1) - Administrator role
(1, 1),
-- Department Head (ID: 2) - Department Head role
(2, 2),
-- Procurement Officer (ID: 3) - Procurement Officer role
(3, 3),
-- Procurement Manager (ID: 4) - Procurement Manager role
(4, 4),
-- Supplier (ID: 5) - Supplier role
(5, 5),
-- Executive Director (ID: 6) - Executive Director role
(6, 6),
-- Finance Officer (ID: 7) - Finance Officer role
(7, 7),
-- Regular User (ID: 8) - User role
(8, 8);

-- Insert some suppliers for testing
INSERT INTO suppliers (name, email, phone, address, status) VALUES 
('ABC Supplies Ltd', 'contact@abcsupplies.com', '+1-876-555-0100', '123 King Street, Kingston, Jamaica', 'active'),
('XYZ Trading Co', 'info@xyztrading.com', '+1-876-555-0200', '456 Spanish Town Road, Kingston, Jamaica', 'active'),
('Quality Parts Inc', 'sales@qualityparts.com', '+1-876-555-0300', '789 Constant Spring Road, Kingston, Jamaica', 'active');

-- Insert some categories for testing
INSERT INTO categories (name, parent_id) VALUES 
('Office Supplies', NULL),
('IT Equipment', NULL),
('Furniture', NULL),
('Stationery', 1),
('Paper Products', 1),
('Computers', 2),
('Networking Equipment', 2),
('Office Chairs', 3),
('Desks', 3);

-- Display created data for verification
SELECT 'Users and their roles:' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    d.name as department,
    GROUP_CONCAT(r.name) as roles,
    u.status
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id
ORDER BY u.id;

SELECT 'Test Login Credentials:' as info;
SELECT 
    'Email: ' as field, 
    u.email as value, 
    'Password: password123' as password,
    GROUP_CONCAT(r.name) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email IN ('depthead@pms.com', 'officer@pms.com', 'manager@pms.com', 'executive@pms.com')
GROUP BY u.id;