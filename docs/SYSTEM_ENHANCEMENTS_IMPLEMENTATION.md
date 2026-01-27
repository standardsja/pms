# System Enhancements Implementation Plan

**Date:** January 26, 2026  
**Status:** Planning Complete - Ready for Implementation

## Overview

This document outlines the implementation plan for 12 major system enhancements to the Procurement Management System.

---

## ✅ COMPLETED FEATURES

### 1. Dual Role: Budget Manager as Chief Account Approver

**Status:** ✅ IMPLEMENTED

**Changes Made:**

- Modified [server/index.ts](../server/index.ts#L3613) to allow `BUDGET_MANAGER` role to approve during `FINANCE_REVIEW` stage
- Budget Managers can now approve as Chief Account and Budget Manager

**Technical Details:**

```typescript
FINANCE_REVIEW: ['FINANCE', 'CHIEF_ACCOUNTANT', 'BUDGET_MANAGER'];
```

**Testing:** Test with a user having `BUDGET_MANAGER` role approving a request in `FINANCE_REVIEW` status.

---

### 2. Evaluation Report Completion Date

**Status:** ✅ ALREADY EXISTS

**Implementation:** The `reportCompletionDate` field already exists in:

- Database: `Evaluation.reportCompletionDate` (DateTime nullable)
- Frontend: [src/pages/Procurement/Evaluation/NewEvaluation.tsx](../src/pages/Procurement/Evaluation/NewEvaluation.tsx#L915)
- Services: [src/services/evaluationService.ts](../src/services/evaluationService.ts#L122)

**UI Location:** Visible on evaluation form as "Report Completion Date" (done at end of evaluation)

---

## 🔄 FEATURES TO IMPLEMENT

### 3. Quote Upload Button for Procurement During Evaluation

**Priority:** HIGH  
**Estimated Effort:** 4-6 hours

#### Implementation Steps:

**A. Database Schema Addition**

```prisma
// Add to schema.prisma
model EvaluationAttachment {
  id           Int        @id @default(autoincrement())
  evaluationId Int
  fileName     String
  originalName String
  filePath     String
  fileSize     Int
  mimeType     String
  uploadedById Int
  uploadedAt   DateTime   @default(now())
  category     String?    // 'QUOTE', 'REPORT', 'SUPPORTING_DOC'

  evaluation   Evaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  uploadedBy   User       @relation(fields: [uploadedById], references: [id])

  @@index([evaluationId])
  @@index([uploadedById])
}

// Update Evaluation model
model Evaluation {
  // ... existing fields
  attachments  EvaluationAttachment[]
}
```

**B. Backend API Endpoints**

```typescript
// Add to server/index.ts

// POST /api/evaluations/:id/attachments
router.post(
  '/api/evaluations/:id/attachments',
  authMiddleware,
  requireRole(['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER']),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.sub;

    const attachment = await prisma.evaluationAttachment.create({
      data: {
        evaluationId: parseInt(id),
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedById: userId,
        category: req.body.category || 'QUOTE'
      }
    });

    res.json(attachment);
  })
);

// GET /api/evaluations/:id/attachments
router.get('/api/evaluations/:id/attachments', authMiddleware, asyncHandler(...));

// DELETE /api/evaluations/:id/attachments/:attachmentId
router.delete('/api/evaluations/:id/attachments/:attachmentId', authMiddleware, asyncHandler(...));
```

**C. Frontend Component**
Create `src/components/EvaluationAttachmentUpload.tsx`:

```tsx
// Upload component with drag-and-drop support
// Displays uploaded files with download/delete options
// Category selector: Quote, Report, Supporting Document
```

**D. Integration Points**

- Add to `EvaluationDetail.tsx` in procurement officer view
- Display attachment list below evaluation sections
- Show upload button only for procurement roles

---

### 4. Reassign and Remove Evaluators

**Priority:** HIGH  
**Estimated Effort:** 6-8 hours

#### Implementation Steps:

**A. Backend API Enhancement**

```typescript
// POST /api/evaluations/:id/assignments/reassign
router.post(
    '/api/evaluations/:id/assignments/reassign',
    authMiddleware,
    requireRole(['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { oldUserId, newUserId, sections } = req.body;

        // Delete old assignment
        await prisma.evaluationAssignment.deleteMany({
            where: { evaluationId: parseInt(id), userId: oldUserId },
        });

        // Create new assignment
        const newAssignment = await prisma.evaluationAssignment.create({
            data: {
                evaluationId: parseInt(id),
                userId: newUserId,
                sections: sections,
                status: 'PENDING',
            },
        });

        // Audit log
        await auditService.log({
            action: 'EVALUATOR_REASSIGNED',
            details: { evaluationId: id, from: oldUserId, to: newUserId },
        });

        res.json(newAssignment);
    }),
);

// DELETE /api/evaluations/:id/assignments/:userId
router.delete(
    '/api/evaluations/:id/assignments/:userId',
    authMiddleware,
    requireRole(['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER']),
    asyncHandler(async (req, res) => {
        const { id, userId } = req.params;

        await prisma.evaluationAssignment.deleteMany({
            where: {
                evaluationId: parseInt(id),
                userId: parseInt(userId),
            },
        });

        res.json({ success: true });
    }),
);
```

**B. Frontend Updates**
Update `EvaluationDetail.tsx`:

```tsx
// Add reassignment modal
const [showReassignModal, setShowReassignModal] = useState(false);
const [selectedAssignment, setSelectedAssignment] = useState(null);

// Reassign button in evaluator list
<button
  className="btn btn-sm btn-outline-warning"
  onClick={() => handleReassign(assignment)}
>
  Reassign
</button>

// Remove button
<button
  className="btn btn-sm btn-outline-danger"
  onClick={() => handleRemove(assignment)}
>
  Remove
</button>
```

---

### 5. Edit Technical Evaluation Section

**Priority:** MEDIUM  
**Estimated Effort:** 4 hours

#### Implementation:

Enable editing of submitted Section C (Technical Evaluation):

```typescript
// Add edit mode flag to EvaluationAssignment
model EvaluationAssignment {
  // ... existing fields
  allowEditing Boolean @default(false)
}

// Backend endpoint to toggle edit mode
// PUT /api/evaluations/:id/assignments/:userId/toggle-edit
```

Frontend: Add "Enable Editing" button for procurement to unlock submitted sections.

---

### 6. Cancel Evaluation with Archive

**Priority:** HIGH  
**Estimated Effort:** 3-4 hours

#### Implementation:

**A. Database Enhancement**

```prisma
model Evaluation {
  // ... existing fields
  cancelled     Boolean   @default(false)
  cancelledAt   DateTime?
  cancelledBy   Int?
  cancelReason  String?   @db.Text

  cancelledByUser User? @relation("EvaluationCanceller", fields: [cancelledBy], references: [id])
}

// Update enum
enum EvaluationStatus {
  PENDING
  IN_PROGRESS
  COMMITTEE_REVIEW
  COMPLETED
  VALIDATED
  REJECTED
  CANCELLED  // Add this
}
```

**B. Backend Endpoint**

```typescript
// POST /api/evaluations/:id/cancel
router.post(
    '/api/evaluations/:id/cancel',
    authMiddleware,
    requireRole(['PROCUREMENT']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.sub;

        const cancelled = await prisma.evaluation.update({
            where: { id: parseInt(id) },
            data: {
                status: 'CANCELLED',
                cancelled: true,
                cancelledAt: new Date(),
                cancelledBy: userId,
                cancelReason: reason,
            },
        });

        res.json(cancelled);
    }),
);
```

**C. Frontend**

- Add "Cancel Evaluation" button in procurement view
- Show cancelled evaluations with strikethrough/grey styling
- Add filter to show/hide cancelled evaluations
- Display cancellation reason and date

---

### 7. HOD Form Auto-populate from Evaluation Report

**Priority:** HIGH  
**Estimated Effort:** 6-8 hours

#### Implementation:

**A. Data Flow**

```
Evaluation (Completed) → Auto-fill HOD Form → Procurement Manager → ED
```

**B. Backend Service**

```typescript
// services/hodFormService.ts
export async function generateHODFormFromEvaluation(evaluationId: number) {
    const evaluation = await prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: {
            request: true,
            combinedRequest: true,
            assignments: { include: { user: true } },
        },
    });

    // Extract key data from evaluation
    const formData = {
        rfqNumber: evaluation.rfqNumber,
        rfqTitle: evaluation.rfqTitle,
        totalValue: extractTotalValue(evaluation),
        recommendedSupplier: extractRecommendedSupplier(evaluation.sectionC),
        evaluationScore: extractScore(evaluation),
        evaluators: evaluation.assignments.map((a) => a.user.name).join(', '),
        completionDate: evaluation.reportCompletionDate,
        // ... other fields from evaluation
    };

    return formData;
}
```

**C. Frontend Component**
Create `src/pages/Procurement/DepartmentHead/HODFormGenerate.tsx`:

- Button: "Generate from Evaluation"
- Evaluation selector dropdown
- Auto-populate all fields from selected evaluation
- Allow manual edits before submission

---

### 8. HOD Workflow: HOD → Procurement Manager → ED

**Priority:** HIGH  
**Estimated Effort:** 8-10 hours

#### Implementation:

**A. Database Schema**

```prisma
model HODForm {
  id                    Int       @id @default(autoincrement())
  formNumber            String    @unique
  evaluationId          Int
  rfqNumber             String
  rfqTitle              String
  recommendedSupplier   String
  recommendedAmount     Decimal   @db.Decimal(12, 2)
  evaluationScore       Int?
  justification         String?   @db.Text
  status                HODFormStatus @default(PENDING_HOD)
  hodId                 Int
  hodApprovedAt         DateTime?
  hodComments           String?   @db.Text
  procurementManagerId  Int?
  pmApprovedAt          DateTime?
  pmComments            String?   @db.Text
  executiveDirectorId   Int?
  edApprovedAt          DateTime?
  edComments            String?   @db.Text
  currentAssigneeId     Int?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  evaluation      Evaluation @relation(fields: [evaluationId], references: [id])
  hod             User       @relation("HODFormHOD", fields: [hodId], references: [id])
  procurementMgr  User?      @relation("HODFormPM", fields: [procurementManagerId], references: [id])
  executiveDir    User?      @relation("HODFormED", fields: [executiveDirectorId], references: [id])
  currentAssignee User?      @relation("HODFormAssignee", fields: [currentAssigneeId], references: [id])

  @@index([evaluationId])
  @@index([status])
  @@index([currentAssigneeId])
}

enum HODFormStatus {
  PENDING_HOD
  PENDING_PROCUREMENT_MANAGER
  PENDING_EXECUTIVE_DIRECTOR
  APPROVED
  REJECTED
}
```

**B. Workflow Logic**

```typescript
// POST /api/hod-forms/:id/approve
async function approveHODForm(formId, userId, comments) {
    const form = await prisma.hODForm.findUnique({ where: { id: formId } });

    if (form.status === 'PENDING_HOD') {
        // HOD approved → send to Procurement Manager
        const pm = await findProcurementManager();
        await prisma.hODForm.update({
            where: { id: formId },
            data: {
                hodApprovedAt: new Date(),
                hodComments: comments,
                status: 'PENDING_PROCUREMENT_MANAGER',
                procurementManagerId: pm.id,
                currentAssigneeId: pm.id,
            },
        });
    } else if (form.status === 'PENDING_PROCUREMENT_MANAGER') {
        // PM approved → send to ED
        const ed = await findExecutiveDirector();
        await prisma.hODForm.update({
            where: { id: formId },
            data: {
                pmApprovedAt: new Date(),
                pmComments: comments,
                status: 'PENDING_EXECUTIVE_DIRECTOR',
                executiveDirectorId: ed.id,
                currentAssigneeId: ed.id,
            },
        });
    } else if (form.status === 'PENDING_EXECUTIVE_DIRECTOR') {
        // ED approved → final approval
        await prisma.hODForm.update({
            where: { id: formId },
            data: {
                edApprovedAt: new Date(),
                edComments: comments,
                status: 'APPROVED',
            },
        });
    }
}
```

---

### 9. Thresholds: 3M/5M Workflow with ED Approval Form

**Priority:** HIGH  
**Estimated Effort:** 10-12 hours

#### Implementation:

**A. Threshold Configuration**

```typescript
// Update thresholdService.ts
const PROCUREMENT_THRESHOLDS = {
    GOODS: {
        ED_APPROVAL: 3_000_000, // 3M JMD
        SPECIAL_PROCESS: 5_000_000,
    },
    WORKS: {
        ED_APPROVAL: 5_000_000, // 5M JMD
        SPECIAL_PROCESS: 10_000_000,
    },
};

export function requiresEDApproval(amount: number, type: 'GOODS' | 'WORKS'): boolean {
    return amount >= PROCUREMENT_THRESHOLDS[type].ED_APPROVAL;
}
```

**B. Database Schema**

```prisma
model EDApprovalForm {
  id                  Int       @id @default(autoincrement())
  formNumber          String    @unique
  requestId           Int?
  hodFormId           Int?
  evaluationId        Int?
  procurementType     String    // 'GOODS' or 'WORKS'
  totalAmount         Decimal   @db.Decimal(12, 2)
  justification       String    @db.Text
  riskAssessment      String?   @db.Text
  alternatives        String?   @db.Text
  status              EDFormStatus @default(PENDING)
  submittedById       Int
  approvedById        Int?
  approvedAt          DateTime?
  comments            String?   @db.Text
  createdAt           DateTime  @default(now())

  request       Request?    @relation(fields: [requestId], references: [id])
  hodForm       HODForm?    @relation(fields: [hodFormId], references: [id])
  evaluation    Evaluation? @relation(fields: [evaluationId], references: [id])
  submittedBy   User        @relation("EDFormSubmitter", fields: [submittedById], references: [id])
  approvedBy    User?       @relation("EDFormApprover", fields: [approvedById], references: [id])

  @@index([status])
  @@index([requestId])
}

enum EDFormStatus {
  PENDING
  APPROVED
  REJECTED
}
```

**C. Workflow Integration**

```typescript
// Modify request approval workflow
if (action === 'APPROVE' && request.status === 'PROCUREMENT_REVIEW') {
    const totalValue = Number(request.totalEstimated || 0);
    const procTypes = getProcurementTypes(request);
    const type = procTypes.includes('WORKS') ? 'WORKS' : 'GOODS';

    if (requiresEDApproval(totalValue, type)) {
        // Create ED Approval Form
        await prisma.eDApprovalForm.create({
            data: {
                requestId: request.id,
                procurementType: type,
                totalAmount: totalValue,
                status: 'PENDING',
                submittedById: userId,
            },
        });

        nextStatus = 'EXECUTIVE_REVIEW';
    } else {
        nextStatus = 'FINANCE_APPROVED';
    }
}
```

**D. Frontend Forms**

- Create `src/pages/Procurement/ExecutiveDirector/EDApprovalForm.tsx`
- Display threshold warning when amount exceeds limits
- Required fields: Justification, Risk Assessment, Alternatives Considered
- Approval/Rejection with comments

---

### 10. Comment/Status Tracking System

**Priority:** MEDIUM  
**Estimated Effort:** 6-8 hours

#### Implementation:

**A. Database Schema**

```prisma
model StatusComment {
  id            Int       @id @default(autoincrement())
  entityType    String    // 'REQUEST', 'EVALUATION', 'HOD_FORM', 'ED_FORM'
  entityId      Int
  status        String
  comment       String    @db.Text
  commentedById Int
  createdAt     DateTime  @default(now())

  commentedBy   User      @relation(fields: [commentedById], references: [id])

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

**B. Backend Service**

```typescript
// services/commentService.ts
export async function addStatusComment(entityType: string, entityId: number, status: string, comment: string, userId: number) {
    return await prisma.statusComment.create({
        data: {
            entityType,
            entityId,
            status,
            comment,
            commentedById: userId,
        },
        include: {
            commentedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

export async function getStatusHistory(entityType: string, entityId: number) {
    return await prisma.statusComment.findMany({
        where: { entityType, entityId },
        include: {
            commentedBy: {
                select: { id: true, name: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
```

**C. Frontend Component**

```tsx
// components/StatusTimeline.tsx
// Displays status changes with comments
// Timeline view with status badges
// Shows user who made the change and timestamp
```

---

### 11. Re-combine Combined Requests

**Priority:** MEDIUM  
**Estimated Effort:** 6-8 hours

#### Implementation:

**A. Backend Enhancement**

```typescript
// POST /api/combine/recombine
router.post(
    '/api/combine/recombine',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { combinedRequestIds, title, description } = req.body;
        const userId = req.user.sub;

        // Fetch all combined requests and their lots
        const combinedRequests = await prisma.combinedRequest.findMany({
            where: { id: { in: combinedRequestIds } },
            include: { lots: true },
        });

        // Collect all lot IDs from multiple combined requests
        const allLots = combinedRequests.flatMap((cr) => cr.lots.map((lot) => lot.id));

        // Create new super-combined request
        const newCombined = await prisma.combinedRequest.create({
            data: {
                reference: generateReference('RECOMB'),
                title,
                description,
                createdBy: userId,
                lots: {
                    connect: allLots.map((id) => ({ id })),
                },
            },
            include: { lots: true },
        });

        res.json(newCombined);
    }),
);
```

**B. Frontend UI**

- Multi-select checkbox for combined requests
- "Re-combine Selected" button
- Shows all underlying lots in preview
- Maintains original lot numbers

---

### 12. Evaluation Completed Status Badge

**Priority:** LOW  
**Estimated Effort:** 2 hours

#### Implementation:

```tsx
// components/EvaluationStatusBadge.tsx
export function EvaluationStatusBadge({ status }: { status: string }) {
    const getBadgeClass = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'badge badge-outline-success';
            case 'VALIDATED':
                return 'badge badge-outline-primary';
            case 'IN_PROGRESS':
                return 'badge badge-outline-warning';
            case 'CANCELLED':
                return 'badge badge-outline-danger';
            case 'REJECTED':
                return 'badge badge-outline-danger';
            default:
                return 'badge badge-outline-info';
        }
    };

    return (
        <span className={getBadgeClass(status)}>
            {status === 'COMPLETED' && <IconChecks className="mr-1" />}
            {status.replace(/_/g, ' ')}
        </span>
    );
}
```

Add to evaluation lists and detail pages.

---

## TESTING CHECKLIST

### Dual Role

- [ ] Budget Manager can approve at FINANCE_REVIEW stage
- [ ] Finance Officer can still approve at FINANCE_REVIEW
- [ ] Other roles are blocked from FINANCE_REVIEW

### Evaluation Features

- [ ] Upload quotes during evaluation
- [ ] Download uploaded quotes
- [ ] Delete uploaded quotes (procurement only)
- [ ] Reassign evaluator to different user
- [ ] Remove evaluator from evaluation
- [ ] Edit submitted technical evaluation
- [ ] Cancel evaluation with reason
- [ ] View cancelled evaluations
- [ ] Completed badge displays correctly

### HOD Workflow

- [ ] Generate HOD form from evaluation
- [ ] HOD approves → goes to Procurement Manager
- [ ] Procurement Manager approves → goes to ED
- [ ] ED approves → final approval
- [ ] Rejection at any stage

### Thresholds

- [ ] 3M goods triggers ED approval
- [ ] 5M works triggers ED approval
- [ ] ED form created automatically
- [ ] ED can approve/reject with comments
- [ ] Below threshold skips ED step

### Comments & Status

- [ ] Status changes logged with comments
- [ ] Timeline displays correctly
- [ ] Historical comments viewable
- [ ] User attribution correct

### Re-combine

- [ ] Select multiple combined requests
- [ ] Create super-combined request
- [ ] All lots included
- [ ] Original data preserved

---

## MIGRATION SCRIPTS

### Run migrations in order:

```bash
# 1. Add EvaluationAttachment table
npx prisma migrate dev --name add-evaluation-attachments

# 2. Add HODForm table
npx prisma migrate dev --name add-hod-form

# 3. Add EDApprovalForm table
npx prisma migrate dev --name add-ed-approval-form

# 4. Add StatusComment table
npx prisma migrate dev --name add-status-comments

# 5. Add cancelled fields to Evaluation
npx prisma migrate dev --name add-evaluation-cancellation

# 6. Add allowEditing to EvaluationAssignment
npx prisma migrate dev --name add-assignment-editing
```

---

## DEPLOYMENT NOTES

1. **Database backups** before running migrations
2. Test all features in staging environment
3. Update user documentation
4. Train key users on new workflows
5. Monitor logs for errors after deployment
6. Set up threshold alerts for ED approvals

---

## MAINTENANCE

- Review thresholds quarterly
- Audit cancelled evaluations monthly
- Clean up orphaned attachments
- Monitor workflow bottlenecks
- Collect user feedback on HOD form automation

---

**Document Version:** 1.0  
**Last Updated:** January 26, 2026  
**Next Review:** February 26, 2026
