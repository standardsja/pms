# Development Setup Guide

## Authentication System

The project includes a flexible authentication system that can work with either a real backend API or mock data for development.

### Environment Configuration

Create or update your `.env.local` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Mock Authentication (for development without backend)
VITE_USE_MOCK_AUTH=true
```

### Mock Authentication

When `VITE_USE_MOCK_AUTH=true`, the system uses predefined test accounts:

#### Available Test Accounts:

1. **Department Head**
   - Email: `depthead@pms.com`
   - Password: `password123`
   - Role: Department Head (Operations Department)

2. **Procurement Officer**
   - Email: `officer@pms.com`
   - Password: `password123`
   - Role: Procurement Officer (Procurement Department)

3. **Procurement Manager**
   - Email: `manager@pms.com`
   - Password: `password123`
   - Role: Procurement Manager (Procurement Department)

4. **Executive Director**
   - Email: `executive@pms.com`
   - Password: `password123`
   - Role: Executive Director (Executive Department)

5. **Finance Officer**
   - Email: `finance@pms.com`
   - Password: `password123`
   - Role: Finance (Finance Department)

### Role-Based Access Control

The system implements role-based navigation where users only see sections relevant to their role:

- **Department Head**: Department section with evaluations, reports, and approvals
- **Procurement Officer**: Request forms, RFQ management, supplier management
- **Procurement Manager**: Full procurement oversight, catalog management, evaluations
- **Executive Director**: Executive dashboard, high-level approvals, reports
- **Finance**: Payments, financial reports, budget management

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Login with Test Account**: Use any of the test accounts above

3. **Role Testing**: Switch between different test accounts to verify role-based access

4. **Backend Integration**: When your backend API is ready:
   - Set `VITE_USE_MOCK_AUTH=false`
   - Update `VITE_API_BASE_URL` to your API endpoint
   - Ensure your backend implements the required endpoints (see API Requirements below)

### API Requirements

When integrating with a real backend, ensure these endpoints are available:

#### Authentication Endpoints:

1. **POST /auth/login**
   ```json
   // Request
   {
     "email": "string",
     "password": "string"
   }
   
   // Response
   {
     "success": true,
     "user": {
       "id": number,
       "email": "string",
       "full_name": "string",
       "department_id": number,
       "department_name": "string",
       "status": "active" | "inactive",
       "roles": ["DEPARTMENT_HEAD" | "PROCUREMENT_OFFICER" | ...],
       "last_login_at": "date",
       "created_at": "date",
       "updated_at": "date"
     },
     "token": "string",
     "message": "string"
   }
   ```

2. **POST /auth/verify**
   ```json
   // Headers: Authorization: Bearer <token>
   
   // Response
   {
     "success": true,
     "user": { /* same user object as login */ },
     "message": "string"
   }
   ```

3. **POST /auth/logout**
   ```json
   // Headers: Authorization: Bearer <token>
   // No response body required
   ```

4. **POST /auth/refresh**
   ```json
   // Headers: Authorization: Bearer <token>
   
   // Response
   {
     "success": true,
     "user": { /* user object */ },
     "token": "string", // new token
     "message": "string"
   }
   ```

### Database Schema

The authentication system expects users to have roles through a many-to-many relationship:

```sql
-- Users table
users (
  id, email, password_hash, full_name, 
  department_id, status, last_login_at, 
  created_at, updated_at
)

-- Roles table  
roles (
  id, name, description, permissions, 
  created_at, updated_at
)

-- User-Role junction table
user_roles (
  id, user_id, role_id, assigned_at, assigned_by
)

-- Departments table
departments (
  id, name, description, head_id, 
  created_at, updated_at
)
```

### Troubleshooting

1. **Login Issues**: Check browser console for authentication errors
2. **Role Access**: Verify user has correct roles assigned in mock data or database
3. **API Errors**: Check network tab for failed API calls when using real backend
4. **Build Issues**: Ensure no server-side imports in client code

### Security Notes

- Mock authentication is for development only
- Use proper JWT validation and secure password hashing in production
- Implement proper CORS and security headers
- Use HTTPS in production environments