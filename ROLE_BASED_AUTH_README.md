# PMS Role-Based Authentication System

This document explains how to set up and use the role-based authentication system for Department Heads and other roles in the Procurement Management System using your existing database schema.

## 🗃️ Database Setup

### 1. Your Schema is Already Set Up
Your existing `schema.sql` creates the complete database structure:

```sql
-- Your schema includes:
-- ✓ users table with email-based authentication
-- ✓ roles table with role definitions  
-- ✓ user_roles junction table for multiple roles per user
-- ✓ departments table for organizational structure
-- ✓ Complete procurement workflow tables
```

### 2. Add Sample Data
Execute the `sample-data.sql` file in your MySQL Workbench to add test users and roles.

### 2. Database Configuration
The system connects to your MySQL database with:
- **Host**: localhost
- **User**: root  
- **Password**: root
- **Database**: pms

### 3. Default Test Accounts
| Email | Password | Role | Department |
|-------|----------|------|------------|
| `depthead@pms.com` | `password123` | Department Head | Operations |
| `officer@pms.com` | `password123` | Procurement Officer | Procurement |
| `manager@pms.com` | `password123` | Procurement Manager | Procurement |
| `executive@pms.com` | `password123` | Executive Director | Executive |
| `finance@pms.com` | `password123` | Finance Officer | Finance |
| `supplier@example.com` | `password123` | Supplier | External |
| `admin@pms.com` | `password123` | Administrator | IT |

## 🔐 Authentication Features

### Role-Based Access Control
- **Department Head**: Only sees Department Head dashboard and functions
- **Multiple Roles**: Users can have multiple roles via `user_roles` junction table
- **Dynamic Navigation**: UI adapts based on user's assigned roles

### Automatic Role Detection
When a Department Head logs in:
1. System verifies email/password against `users` table
2. Fetches all user roles from `user_roles` and `roles` tables via JOIN
3. Automatically redirects based on primary role
4. Sidebar shows only relevant navigation items
5. Updates `last_login_at` timestamp

### Route Protection
- Protected routes prevent unauthorized access
- Users are redirected to appropriate dashboards based on their role
- Unauthorized access attempts show a friendly error page

## 🚀 How to Use

### 1. Start the Application
```bash
npm run dev
```

### 2. Login as Department Head
1. Go to `/auth/login` 
2. Use credentials: `depthead@pms.com` / `password123`
3. System automatically redirects to Department Head dashboard
4. Sidebar shows only Department Head sections:
   - Dashboard
   - Supplier Approvals  
   - Report Reviews

### 3. Test Other Roles
Login with different user accounts to see role-specific navigation and access control.

## 📁 System Architecture

### Frontend Components
- **AuthSlice** (`/src/store/authSlice.ts`) - Redux state management
- **AuthService** (`/src/services/authService.ts`) - API calls and authentication logic  
- **Sidebar** (`/src/components/Layouts/Sidebar.tsx`) - Role-based navigation rendering
- **ProtectedRoute** (`/src/components/ProtectedRoute.tsx`) - Route access control
- **DepartmentHeadRoute** (`/src/components/DepartmentHeadRoute.tsx`) - Specific Department Head protection

### Database Integration  
- **Database Config** (`/src/config/database.ts`) - MySQL connection to your PMS database
- **Schema Compatibility** - Works with your existing `users`, `roles`, `user_roles`, and `departments` tables
- **User Types** (`/src/types/auth.ts`) - TypeScript interfaces matching your schema structure

### Key Features
✅ **Email-Based Authentication** - Secure login using email addresses
✅ **Multiple Roles Support** - Users can have multiple roles simultaneously  
✅ **Department Integration** - Links users to their departments
✅ **Role-Based UI** - Dynamic sidebar based on user permissions  
✅ **Route Protection** - Prevent unauthorized page access  
✅ **Auto-Redirect** - Smart routing based on primary user role  
✅ **Login Tracking** - Records last login timestamps
✅ **Schema Compatibility** - Works with your existing database structure  

## 🔧 Customization

### Adding New Roles
1. Add role to database: `INSERT INTO roles (roleName, description) VALUES ('new_role', 'Description');`
2. Update `UserRole` enum in `/src/types/auth.ts`
3. Add role handling in login redirect logic
4. Update sidebar conditional rendering

### Modifying Department Head Access
Edit the `isDepartmentHead` condition in `Sidebar.tsx` to show/hide specific navigation items.

### Database Connection
Update connection settings in `/src/config/database.ts` if using different credentials.

## 🛡️ Security Features

- **Password Hashing**: All passwords stored with bcrypt
- **JWT Tokens**: Secure token-based authentication  
- **Route Guards**: Client-side route protection
- **Role Validation**: Server-side role verification
- **Auto-Logout**: Invalid tokens automatically log users out

## 🎯 Department Head Experience

When a Department Head logs in, they get a streamlined experience:

1. **Focused Dashboard** - Only Department Head relevant metrics
2. **Limited Navigation** - Only sections they can access:
   - Dashboard overview
   - Supplier approval workflows  
   - Report review functions
3. **Role-Appropriate Actions** - Functions specific to their approval authority
4. **Clean Interface** - No clutter from other system areas

This ensures Department Heads can efficiently focus on their core responsibilities without navigating unnecessary system complexity.

## 📞 Troubleshooting

**Login Issues**: Check database connection and user credentials  
**Role Access**: Verify user has correct role assigned in database  
**Navigation**: Ensure user role matches expected UserRole enum values  
**Database**: Confirm MySQL service is running and accessible

The system provides comprehensive role-based access control that automatically adapts the user interface and available functions based on the logged-in user's role, with special focus on providing Department Heads with a streamlined, focused experience.