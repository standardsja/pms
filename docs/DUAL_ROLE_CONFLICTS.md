# Dual Role Conflict Resolution

## Analyzed Role Combinations

### ✅ No Conflict: Most Dual Roles

-   **Procurement Manager + Procurement Officer**: Officer excluded by detector (`!isProcurementManager`); only Manager shows
-   **Finance roles + Procurement**: Finance role suppressed by exclusion logic or Manager blocks them
-   **Innovation Committee + HOD**: Both sections show cleanly; user can toggle modules
-   **Auditor + Department Manager**: Auditor > Department Manager in priority; Department suppressed in detector

### ⚠️ CONFLICT FIXED: Requester + Department Manager

**Issue:** `isRequester` check only partially excluded higher-priority roles. If user had explicit `REQUESTER` role in database, both sections would render even though Department Manager should take precedence.

**Root cause:**

```typescript
// OLD: Requester OR logic allowed both flags true
const isRequester = hasRole('REQUESTER') || (containsAny(['REQUEST']) && !isDepartmentManager && ...);
```

**Fix applied:**

```typescript
// NEW: Requester AND-gated with exclusions; respects priority
const isRequester = !isProcurementManager && !isProcurementOfficer && !isFinanceManager && !isDepartmentManager && !isAuditor && (hasRole('REQUESTER') || containsAny(['REQUEST']));
```

Now if user has `DEPARTMENT_MANAGER` + `REQUESTER` roles:

-   `isDepartmentManager = true`
-   `isRequester = false` (excluded by `!isDepartmentManager`)
-   Only Department Manager sidebar shows ✅

---

## Dual Role Sidebar Behavior After Fix

| User Roles                                | Primary Role        | Dashboard                                   | Sidebar Sections                  | Conflict? |
| ----------------------------------------- | ------------------- | ------------------------------------------- | --------------------------------- | --------- |
| `REQUESTER`                               | REQUESTER           | `/procurement/dashboard/requester`          | Requester                         | None      |
| `REQUESTER` + `DEPT_MANAGER`              | DEPARTMENT_MANAGER  | `/procurement/dashboard/department-manager` | Dept Manager only                 | **Fixed** |
| `PROCUREMENT_OFFICER`                     | PROCUREMENT_OFFICER | `/procurement/dashboard`                    | Officer + (Finance if applicable) | None      |
| `PROCUREMENT_OFFICER` + `FINANCE_MANAGER` | FINANCE_MANAGER     | `/finance`                                  | Finance (Officer suppressed)      | None      |
| `INNOVATION_COMMITTEE` + `HOD`            | ADMIN (HOD)         | `/procurement/hod`                          | HOD + Committee (via module pin)  | None      |
| `PROCUREMENT_MANAGER`                     | PROCUREMENT_MANAGER | `/procurement/manager`                      | Manager                           | None      |

---

## Precedence Chain

```
Admin/HOD > Innovation Committee > Executive > Department Head > Auditor
> Finance Payment > Budget Manager > Finance Manager > Finance Officer
> Procurement Manager > Procurement Officer > Department Manager > Supplier > Requester
```

Lower-priority roles excluded from flags when higher-priority roles present.
