# 🌀 SPINX - PMS

### _Procurement Management System with Innovation Hub_

[![Version](https://img.shields.io/badge/version-2.0.0--beta-blue.svg)](https://github.com/standardsja/pms)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

> **Status:** Beta Release — Current version `2.0.0-beta`

---

## 📘 Overview

**SPINX - Procurement Management System (PMS)** is a comprehensive digital solution that automates and tracks all stages of the procurement lifecycle — from **acquisition requests** to **payment processing** — while fostering **innovation** through an integrated Innovation Hub.

This dual-module system ensures **transparency**, **accountability**, and **compliance** with internal and regulatory procedures, while simultaneously encouraging employee innovation and continuous improvement.

### Modules

#### 🛒 Procurement Module

Complete procurement lifecycle management with role-based dashboards for:

-   Procurement Officers & Managers
-   Department Heads
-   Executive Directors
-   Finance Department
-   Suppliers

#### 💡 Innovation Hub

Employee-driven innovation platform featuring:

-   Idea submission and collaboration
-   Voting and popularity tracking
-   Committee review and approval
-   Project tracking and analytics

---

## ✨ Key Features

### Procurement Management

-   ✅ **Streamlined Workflows** - Automated procurement lifecycle
-   ✅ **Real-Time Tracking** - Live visibility into approvals and budgets
-   ✅ **Standardized Processes** - Uniform RFQ, evaluation & approval procedures
-   ✅ **Digital Signatures** - Secure executive approvals
-   ✅ **Auditable Trail** - Complete history for compliance
-   ✅ **Supplier Management** - Centralized supplier database and portal
-   ✅ **Financial Integration** - Direct finance department workflow

### Innovation Hub

-   💡 **Idea Submission** - Easy-to-use idea submission interface
-   🗳️ **Voting System** - Community-driven idea prioritization
-   📊 **Analytics Dashboard** - Track innovation metrics
-   👥 **Committee Review** - Structured approval workflow
-   🏆 **Leaderboard** - Recognize top contributors
-   🚀 **Project Promotion** - Convert approved ideas to projects

---

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+ and npm
-   MySQL 8.0+
-   Git

### Installation

```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **Health Check:** http://localhost:4000/health

### Default Login Credentials

Development environment includes test users:
- **Admin:** `admin@bsj.gov.jm` / `password`
- **Department Head:** Contact admin for credentials
- **Procurement Officer:** Contact admin for credentials

---

## 📁 Project Structure

```

pms/
├── src/ # Frontend React application
│ ├── pages/ # Page components
│ │ ├── Innovation/ # Innovation Hub pages
│ │ ├── Procurement/ # Procurement module pages
│ │ └── \_unused-template-files/ # Archived demos
│ ├── components/ # Reusable UI components
│ ├── services/ # API service layer
│ ├── store/ # Redux state management
│ ├── router/ # Route definitions
│ └── utils/ # Utility functions
├── server/ # Backend Express API
│ ├── prisma/ # Database schema & migrations
│ ├── services/ # Business logic
│ ├── middleware/ # Authentication & validation
│ ├── config/ # Server configuration
│ └── index.ts # Server entry point
├── docs/ # Documentation
├── scripts/ # Utility scripts
└── public/ # Static assets

````

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for detailed structure.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Utility-first CSS
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **ApexCharts** - Data visualization

### Backend
- **Node.js & Express** - Server framework
- **TypeScript** - Type safety
- **Prisma** - ORM & database migrations
- **MySQL** - Relational database
- **JWT** - Authentication
- **WebSockets** - Real-time updates
- **Redis** - Caching (optional)

---

## 📚 Documentation

- **[Quick Start Guide](docs/QUICK_START.md)** - Get started quickly
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute
- **[Innovation Hub Docs](docs/INNOVATION_HUB_DOCS.md)** - Innovation module guide
- **[Procurement Officer Guide](docs/PROCUREMENT_OFFICER_DASHBOARD.md)** - Officer dashboard
- **[Production Deployment](docs/INNOVATION_HUB_PRODUCTION_READY.md)** - Deploy to production
- **[Testing Checklist](docs/TESTING_CHECKLIST.md)** - QA procedures
- **[File Structure](FILE_STRUCTURE.md)** - Project organization
- **[Changelog](CHANGELOG.md)** - Version history

---

## 🔧 Available Scripts

### Development
```bash
npm run dev              # Start frontend dev server (port 5173)
npm run server:dev       # Start backend dev server (port 4000)
````

### Database

```bash
npm run prisma:seed      # Seed database with sample data
npm run backfill:votes   # Recalculate vote counts
```

### Production

```bash
npm run build            # Build for production
npm run preview          # Preview production build
```

### Utilities

```bash
node scripts/create-fallback-users.mjs      # Create test users
node scripts/list-all-users.mjs             # List all users
npx tsx scripts/seedInnovation.ts           # Seed Innovation Hub
```

---

## 🎯 Roadmap

### Version 2.0.0 (Current Beta)

-   ✅ Innovation Hub module
-   ✅ Role-based procurement dashboards
-   ✅ Digital signature workflow
-   ✅ Real-time notifications
-   ✅ Advanced analytics

### Version 2.1.0 (Planned)

-   [ ] Mobile responsive improvements
-   [ ] Enhanced reporting engine
-   [ ] Email notifications
-   [ ] Advanced search filters
-   [ ] Bulk operations

### Version 2.2.0 (Future)

-   [ ] Mobile app (React Native)
-   [ ] Advanced AI-powered insights
-   [ ] Integration with external ERP systems
-   [ ] Multi-language support expansion

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Maintained by:** Bureau of Standards Jamaica (BSJ)

**Development Team:**

-   Project Lead: [Name]
-   Backend Development: [Name]
-   Frontend Development: [Name]
-   QA & Testing: [Name]

---

## 📞 Support

For questions, issues, or feedback:

-   **Issues:** [GitHub Issues](https://github.com/standardsja/pms/issues)
-   **Email:** support@bsj.gov.jm
-   **Documentation:** [docs/](docs/)

---

## 🙏 Acknowledgments

Built with:

-   [VRISTO React Admin Template](https://themeforest.net/item/vristo-reactjs-admin-template/44718458)
-   [Prisma ORM](https://www.prisma.io/)
-   [TailwindCSS](https://tailwindcss.com/)
-   [React](https://react.dev/)

---

**Last Updated:** November 13, 2025  
**Version:** 2.0.0-betabash

# 1. Clone the repository

git clone https://github.com/standardsja/pms.git
cd pms

# 2. Install dependencies

npm install

# 3. Setup environment

cp .env.example .env

# Edit .env with your database credentials

# 4. Setup database

npx prisma migrate deploy --schema=server/prisma/schema.prisma
npm run prisma:seed

# 5. Start development servers

# Terminal 1: Backend

npm run server:dev

# Terminal 2: Frontend (in new terminal)

npm run dev
