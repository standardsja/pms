# Procurement Management System (PMS) - Production Ready

A comprehensive procurement management system with an integrated Innovation Hub, designed for government organizations. Built with modern technologies and production-ready architecture.

## 🏛️ About Bureau of Standards Jamaica (BSJ)

This system is developed for the Bureau of Standards Jamaica, the national standards body responsible for promoting and maintaining standards to enhance competitiveness and quality of life in Jamaica.

## 🚀 Features

### Procurement Management

-   ✅ **Request Management**: Create, track, and manage procurement requests
-   ✅ **Approval Workflows**: Multi-level approval process (Department → HOD → Procurement → Finance)
-   ✅ **Role-Based Access**: Department managers, procurement officers, finance teams
-   ✅ **Document Management**: File uploads and attachment handling
-   ✅ **Audit Trail**: Complete history of all actions and changes
-   ✅ **Budget Tracking**: Cost estimation and budget code management

### Innovation Hub

-   ✅ **Idea Submission**: Anonymous and named idea submissions
-   ✅ **Committee Review**: Innovation committee approval workflows
-   ✅ **Voting System**: Public voting on approved ideas
-   ✅ **Project Promotion**: Convert ideas to official projects
-   ✅ **Analytics Dashboard**: Comprehensive insights and metrics
-   ✅ **Search & Filtering**: Advanced idea discovery and categorization

### Technical Features

-   🔒 **Security**: JWT authentication, input validation, SQL injection prevention
-   📊 **Analytics**: Real-time dashboards with KPIs and trends
-   🚀 **Performance**: Redis caching, optimized queries, CDN-ready
-   📱 **Responsive**: Mobile-first design with modern UI
-   🔄 **Real-time**: WebSocket integration for live updates
-   📧 **Notifications**: Email alerts and in-app notifications
-   🌐 **Multi-language**: i18n support for international deployment

## 🛠️ Technology Stack

### Frontend

-   **React 18** with TypeScript
-   **Vite** for fast development and building
-   **Tailwind CSS** for styling
-   **Zustand** for state management
-   **React Query** for data fetching
-   **React Router** for navigation
-   **i18next** for internationalization

### Backend

-   **Node.js** with TypeScript
-   **Express.js** web framework
-   **Prisma ORM** with MySQL
-   **JWT** authentication
-   **Redis** for caching
-   **WebSocket** for real-time features
-   **Winston** for logging

### Infrastructure

-   **MySQL 8.0+** database
-   **Redis 6.0+** cache layer
-   **PM2** process management
-   **Nginx** reverse proxy
-   **Let's Encrypt** SSL certificates

## 📦 Installation & Setup

### Prerequisites

-   Node.js 18+ LTS
-   MySQL 8.0+
-   Redis 6.0+ (optional but recommended)
-   Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/standardsja/pms.git
cd pms

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma migrate dev
npx prisma db seed

# Start development servers
npm run dev          # Frontend (port 5173)
npm run server:dev   # Backend (port 4000)
```

### Production Deployment

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed deployment instructions.

## 🏗️ Architecture

### Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── store/             # State management
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript definitions
├── server/                # Backend API server
│   ├── routes/            # API route handlers
│   ├── middleware/        # Custom middleware
│   ├── services/          # Business logic services
│   ├── config/            # Configuration files
│   └── prisma/            # Database schema & migrations
├── docs/                  # Documentation
└── scripts/               # Utility scripts
```

### Database Schema

The system uses a comprehensive database schema with the following main entities:

-   **Users & Roles**: Authentication and authorization
-   **Departments**: Organizational structure
-   **Requests**: Procurement requests and workflows
-   **Ideas**: Innovation hub submissions
-   **Votes & Comments**: User engagement features

### API Endpoints

#### Authentication

-   `POST /api/auth/login` - User authentication
-   `GET /api/auth/me` - Get current user profile

#### Ideas (Innovation Hub)

