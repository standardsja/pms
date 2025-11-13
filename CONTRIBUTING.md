# Contributing to PMS

Thank you for your interest in contributing to the Procurement Management System!

## Development Setup

### Prerequisites

-   Node.js 18+ and npm
-   MySQL 8.0+
-   Git

### Getting Started

1. **Clone the repository**

    ```bash
    git clone https://github.com/standardsja/pms.git
    cd pms
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Setup environment**

    ```bash
    cp .env.example .env
    # Edit .env with your database credentials
    ```

4. **Setup database**

    ```bash
    # Run migrations
    npx prisma migrate deploy --schema=server/prisma/schema.prisma

    # Seed database
    npm run prisma:seed
    ```

5. **Start development servers**

    ```bash
    # Terminal 1: Start backend
    npm run server:dev

    # Terminal 2: Start frontend
    npm run dev
    ```

6. **Access the application**
    - Frontend: http://localhost:5173
    - Backend API: http://localhost:4000

## Project Structure

```
pms/
├── src/                    # Frontend React application
│   ├── pages/             # Page components (organized by module)
│   ├── components/        # Reusable UI components
│   ├── services/          # API service layer
│   ├── store/             # Redux state management
│   └── router/            # Route definitions
├── server/                # Backend Express API
│   ├── prisma/           # Database schema & migrations
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   └── index.ts          # Server entry point
├── docs/                  # Documentation
└── scripts/              # Utility scripts
```

## Coding Standards

### TypeScript

-   Use TypeScript strict mode
-   Define proper interfaces for all data structures
-   Avoid `any` type - use `unknown` if type is truly unknown

### React Components

-   Use functional components with hooks
-   Keep components focused and single-purpose
-   Extract reusable logic into custom hooks
-   Use proper prop types

### File Naming

-   Components: PascalCase (e.g., `UserProfile.tsx`)
-   Utilities: camelCase (e.g., `formatDate.ts`)
-   Constants: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

### Code Organization

-   Group related functionality in feature folders
-   Keep files under 300 lines when possible
-   Extract complex logic into separate files

## Git Workflow

### Branches

-   `main` - Production-ready code
-   `release/x.x.x-beta` - Release candidates
-   `feature/feature-name` - New features
-   `fix/bug-description` - Bug fixes
-   `refactor/what-changed` - Code refactoring

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]
[optional footer]
```

Types:

-   `feat`: New feature
-   `fix`: Bug fix
-   `docs`: Documentation changes
-   `style`: Code style changes (formatting)
-   `refactor`: Code refactoring
-   `test`: Adding/updating tests
-   `chore`: Maintenance tasks

Examples:

```
feat(innovation): add idea voting system
fix(procurement): resolve RFQ approval workflow
docs(readme): update installation instructions
refactor(auth): simplify login flow
```

### Pull Requests

1. **Create feature branch**

    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Make changes and commit**

    ```bash
    git add .
    git commit -m "feat(module): description"
    ```

3. **Push to remote**

    ```bash
    git push origin feature/your-feature-name
    ```

4. **Create Pull Request**

    - Provide clear description
    - Reference related issues
    - Add screenshots if UI changes
    - Request review from maintainers

5. **Address review feedback**
    - Make requested changes
    - Push additional commits
    - Re-request review when ready

## Database Changes

### Creating Migrations

```bash
# Create a new migration
npx prisma migrate dev --name descriptive_name --schema=server/prisma/schema.prisma

# Apply migrations
npx prisma migrate deploy --schema=server/prisma/schema.prisma
```

### Schema Guidelines

-   Always use migrations for schema changes
-   Never edit migration files directly
-   Test migrations on development database first
-   Document complex schema changes

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Run with coverage
npm test -- --coverage
```

### Writing Tests

-   Write tests for all new features
-   Test edge cases and error conditions
-   Use descriptive test names
-   Follow AAA pattern (Arrange, Act, Assert)

## Module Development

### Adding New Pages

1. Create component in appropriate module folder:

    ```
    src/pages/ModuleName/FeatureName.tsx
    ```

2. Add route in `src/router/routes.tsx`:

    ```tsx
    const FeatureName = lazy(() => import('../pages/ModuleName/FeatureName'));

    // In routes array:
    {
        path: '/module/feature',
        element: <FeatureName />,
    }
    ```

3. Update navigation menu if needed

### Adding API Endpoints

1. Add route handler in `server/index.ts`
2. Implement business logic in `server/services/`
3. Add proper error handling and validation
4. Document the endpoint

## Code Review Checklist

Before submitting:

-   [ ] Code follows project style guidelines
-   [ ] All tests pass
-   [ ] No console.log statements in production code
-   [ ] Error handling is comprehensive
-   [ ] Documentation is updated
-   [ ] Database migrations tested
-   [ ] UI is responsive (mobile/tablet/desktop)
-   [ ] Accessibility considerations addressed
-   [ ] No sensitive data exposed

## Getting Help

-   Check existing documentation in `/docs`
-   Review closed issues and PRs
-   Ask questions in pull request comments
-   Contact maintainers for guidance

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Version:** 2.0.0-beta  
**Last Updated:** November 13, 2025
