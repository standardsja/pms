# Backend Middleware Implementation Guide

## Overview
The backend now has comprehensive middleware for RBAC, validation, and error handling.

## 1. RBAC Middleware (`server/middleware/rbac.ts`)

### Usage Examples

```typescript
// Require specific role(s)
app.get('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  // Only ADMIN or ADMINISTRATOR can access
});

app.post('/api/ideas/:id/approve', authMiddleware, requireCommittee, async (req, res) => {
  // Only INNOVATION_COMMITTEE can access
});

// Custom role check
import { requireRole } from './middleware/rbac';
app.get('/protected', authMiddleware, requireRole('MANAGER', 'SUPERVISOR'), handler);

// Require ALL roles
import { requireAllRoles } from './middleware/rbac';
app.post('/special', authMiddleware, requireAllRoles('ADMIN', 'FINANCE'), handler);

// Owner or admin check
import { requireOwnerOrAdmin } from './middleware/rbac';
app.put('/api/ideas/:id', 
  authMiddleware, 
  requireOwnerOrAdmin(async (req) => {
    const idea = await prisma.idea.findUnique({ where: { id: parseInt(req.params.id) }});
    return idea?.submittedBy || 0;
  }),
  handler
);
```

### Pre-configured Role Guards
- `requireAdmin` - ADMIN, ADMINISTRATOR
- `requireCommittee` - INNOVATION_COMMITTEE
- `requireProcurement` - PROCUREMENT, PROCUREMENT_OFFICER, PROCUREMENT_MANAGER
- `requireFinance` - FINANCE, FINANCE_OFFICER
- `requireManager` - DEPT_MANAGER, PROCUREMENT_MANAGER, MANAGER
- `requireHOD` - HEAD_OF_DIVISION, DEPARTMENT_HEAD
- `requireExecutive` - EXECUTIVE_DIRECTOR

## 2. Validation Middleware (`server/middleware/validation.ts`)

### Usage Examples

```typescript
import { validate, createIdeaSchema, voteSchema } from './middleware/validation';

// Validate request body
app.post('/api/ideas', 
  authMiddleware, 
  validate(createIdeaSchema), 
  async (req, res) => {
    // Request body is validated and type-safe
    const { title, description, category } = req.body;
    // ...
  }
);

app.post('/api/ideas/:id/vote',
  authMiddleware,
  validate(voteSchema),
  async (req, res) => {
    const { voteType } = req.body; // Guaranteed to be 'UPVOTE' | 'DOWNVOTE'
    // ...
  }
);
```

### Available Schemas
- `createIdeaSchema` - Validate idea creation
- `updateIdeaSchema` - Validate idea updates
- `voteSchema` - Validate vote requests
- `approveRejectIdeaSchema` - Validate approval/rejection with notes
- `promoteIdeaSchema` - Validate idea promotion to project
- `ideaCommentSchema` - Validate comments
- `createRequestSchema` - Validate procurement request creation
- `requestActionSchema` - Validate request approval/rejection

### Input Sanitization

```typescript
import { sanitizeInput } from './middleware/validation';

// Apply globally in app setup
app.use(sanitizeInput);

// Or per-route
app.post('/api/endpoint', sanitizeInput, handler);
```

## 3. Error Handling (`server/middleware/errorHandler.ts`)

### Standard Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable message",
  "statusCode": 400,
  "timestamp": "2025-11-13T10:30:00.000Z",
  "path": "/api/ideas",
  "details": {}
}
```

### Using Custom Error Classes

```typescript
import { 
  BadRequestError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError,
  ConflictError,
  ValidationError
} from './middleware/errorHandler';

app.get('/api/ideas/:id', authMiddleware, async (req, res, next) => {
  const idea = await prisma.idea.findUnique({ where: { id: parseInt(req.params.id) }});
  
  if (!idea) {
    throw new NotFoundError('Idea not found');
  }
  
  if (idea.status === 'DRAFT' && idea.submittedBy !== req.user.sub) {
    throw new ForbiddenError('You can only view your own draft ideas');
  }
  
  res.json(idea);
});
```

### Async Handler Wrapper

```typescript
import { asyncHandler } from './middleware/errorHandler';

// Automatically catches errors and passes to error handler
app.get('/api/ideas', authMiddleware, asyncHandler(async (req, res) => {
  const ideas = await prisma.idea.findMany();
  res.json(ideas);
}));
```

### Error Handler Setup

```typescript
// Add at the END of all routes in server/index.ts
app.use(notFoundHandler);  // Catch 404s
app.use(errorHandler);      // Catch all errors
```

## 4. Complete Example

```typescript
import { asyncHandler } from './middleware/errorHandler';
import { requireCommittee } from './middleware/rbac';
import { validate, promoteIdeaSchema } from './middleware/validation';

app.post('/api/ideas/:id/promote',
  authMiddleware,           // 1. Authenticate
  requireCommittee,          // 2. Check role
  validate(promoteIdeaSchema), // 3. Validate input
  asyncHandler(async (req, res) => { // 4. Handle with auto error catching
    const { id } = req.params;
    const { projectCode } = req.body;
    
    const idea = await prisma.idea.findUnique({ where: { id: parseInt(id) }});
    if (!idea) throw new NotFoundError('Idea not found');
    if (idea.status !== 'APPROVED') {
      throw new BadRequestError('Only approved ideas can be promoted');
    }
    
    const updated = await prisma.idea.update({
      where: { id: idea.id },
      data: {
        status: 'PROMOTED_TO_PROJECT',
        projectCode: projectCode || generateProjectCode(),
        promotedAt: new Date()
      }
    });
    
    res.json(updated);
  })
);
```

## 5. Migration Checklist

To update existing routes:

1. ✅ Import middleware modules
2. ✅ Add `authMiddleware` if not present
3. ✅ Add role guards where appropriate
4. ✅ Add validation schemas for POST/PUT/PATCH
5. ✅ Wrap handlers with `asyncHandler`
6. ✅ Replace manual error responses with custom error classes
7. ✅ Add error handlers at end of route definitions
8. ✅ Test with invalid inputs and unauthorized access

## 6. Next Steps

- [ ] Apply validation to all POST/PUT/PATCH endpoints
- [ ] Add role guards to sensitive routes
- [ ] Migrate manual error handling to custom error classes
- [ ] Add integration tests for middleware
- [ ] Document API with OpenAPI/Swagger
- [ ] Add rate limiting middleware
- [ ] Add request logging/audit trail
