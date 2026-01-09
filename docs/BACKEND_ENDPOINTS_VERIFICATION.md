# Procurement Backend Endpoints - Verification Checklist

**Status:** Critical endpoints needed for recent dashboard updates  
**Updated:** January 8, 2026

---

## 🚨 CRITICAL - Must Have

These endpoints are required by the refactored dashboards:

### Evaluation Management

```
GET /api/evaluations/pending-validation
Purpose: List evaluations waiting for manager validation
Response Type: Evaluation[]
Response Structure:
{
    id: string;
    rfqId: string;
    title: string;
    evaluator: string;
    score: number; // 0-100
    date: string;
    status: 'Pending Validation' | 'Validated' | 'Changes Requested';
}
Example:
[
    {
        id: "EV-001",
        rfqId: "RFQ-123",
        title: "Office Equipment Evaluation",
        evaluator: "John Smith",
        score: 85,
        date: "2026-01-08",
        status: "Pending Validation"
    }
]

PATCH /api/evaluations/{id}/validate
Purpose: Submit validation decision for an evaluation
Request Body:
{
    status: 'Validated' | 'Changes Requested';
    notes?: string;
}
Response: { success: true; message: string; }
```

### Executive Director Approvals

```
GET /api/stats/executive-director
Purpose: Executive-level dashboard statistics
Response Type: ExecutiveStats
Response Structure:
{
    pendingSignOffs: number;
    completedApprovals: number;
    totalBudgetValue: number;
    thisQuarterApprovals: number;
    avgProcessingTime: number; // days
    complianceRate: number; // percentage
}
Example:
{
    pendingSignOffs: 6,
    completedApprovals: 89,
    totalBudgetValue: 2500000,
    thisQuarterApprovals: 45,
    avgProcessingTime: 1.2,
    complianceRate: 98.5
}

GET /api/approvals/pending-executive
Purpose: List pending approvals requiring executive sign-off
Response Type: ExecutiveApproval[]
Response Structure:
{
    id: number;
    approvalNumber: string; // e.g. APP-2024-001
    type: string;
    description: string;
    requestor: string;
    departmentHead: string;
    amount: number;
    submittedDate: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: string;
    documents: number; // count
    budgetCode: string;
    vendor: string;
    contractPeriod: string;
    status: string;
    documentList?: Document[]; // optional
}
Example:
[
    {
        id: 1,
        approvalNumber: "APP-2024-001",
        type: "Major Contract",
        description: "Enterprise Software License Renewal",
        requestor: "IT Department",
        departmentHead: "Jane Smith",
        amount: 125000,
        submittedDate: "2026-01-08",
        priority: "High",
        dueDate: "2026-01-15",
        documents: 8,
        budgetCode: "IT-2024-SW",
        vendor: "Microsoft Corporation",
        contractPeriod: "3 Years",
        status: "Pending Executive Approval"
    }
]

GET /api/approvals/recent-signoffs
Purpose: List recently signed-off approvals
Response Type: SignedApproval[]
Response Structure:
{
    id: number;
    action: string; // 'Approved', 'Conditionally Approved', etc
    description: string;
    amount: number;
    signedDate: string;
    vendor: string;
    processing: string; // 'Digital Signature', etc
    condition?: string; // optional
}
Example:
[
    {
        id: 1,
        action: "Approved",
        description: "Marketing Campaign Management Software",
        amount: 65000,
        signedDate: "2026-01-08",
        vendor: "HubSpot Inc",
        processing: "Digital Signature"
    }
]

GET /api/approvals/trends
Purpose: Trend data for executive dashboard charts
Response Type: ApprovalTrends
Response Structure:
{
    series: [
        {
            name: 'Approved Amount ($000s)';
            data: number[]; // 12 months
        },
        {
            name: 'Number of Approvals';
            data: number[]; // 12 months
        }
    ];
    options?: any; // chart options, or construct on frontend
}
Example:
{
    series: [
        {
            name: "Approved Amount ($000s)",
            data: [125, 180, 95, 220, 165, 240, 195, 275, 210, 190, 155, 145]
        },
        {
            name: "Number of Approvals",
            data: [8, 12, 6, 15, 11, 18, 14, 20, 16, 13, 10, 9]
        }
    ]
}
```

---

## ⚠️ IMPORTANT - Verify Still Working

These endpoints are used by dashboards and should be verified:

### Statistics

```
GET /api/stats/dashboard
- Used by: Procurement Officer Dashboard
- Should return procurement metrics
- Include trend data for charts

GET /api/stats/heartbeat
- Used by: Finance Officer Dashboard
- Keeps session alive
- Light endpoint (no heavy data)
```

### Admin Management

```
GET /api/admin/users
- Return user list with roles
- Must include externalId for LDAP filtering
- Response: { id, email, name, roles, externalId, lastLogin }

GET /api/admin/roles
- Return all available roles
- Response: { id, name, description }

GET /api/admin/departments
- Return all departments
- Response: { id, name, code }
```

### Finance

```
GET /api/finance/requests
- Finance Officer Dashboard uses this
- Return procurement requests for financial review

POST /api/approvals/{id}/approve
- Used for approval workflows
- Check endpoint exists and is accessible
```

---

## 🔧 Implementation Guide

### For Backend Development

