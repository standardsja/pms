# Quick Database Setup Guide

## Step 1: Set Up Your Database
1. Open MySQL Workbench
2. Connect to your MySQL server (localhost with root/root credentials)
3. Execute your `schema.sql` file to create the complete database structure

## Step 2: Add Sample Data
1. Execute the `sample-data.sql` file to add test users and roles

## Step 3: Test the System
1. Start your application: `npm run dev`
2. Navigate to `/auth/login`
3. Test with Department Head credentials:
   - **Email**: `depthead@pms.com`
   - **Password**: `password123`

## Expected Result
- User will be authenticated
- Redirected to Department Head dashboard
- Sidebar will show only Department Head navigation items:
  - Dashboard
  - Supplier Approvals  
  - Report Reviews

## Database Structure Used
- `users` - User accounts with email authentication
- `roles` - Available system roles
- `user_roles` - Junction table for multiple roles per user  
- `departments` - Organizational departments
- Authentication uses email + password_hash fields
- Roles are fetched via JOIN queries on user_roles table

## Testing Other Roles
Try logging in with other test accounts:
- `officer@pms.com` - Procurement Officer
- `manager@pms.com` - Procurement Manager  
- `executive@pms.com` - Executive Director
- `finance@pms.com` - Finance Officer

Each role will see appropriate navigation sections based on their permissions.