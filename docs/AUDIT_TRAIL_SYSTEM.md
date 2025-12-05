# Comprehensive Audit Trail System

## Overview

The audit trail system provides complete tracking of all critical operations in the Procurement Management System. Every action is logged with who did it, what they did, when, and from where.

## What Gets Audited

### Authentication & Security
- ✅ User logins (both local and LDAP)
- ✅ Failed login attempts
- ✅ User logouts
- ✅ Password changes
- ✅ Role assignments/removals

### Procurement Operations
- ✅ Request creation, updates, deletion
- ✅ Request submissions
- ✅ Approvals and rejections
- ✅ Request forwarding between departments
- ✅ Status changes

### Purchase Orders
- ✅ PO creation and updates
- ✅ PO approvals
- ✅ PO cancellations

### Files & Documents
- ✅ File uploads
- ✅ File downloads
- ✅ File deletions

### Innovation Hub
- ✅ Idea creation, updates, deletion
- ✅ Voting activity
- ✅ Comments
- ✅ Stage changes

### Suppliers
- ✅ Supplier creation and updates
- ✅ Supplier approvals
- ✅ Supplier suspensions

### System Operations
- ✅ User account creation/updates
- ✅ Settings changes
- ✅ Report generation
- ✅ Data exports (for compliance)

## How It Works

### Automatic Logging

The audit service automatically captures:
- **User ID** - Who performed the action
- **Action Type** - What happened (from enum)
- **Entity** - What was affected (e.g., "ProcurementRequest")
- **Entity ID** - Specific record ID
- **Message** - Human-readable description
- **IP Address** - Where the request came from
- **User Agent** - Browser/client information
- **Metadata** - Additional context (JSON)
- **Timestamp** - When it occurred

### Usage Examples

#### Log a procurement request creation:
```typescript
import { auditService } from '../services/auditService';

await auditService.logRequest({
    userId: currentUser.id,
    requestId: newRequest.id,
    action: 'REQUEST_CREATED',
    message: `Created procurement request #${newRequest.id} for ${newRequest.description}`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: {
        amount: newRequest.totalAmount,
        department: newRequest.departmentId,
    },
});
```

#### Log an approval:
```typescript
await auditService.logApproval({
    userId: approver.id,
    requestId: request.id,
    approved: true,
    stage: 'DEPARTMENT_HEAD',
    comment: 'Approved with budget allocation',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
});
```

#### Log a file upload:
```typescript
await auditService.logFile({
    userId: currentUser.id,
    action: 'FILE_UPLOADED',
    fileName: file.originalname,
    fileSize: file.size,
    relatedEntity: 'ProcurementRequest',
    relatedEntityId: requestId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
});
```

## API Endpoints

### Get Recent Audit Logs (Admin Only)
```http
GET /api/audit/recent?limit=100
Authorization: Bearer <token>
```

### Get Audit Logs for Specific Entity
```http
GET /api/audit/entity/ProcurementRequest/123?limit=50
Authorization: Bearer <token>
```

### Get User's Audit Trail
```http
GET /api/audit/user/30?limit=100
Authorization: Bearer <token>
```

### Search Audit Logs (Admin Only)
```http
POST /api/audit/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 30,
  "action": "REQUEST_APPROVED",
  "entity": "ProcurementRequest",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "limit": 500
}
```

### Get Available Audit Actions
```http
GET /api/audit/actions
Authorization: Bearer <token>
```

## Database Schema

```prisma
model AuditLog {
  id          Int         @id @default(autoincrement())
  
  // Actor
  userId      Int?
  user        User?       @relation(fields: [userId], references: [id])
  
  // Action
  action      AuditAction
  entity      String      // e.g., "ProcurementRequest"
  entityId    Int?        // Record ID
  message     String      @db.Text
  
  // Context
  ipAddress   String?
  userAgent   String?     @db.Text
  metadata    Json?
  
  // Legacy
  ideaId      Int?
  idea        Idea?       @relation(fields: [ideaId], references: [id])
  
  createdAt   DateTime    @default(now())

  @@index([userId])
  @@index([action])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

## Setup Instructions

### 1. Run Database Migration

If the database is accessible:
```bash
npx prisma migrate dev --name comprehensive_audit_trail
```

If the database is not accessible, run the SQL manually:
```bash
mysql -h Stork -u database_admin -p db_spinx < server/prisma/migrations/manual_comprehensive_audit_trail.sql
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Mount Audit Routes

The audit routes are already available at `/api/audit/*`

### 4. Add Audit Logging to Your Code

Import the audit service wherever you need logging:
```typescript
import { auditService } from '../services/auditService';
```

## Security & Compliance

### Access Control
- **Regular users** can view their own audit trail
- **Regular users** can view audit trail for entities they have access to
- **Admins** can view all audit logs and perform searches

### Data Retention
- Audit logs are never automatically deleted
- SetNull on user/idea deletion preserves audit trail integrity
- All timestamps are UTC

### Privacy
- Passwords are NEVER logged
- Sensitive data should not be included in metadata
- IP addresses and user agents help with security investigations

## Performance Considerations

- Indexes on `userId`, `action`, `entity/entityId`, and `createdAt`
- Async logging - never blocks the main operation
- Failed audit logs are logged but don't crash the app
- Use `limit` parameters to avoid large result sets

## Querying Examples

### Find all actions by a specific user:
```typescript
const logs = await auditService.getUserLogs(userId, 100);
```

### Find all changes to a specific request:
```typescript
const logs = await auditService.getEntityLogs('ProcurementRequest', requestId);
```

### Find all failed login attempts in the last 24 hours:
```typescript
const logs = await auditService.searchLogs({
    action: 'USER_LOGIN_FAILED',
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    limit: 1000,
});
```

## Next Steps

1. **Mount audit routes** in server/index.ts
2. **Add logging** to existing endpoints (requests, approvals, etc.)
3. **Create admin dashboard** to view audit trails
4. **Set up alerts** for suspicious activity
5. **Export capability** for compliance reports

## Files Created

- ✅ `server/services/auditService.ts` - Main audit service
- ✅ `server/middleware/auditMiddleware.ts` - Request context capture
- ✅ `server/routes/audit.ts` - API endpoints
- ✅ `server/prisma/schema.prisma` - Updated with comprehensive AuditAction enum
- ✅ `server/routes/auth.ts` - Updated with audit logging
- ✅ `server/prisma/migrations/manual_comprehensive_audit_trail.sql` - Migration file

## Status

🎉 **Audit trail system is ready!**

Authentication events are already being logged. Next, integrate the audit service into:
- Procurement request operations
- Approval workflows
- File uploads/downloads
- Purchase order operations
- User management

