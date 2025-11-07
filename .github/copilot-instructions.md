# Procurement Management System Backend

This is a production-ready Node.js Express TypeScript backend API for a comprehensive procurement management system with role-based dashboards and digital signature workflows.

## Architecture
- **Framework**: Express.js with TypeScript and ES modules
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Security**: Helmet.js, CORS protection, input validation
- **Logging**: Winston with structured logging
- **File Handling**: Multer for document uploads

## Core Features
✅ User authentication and role-based access control
✅ Department Head and Executive Director role management  
✅ Comprehensive database schema for procurement workflows
✅ Digital signature and approval processes
✅ Document management and file uploads
✅ Audit logging and notification system
✅ Error handling and security middleware

## Development Guidelines
- Use TypeScript strict mode for type safety
- Follow RESTful API design patterns with consistent error responses
- Implement comprehensive error handling with structured logging
- Maintain security best practices for authentication and authorization
- Use environment variables for all configuration
- Include proper validation and sanitization for all inputs
- Follow the established project structure and naming conventions