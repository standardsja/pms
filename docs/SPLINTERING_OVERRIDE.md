# Splintering Override with Manager Authorization & Audit Logging

## Overview
Implemented a secure manager-only override system for splintering detection warnings with comprehensive audit logging.

## Implementation Details

### Backend Changes (`server/index.ts`)

#### 1. Role-Based Authorization
When `overrideSplinter: true` is sent in the submit request body, the system now:
- Extracts `x-user-id` from request headers
- Verifies the user exists and fetches their roles
- Checks for manager privileges:
  - `PROCUREMENT_MANAGER`
  - `DEPT_MANAGER`
  - `MANAGER`
  - `EXECUTIVE`
- Returns `403 Forbidden` if user lacks manager role

#### 2. Enhanced Audit Logging
When a manager overrides a splintering warning:
- **Notification Record** created with:
  - Type: `THRESHOLD_EXCEEDED`
  - Detailed message with manager name and email
  - Complete override context including:
    - Manager identity (id, name, email, roles)
    - Request details (id, reference)
    - Splintering analysis (combined value, threshold, window)
    - Timestamp and action type
- **Status History Entry** created with:
  - Manager ID as `changedById`
  - Detailed comment explaining the override with values
  - Permanent audit trail within request history

#### 3. Console Logging
Audit events are logged to console for monitoring:
```
[Audit] Splintering override by {name} (ID {id}) for request {requestId}
```

### Frontend Changes (`src/pages/Procurement/Requests/RequestForm.tsx`)

#### 1. Manager Role Detection
Added `hasManagerRole` check based on user profile:
```typescript
const hasManagerRole = userRoles.some(
    (r: string) => r === 'PROCUREMENT_MANAGER' || r === 'DEPT_MANAGER' || 
                  r === 'MANAGER' || r === 'EXECUTIVE' || /manager/i.test(r)
);
```

#### 2. Differentiated UI Flow

**For Non-Managers:**
- Shows warning dialog explaining splintering detected
- **Cannot proceed** - dialog only has "OK" button
- Message instructs them to contact their manager
- Submission is blocked at frontend level

**For Managers:**
- Shows warning with full splintering details
- Dialog includes:
  - Combined value and threshold information
  - **Manager Override** notice explaining audit logging
  - Two buttons:
    - "Proceed & Log Override" (red/warning color)
    - "Cancel"
- Emphasizes that override will be logged for audit

#### 3. Updated Both Submit Flows
- **Initial submission** (new requests)
- **Resubmission** (returned/draft requests)

Both flows now check role before allowing override.

## Security Features

1. **Defense in Depth**
   - Frontend prevents non-managers from attempting override
   - Backend validates role before accepting override
   - Audit logs capture all override attempts

2. **Comprehensive Audit Trail**
   - Permanent record in status history
   - System-wide notification for audit review
   - Console logs for real-time monitoring
   - Manager identity fully captured (name, email, roles)

3. **Transparent to User**
   - Non-managers clearly informed they need manager approval
   - Managers warned that action will be audited
   - No ambiguity about permissions

## Testing

### Test Scenarios

1. **Non-Manager Attempts Override**
   - Expected: Blocked with helpful message
   - Verify: No submission occurs, no audit logs created

2. **Manager Overrides Warning**
   - Expected: Submission succeeds, audit logs created
   - Verify:
     - Request moves to next workflow stage
     - Notification record exists with full details
     - Status history shows override comment
     - Console shows audit log entry

3. **Missing x-user-id Header**
   - Expected: 400 Bad Request
   - Verify: "User ID required to override splintering"

4. **Invalid User ID**
   - Expected: 404 Not Found
   - Verify: "Acting user not found"

### Manual Testing Commands

```bash
# Test as non-manager (should fail with 403)
curl -X POST http://heron:4000/requests/:id/submit \
  -H "Content-Type: application/json" \
  -H "x-user-id: <NON_MANAGER_ID>" \
  -d '{"overrideSplinter": true}'

# Test as manager (should succeed with audit logs)
curl -X POST http://heron:4000/requests/:id/submit \
  -H "Content-Type: application/json" \
  -H "x-user-id: <MANAGER_ID>" \
  -d '{"overrideSplinter": true}'

# Verify audit logs
mysql -h Stork -u database_admin -p -D db_spinx -e "
SELECT * FROM Notification 
WHERE type = 'THRESHOLD_EXCEEDED' 
ORDER BY createdAt DESC LIMIT 5;
"

mysql -h Stork -u database_admin -p -D db_spinx -e "
SELECT * FROM StatusHistory 
WHERE comment LIKE '%override%' 
ORDER BY createdAt DESC LIMIT 5;
"
```

## Benefits

1. **Compliance**
   - Meets audit requirements for threshold bypass tracking
   - Full accountability for all override decisions
   - Transparent decision trail for regulators

2. **User Experience**
   - Clear messaging about permissions
   - No confusion about who can override
   - Managers empowered to make informed decisions

3. **Security**
   - Role-based access control properly enforced
   - Multi-layer validation (frontend + backend)
   - Comprehensive audit logging prevents shadow activity

4. **Maintainability**
   - Centralized role checking logic
   - Consistent audit patterns
   - Easy to extend with additional roles

## Future Enhancements

1. **Dashboard for Override Review**
   - Create admin view of all overrides
   - Filter by manager, date range, amount
   - Export for compliance reporting

2. **Threshold Configuration**
   - Allow dynamic adjustment of splintering thresholds
   - Per-department or per-role limits
   - Integration with budget/fiscal year settings

3. **Notification Routing**
   - Auto-notify audit team of overrides
   - Email alerts for high-value overrides
   - Weekly summary reports

4. **Advanced Analytics**
   - Track override patterns by manager
   - Identify departments with frequent overrides
   - Flag potential policy violations

## Related Files

- `server/index.ts` - Submit endpoint with override logic
- `server/services/splinteringService.ts` - Detection algorithm
- `src/pages/Procurement/Requests/RequestForm.tsx` - UI with role checks
- `docs/ORGANIZATION_AUDIT_REPORT.md` - Original splintering documentation

## Deployment Notes

1. Ensure all manager users have proper role assignments in database
2. Test with real user accounts before production
3. Monitor audit logs for first week after deployment
4. Train managers on new override workflow
5. Update user documentation with override procedure
