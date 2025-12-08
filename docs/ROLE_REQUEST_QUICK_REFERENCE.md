# Role Request Workflow - Quick Reference

## 🚀 Quick Start

### For Regular Users:

1. Go to Module Selector
2. Click "Procurement" button
3. Modal appears → Select role + (optional) department + (optional) reason
4. Click "Request Access"
5. ✅ Success! Status: PENDING (awaiting admin approval)

### For Admins:

1. Navigate to "Role Requests" admin panel
2. See dashboard with statistics
3. Click on pending request → "Review"
4. Choose: Approve (with optional expiry) OR Reject (with required notes)
5. ✅ Done! Request processed

---

## 📊 Supported Roles

| Role                | Description                             | Module      |
| ------------------- | --------------------------------------- | ----------- |
| PROCUREMENT_OFFICER | Review and process procurement requests | Procurement |
| PROCUREMENT_MANAGER | Oversee procurement processes           | Procurement |
| FINANCE_OFFICER     | Handle payment processing               | Procurement |
| DEPARTMENT_HEAD     | Approve department requests             | Procurement |

---

## 📁 Files at a Glance

### Backend

| File                                    | Lines | Purpose        |
| --------------------------------------- | ----- | -------------- |
| `server/services/roleRequestService.ts` | 350+  | Business logic |
| `server/routes/roleRequests.ts`         | 400+  | API endpoints  |
| `server/prisma/schema.prisma`           | +20   | Database model |

### Frontend

| File                                            | Lines | Purpose           |
| ----------------------------------------------- | ----- | ----------------- |
| `src/components/RoleSelectionModal.tsx`         | 300+  | User request form |
| `src/components/RoleRequestsAdminDashboard.tsx` | 500+  | Admin panel       |
| `src/services/roleRequestApi.ts`                | 200+  | API client        |

---

## 🔌 API Endpoints Cheat Sheet

```
POST /api/role-requests
  → Submit role request
  Body: { role, module, departmentId?, reason? }

GET /api/role-requests
  → List all requests (admin only)
  Query: ?status=PENDING&module=procurement

GET /api/role-requests/my-requests
  → Get user's own requests

GET /api/role-requests/stats/dashboard
  → Get dashboard statistics (admin only)

PUT /api/role-requests/:id/approve
  → Approve request (admin only)
  Body: { notes?, expiresAt? }

PUT /api/role-requests/:id/reject
  → Reject request (admin only)
  Body: { notes } ← Required

GET /api/role-requests/check-access/:role/:module
  → Check if user has approved access
```

---

## 🎯 Request Status Flow

```
Created Request
        ↓
    PENDING ← User awaiting admin review
        ↓
    ┌───┴────┐
    ↓        ↓
APPROVED   REJECTED ← Admin decision
    ↓
Role Granted via UserRole

User can also CANCEL while PENDING
```

---

## ✨ Key Features

✅ Simple role request form  
✅ Admin review dashboard  
✅ Auto-role granting on approval  
✅ Optional expiry dates  
✅ Rejection notes for audit trail  
✅ Duplicate request prevention  
✅ Statistics tracking  
✅ Innovation Hub direct access (no request)

---

## 🔒 Security

-   Auth required for all endpoints
-   Admin-only management endpoints
-   Owner-only for personal requests
-   Automatic role assignment
-   Expiry enforcement
-   Audit trail with timestamps

---

## 📊 Request Lifecycle

```
User Action                Admin Action              System Action
──────────────────────────────────────────────────────────────────
Fill form
Submit request    ──→     Request appears          Database saved
                         in pending tab

                         Review request
                         Approve ─────────→        Add UserRole
                                                  Status: APPROVED

                         -OR-

                         Reject + notes ─→        Status: REJECTED
                                                  Send notification
```

---

## 💡 Common Tasks

### Task: Check if User Has Access

```javascript
const hasAccess = await roleRequestService.hasApprovedAccess(userId, 'PROCUREMENT_OFFICER', 'procurement');
```

### Task: Get Pending Requests

```javascript
const requests = await roleRequestService.getPendingRoleRequests({
    status: 'PENDING',
    module: 'procurement',
});
```

### Task: Approve Request with Expiry

```javascript
await roleRequestService.approveRoleRequest(
    {
        roleRequestId: 123,
        approvedById: adminId,
        notes: 'Approved',
        expiresAt: new Date('2026-12-05'),
    },
    true // Grant role immediately
);
```

---

## 🐛 Troubleshooting

| Issue                                   | Solution                                         |
| --------------------------------------- | ------------------------------------------------ |
| User gets "Already has pending request" | Check for existing PENDING request in DB         |
| Role not granted after approval         | Check that role exists in Role table             |
| Admin can't see requests                | Verify admin has `admin:manage_roles` permission |
| Modal doesn't appear                    | Check that module is 'pms' (not 'ih')            |

---

## 📈 Monitoring

Check dashboard stats to see:

-   Number of pending requests
-   Number of approved requests
-   Number of rejected requests
-   Distribution by module
-   Distribution by role
-   Recent requests

---

## 🚀 Deployment Checklist

-   [ ] Run Prisma migration
-   [ ] Restart backend server
-   [ ] Test user role request flow
-   [ ] Test admin approval flow
-   [ ] Test admin rejection flow
-   [ ] Verify role granted after approval
-   [ ] Check dashboard loads correctly
-   [ ] Monitor logs for errors

---

## 📞 Need Help?

Refer to:

-   Full guide: `docs/ROLE_REQUEST_IMPLEMENTATION.md`
-   Implementation summary: `ROLE_REQUEST_SUMMARY.md`
-   Code comments in source files
-   API examples in documentation

---

**Status**: ✅ Production Ready

**Last Updated**: December 5, 2025

**Components**: 6 new + 3 modified
