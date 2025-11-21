# Procurement Threshold System

## Overview

The Procurement Management System now includes an automated threshold system that ensures high-value requests are routed to the appropriate approval level according to procurement regulations.

## Threshold Rules

### Goods and Services
- **Threshold**: $3,000,000 USD or equivalent
- **Triggers**: When `procurementType` contains any of:
  - `goods`
  - `services` 
  - `consulting`
  - `supplies`
  - `equipment`
  - `materials`

### Works and Construction
- **Threshold**: $5,000,000 USD or equivalent  
- **Triggers**: When `procurementType` contains any of:
  - `works`
  - `construction`
  - `infrastructure`

## Workflow Routing

### Normal Flow (Below Thresholds)
1. **DRAFT** → **DEPARTMENT_REVIEW** (Department Manager)
2. **DEPARTMENT_REVIEW** → **HOD_REVIEW** (Head of Division)
3. **HOD_REVIEW** → **FINANCE_REVIEW** (Finance Officer)
4. **FINANCE_REVIEW** → **BUDGET_MANAGER_REVIEW** (Budget Manager)
5. **BUDGET_MANAGER_REVIEW** → **PROCUREMENT_REVIEW** (Procurement Officer)
6. **PROCUREMENT_REVIEW** → **FINANCE_APPROVED** (Final Approval)

### High-Value Flow (Above Thresholds)
1. **DRAFT** → **EXECUTIVE_REVIEW** (Executive Director) *[Skips Department Review]*
2. **EXECUTIVE_REVIEW** → **FINANCE_REVIEW** (Finance Officer)
3. **FINANCE_REVIEW** → **BUDGET_MANAGER_REVIEW** (Budget Manager)
4. **BUDGET_MANAGER_REVIEW** → **PROCUREMENT_REVIEW** (Procurement Officer)
5. **PROCUREMENT_REVIEW** → **FINANCE_APPROVED** (Final Approval)

## System Components

### Database Changes
- **New Status**: `EXECUTIVE_REVIEW` added to `RequestStatus` enum
- **New Role**: `EXECUTIVE_DIRECTOR` role for high-level approvals

### Backend Services
- **ThresholdService**: `server/services/thresholdService.ts`
  - `checkProcurementThresholds()` - Determines if Executive approval is required
  - `getNextApprover()` - Calculates next workflow step
  - `logThresholdDecision()` - Creates audit trail

### API Endpoints Affected
- `POST /requests/:id/submit` - Request submission with threshold checking
- `POST /requests/:id/action` - Approval workflow with threshold routing

## Audit Trail

Every threshold decision is logged automatically with:
- Request value and currency
- Procurement type category
- Threshold amount applied
- Decision rationale
- Routing outcome

## Usage Examples

### Example 1: High-Value Goods Purchase
```json
{
  "totalEstimated": 3500000,
  "currency": "USD",
  "procurementType": ["goods", "equipment"]
}
```
**Result**: Routes directly to Executive Director (exceeds $3M goods threshold)

### Example 2: Large Construction Project  
```json
{
  "totalEstimated": 6000000,
  "currency": "USD", 
  "procurementType": ["works", "construction"]
}
```
**Result**: Routes directly to Executive Director (exceeds $5M works threshold)

### Example 3: Regular Office Supplies
```json
{
  "totalEstimated": 50000,
  "currency": "USD",
  "procurementType": ["supplies", "goods"]
}
```
**Result**: Normal workflow through Department Manager (below thresholds)

## Configuration

The threshold amounts are configured in `thresholdService.ts`:
- `WORKS_THRESHOLD = 5000000` ($5M)
- `GOODS_SERVICES_THRESHOLD = 3000000` ($3M)

To modify thresholds, update these constants and redeploy.

## Compliance

This system ensures compliance with procurement regulations by:
- Automatically identifying high-value requests
- Routing to appropriate approval authority
- Creating comprehensive audit trails
- Preventing manual routing errors
- Maintaining transparency in approval decisions

## Testing

To test the threshold system:
1. Create requests with values above/below thresholds
2. Set appropriate procurement types
3. Submit requests and verify routing
4. Check audit logs in request actions