1. **Create evaluation endpoint:**

    ```typescript
    // server/routes/evaluations.ts
    router.get('/pending-validation', async (req, res) => {
        // Get evaluations with status = 'Pending Validation'
        // Filter by current user if manager
        // Return Evaluation[] with proper structure
    });

    router.patch('/:id/validate', async (req, res) => {
        // Update evaluation status
        // Log the validation
        // Return success response
    });
    ```

2. **Create approval endpoints:**

    ```typescript
    // server/routes/approvals.ts
    router.get('/pending-executive', async (req, res) => {
        // Return approvals requiring executive sign-off
        // Order by priority and due date
        // Include document count
    });

    router.get('/recent-signoffs', async (req, res) => {
        // Return recently signed approvals
        // Limit to last 10-20 items
        // Order by date descending
    });

    router.get('/trends', async (req, res) => {
        // Calculate 12-month trends
        // Return amount and count data
        // Group by month
    });
    ```

3. **Create stats endpoint:**
    ```typescript
    // server/routes/stats.ts
    router.get('/executive-director', async (req, res) => {
        // Calculate executive statistics
        // pendingSignOffs: count with status = 'pending'
        // completedApprovals: count with status = 'approved'
        // totalBudgetValue: sum of amounts
        // thisQuarterApprovals: count in current quarter
        // avgProcessingTime: average days to approval
        // complianceRate: percentage on-time approvals
    });
    ```

### For Testing

1. **Mock API responses** in development:

    ```typescript
    // Mock while building
    const mockEvaluations = [
        {
            id: 'EV-001',
            rfqId: 'RFQ-001',
            title: 'Test Evaluation',
            evaluator: 'Test User',
            score: 85,
            date: new Date().toISOString(),
            status: 'Pending Validation',
        },
    ];
    ```

2. **Test with Postman/Insomnia:**

    - GET `/api/evaluations/pending-validation` - should return array
    - PATCH `/api/evaluations/{id}/validate` - should update status
    - GET `/api/stats/executive-director` - should return stats object
    - etc.

3. **Verify response structure:**
    - Check field names match exactly
    - Check data types (number vs string)
    - Check optional fields handled correctly

---

## 🧪 Testing Checklist

### Frontend Tests

-   [ ] Dashboard loads without errors
-   [ ] Loading spinner shows while fetching
-   [ ] Data displays after load completes
-   [ ] Error handling works if endpoint fails
-   [ ] Network tab shows real API calls
-   [ ] No console errors or warnings

### Backend Tests

-   [ ] Endpoint returns correct status code (200 OK)
-   [ ] Response body matches expected structure
-   [ ] Data is filtered correctly (manager sees their evals, etc)
-   [ ] Pagination works if data is large
-   [ ] Error responses are proper format
-   [ ] Performance is acceptable (<1 second)

### Integration Tests

-   [ ] User can validate evaluation and sees confirmation
-   [ ] Executive can see all pending approvals
-   [ ] Statistics update after action
-   [ ] Charts render with trend data

---

## 📊 Endpoints Matrix

| Method | Endpoint                              | Frontend Component | Status   | Priority |
| ------ | ------------------------------------- | ------------------ | -------- | -------- |
| GET    | `/api/evaluations/pending-validation` | ProcurementManager | NEW      | CRITICAL |
| PATCH  | `/api/evaluations/{id}/validate`      | ProcurementManager | NEW      | CRITICAL |
| GET    | `/api/stats/executive-director`       | ExecutiveDirector  | NEW      | CRITICAL |
| GET    | `/api/approvals/pending-executive`    | ExecutiveDirector  | NEW      | CRITICAL |
| GET    | `/api/approvals/recent-signoffs`      | ExecutiveDirector  | NEW      | CRITICAL |
| GET    | `/api/approvals/trends`               | ExecutiveDirector  | NEW      | CRITICAL |
| GET    | `/api/stats/dashboard`                | ProcurementOfficer | EXISTING | VERIFY   |
| GET    | `/api/admin/users`                    | Admin              | EXISTING | VERIFY   |
| GET    | `/api/admin/roles`                    | Admin              | EXISTING | VERIFY   |
| GET    | `/api/admin/departments`              | Admin              | EXISTING | VERIFY   |

---

## ✅ Verification Steps

1. **Check routes file:**

    ```bash
    grep -r "evaluations" server/routes/
    grep -r "approvals" server/routes/
    grep -r "stats" server/routes/
    ```

2. **Check database queries:**

    ```typescript
    // Ensure Prisma queries return correct fields
    // Check relationships are loaded (e.g., evaluation.rfq)
    // Verify filters work (status, dates, user permissions)
    ```

3. **Test endpoints:**

    ```bash
    curl http://localhost:4000/api/evaluations/pending-validation
    curl http://localhost:4000/api/stats/executive-director
    # etc
    ```

4. **Check response format:**
    - Use Postman to inspect actual responses
    - Compare with expected structure above
    - Fix mismatches in frontend or backend

---

## 🚀 Deployment Checklist

Before deploying to production:

-   [ ] All 6 new endpoints implemented and tested
-   [ ] Response formats verified against frontend expectations
-   [ ] Error handling implemented (404, 500, etc)
-   [ ] Proper authentication/authorization checks
-   [ ] Pagination implemented for large datasets
-   [ ] Performance tested (response time < 1s)
-   [ ] Existing endpoints still working
-   [ ] Logging configured for new endpoints
-   [ ] Monitoring/alerting set up
-   [ ] Documentation updated

---

**Prepared By:** Development Team  
**Created:** January 8, 2026  
**Last Updated:** January 8, 2026  
**Status:** Ready for Backend Implementation
