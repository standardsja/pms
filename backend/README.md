# PMS Backend API

## Overview
This is the backend API server for the Procurement Management System. It connects to your MySQL database and provides authentication endpoints for the frontend application.

## Database Connection
The server connects to your MySQL database with these settings:
- **Host**: localhost
- **Port**: 3306
- **Database**: pms
- **User**: root
- **Password**: root

## Available Endpoints

### Authentication
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/verify` - Verify JWT token
- **POST** `/api/auth/refresh` - Refresh JWT token  
- **POST** `/api/auth/logout` - User logout

### Health Check
- **GET** `/api/health` - Server health status

## Running the Server

### Option 1: Command Line
```bash
cd backend
node server.js
```

### Option 2: Using the Batch File
Double-click `start-server.bat` in the backend folder.

### Option 3: Development Mode (with auto-restart)
```bash
cd backend
npm run dev  # If you install nodemon
```

## Test Accounts
Your database includes these test accounts (password: "password123" for all):

| Email | Role | Department |
|-------|------|------------|
| depthead@pms.com | Department Head | Operations |
| officer@pms.com | Procurement Officer | Procurement |
| manager@pms.com | Procurement Manager | Procurement |
| executive@pms.com | Executive Director | Executive |
| finance@pms.com | Finance | Finance |
| admin@pms.com | Admin | IT |

## Configuration
Environment variables are in `.env`:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 3306)
- `DB_USER` - Database username (default: root)
- `DB_PASSWORD` - Database password (default: root)
- `DB_NAME` - Database name (default: pms)
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 3001)

## Frontend Integration
The frontend is configured to call this API at `http://localhost:3001/api`.
Make sure this backend server is running before using the frontend application.

## Security Notes
- JWT tokens expire in 24 hours
- All passwords in the database should be properly hashed with bcrypt
- Change the JWT_SECRET in production
- Use HTTPS in production environments