-   `GET /api/ideas` - List ideas with filtering
-   `POST /api/ideas` - Create new idea
-   `GET /api/ideas/:id` - Get idea details
-   `POST /api/ideas/:id/vote` - Vote on idea
-   `POST /api/ideas/:id/approve` - Committee approval
-   `POST /api/ideas/:id/promote` - Promote to project

#### Requests (Procurement)

-   `GET /api/requests` - List procurement requests
-   `POST /api/requests` - Create new request
-   `GET /api/requests/:id` - Get request details
-   `PUT /api/requests/:id` - Update request
-   `POST /api/requests/:id/submit` - Submit for approval

## 🔧 Configuration

### Environment Variables

```env
# Application
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Database
DATABASE_URL=mysql://user:pass@localhost:3306/pms

# Security
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://your-domain.com

# Cache
REDIS_URL=redis://localhost:6379

# Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### Feature Flags

The system supports feature flags for gradual rollout:

-   `ENABLE_INNOVATION_HUB`: Enable/disable innovation features
-   `ENABLE_ADVANCED_ANALYTICS`: Enable advanced reporting
-   `ENABLE_EMAIL_NOTIFICATIONS`: Enable email notifications

## 📊 Monitoring & Analytics

### Health Checks

-   `GET /health` - Application health status
-   Database connectivity monitoring
-   Cache layer status
-   Memory and CPU usage

### Logging

-   Structured JSON logging in production
-   Different log levels (error, warn, info, debug)
-   Request/response logging
-   Performance metrics

### Metrics

-   API response times
-   Database query performance
-   Cache hit/miss rates
-   User engagement metrics
-   System resource usage

## 🔒 Security

### Authentication & Authorization

-   JWT-based authentication
-   Role-based access control (RBAC)
-   Session management
-   Password hashing with bcrypt

### Data Protection

-   Input validation and sanitization
-   SQL injection prevention (Prisma ORM)
-   XSS protection
-   CSRF protection
-   File upload restrictions

### Infrastructure Security

-   HTTPS encryption
-   Security headers
-   Rate limiting
-   CORS configuration
-   Environment variable security

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test Strategy

-   Unit tests for utilities and services
-   Integration tests for API endpoints
-   Component tests for React components
-   E2E tests for critical user workflows

## 🚀 Performance

### Optimization Features

-   Redis caching for frequently accessed data
-   Database query optimization
-   Image optimization and lazy loading
-   Bundle splitting and code splitting
-   Gzip compression
-   CDN support for static assets

### Monitoring

-   Application performance monitoring (APM)
-   Database performance tracking
-   Real user monitoring (RUM)
-   Error tracking and alerting

## 📖 Documentation

-   [API Documentation](./docs/API.md)
-   [Database Schema](./docs/DATABASE.md)
-   [Frontend Architecture](./docs/FRONTEND.md)
-   [Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
-   [Contributing Guidelines](./CONTRIBUTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

-   Follow TypeScript best practices
-   Write tests for new features
-   Follow the existing code style
-   Update documentation as needed
-   Use semantic commit messages

## 📄 License

This project is proprietary software developed for the Bureau of Standards Jamaica. All rights reserved.

## 🆘 Support

### Getting Help

-   📧 Email: [support@bsj.gov.jm](mailto:support@bsj.gov.jm)
-   📞 Phone: +1 (876) 926-3140
-   🌐 Website: [https://www.bsj.gov.jm](https://www.bsj.gov.jm)

### Reporting Issues

When reporting issues, please include:

-   System environment (OS, browser, Node.js version)
-   Steps to reproduce the issue
-   Expected vs actual behavior
-   Error messages or logs
-   Screenshots (if applicable)

## 🏆 Acknowledgments

-   Bureau of Standards Jamaica team
-   Open source community
-   All contributors and stakeholders

---

**Built with ❤️ for the Bureau of Standards Jamaica**

_Enhancing Jamaica's competitiveness through innovative procurement and idea management solutions._
