# Load Balancing Feature - Complete Implementation Guide

## 📋 Overview

The load balancing feature automatically distributes procurement requests among available Procurement Officers using configurable assignment strategies. This prevents workload concentration and ensures fair distribution of review tasks.

## 🎯 Features

- **Three Assignment Strategies**:
  - `LEAST_LOADED`: Assigns to officer with fewest active requests
  - `ROUND_ROBIN`: Cycles through officers in order
  - `RANDOM`: Random selection from available pool

- **Configurable Settings**:
  - Enable/disable load balancing
  - Select assignment strategy
  - Toggle auto-assignment on approval
  - Persistent state across restarts

- **Workflow Integration**:
  - Triggers when requests move to `PROCUREMENT_REVIEW` status
  - Creates audit trail in `RequestStatusHistory`
  - Sends notifications to assigned officers
  - Preserves manual assignment capability

## 🏗️ Architecture

### Database Schema

```prisma
enum LoadBalancingStrategy {
  LEAST_LOADED  // Assigns to officer with lightest workload
  ROUND_ROBIN   // Cycles through officers sequentially
  RANDOM        // Random selection
}

model LoadBalancingSettings {
  id                    Int                      @id @default(autoincrement())
  enabled               Boolean                  @default(false)
  strategy              LoadBalancingStrategy    @default(LEAST_LOADED)
  autoAssignOnApproval  Boolean                  @default(true)
  roundRobinCounter     Int                      @default(0)
  updatedAt             DateTime                 @updatedAt
  updatedBy             Int
  updatedByUser         User                     @relation(fields: [updatedBy], references: [id])
}
```

### Service Layer (`server/services/loadBalancingService.ts`)

**Core Functions**:

1. **`getLoadBalancingSettings(prisma)`**
   - Retrieves current settings from database
   - Returns null if no settings exist
   - Used by workflow to check if auto-assignment should trigger

2. **`updateLoadBalancingSettings(prisma, config, userId)`**
   - Creates or updates settings
   - Records audit trail (updatedBy, updatedAt)
   - Validates strategy enum values

3. **`autoAssignRequest(prisma, requestId)`**
   - Main assignment function
   - Checks if load balancing enabled
   - Selects officer using configured strategy
   - Updates request.currentAssigneeId
   - Creates audit entry in RequestStatusHistory
   - Returns assigned officer ID or null

4. **`shouldAutoAssign(newStatus, settings)`**
   - Decision function for workflow integration
   - Returns true if:
     - Status is `PROCUREMENT_REVIEW`
     - Settings exist and enabled is true
     - autoAssignOnApproval is true

**Strategy Implementations**:

1. **LEAST_LOADED Strategy**:
   ```typescript
   // Queries active workload for each officer
   const workload = await prisma.request.count({
     where: {
       currentAssigneeId: officer.id,
       status: 'PROCUREMENT_REVIEW'
     }
   });
   // Selects officer with minimum count
   ```

2. **ROUND_ROBIN Strategy**:
   ```typescript
   // Uses persistent counter
   const index = settings.roundRobinCounter % officers.length;
   const selected = officers[index];
   // Increments counter for next assignment
   await prisma.loadBalancingSettings.update({
     where: { id: settings.id },
     data: { roundRobinCounter: settings.roundRobinCounter + 1 }
   });
   ```

3. **RANDOM Strategy**:
   ```typescript
   const index = Math.floor(Math.random() * officers.length);
   return officers[index];
   ```

### API Endpoints

**GET `/procurement/load-balancing-settings`**
- Auth: JWT required
- Role: `PROCUREMENT_MANAGER` only
- Returns: Current settings or default values
- Response:
  ```json
  {
    "enabled": false,
    "strategy": "LEAST_LOADED",
    "autoAssignOnApproval": true,
    "roundRobinCounter": 0
  }
  ```

**POST `/procurement/load-balancing-settings`**
- Auth: JWT required
- Role: `PROCUREMENT_MANAGER` only
- Body:
  ```json
  {
    "enabled": true,
    "strategy": "ROUND_ROBIN",
    "autoAssignOnApproval": true
  }
  ```
- Creates or updates settings
- Records updatedBy from JWT token

### Workflow Integration

Location: `server/index.ts` - POST `/requests/:id/action` endpoint

```typescript
// After status update succeeds
const settings = await getLoadBalancingSettings(prisma);

if (shouldAutoAssign(nextStatus, settings)) {
  console.log(`[Workflow] Triggering auto-assignment for request ${updated.id}`);
  
  const assignedOfficerId = await autoAssignRequest(prisma, updated.id);
  
  if (assignedOfficerId) {
    // Refresh request data to include new assignee
    updated = await prisma.request.findUnique({
      where: { id: updated.id },
      include: { currentAssignee: true }
    });
    
    // Notify assigned officer
    await prisma.notification.create({
      data: {
        userId: assignedOfficerId,
        message: `Request #${updated.id} has been auto-assigned to you`,
        type: 'REQUEST_ASSIGNED',
        requestId: updated.id
      }
    });
  }
}
```

**Trigger Conditions**:
- Request status changes to `PROCUREMENT_REVIEW`
- Load balancing is enabled
- `autoAssignOnApproval` is true

**What Happens**:
1. System checks settings via `shouldAutoAssign()`
2. Calls `autoAssignRequest()` if conditions met
3. Officer selected based on configured strategy
4. `request.currentAssigneeId` updated
5. Audit entry created in `RequestStatusHistory`
6. Notification sent to assigned officer

## 📦 Deployment

### Prerequisites
- Node.js and npm installed
- Prisma CLI available (`npx prisma`)
- MySQL database accessible
- `.env` file with `DATABASE_URL`

### Automated Deployment (Recommended)

```bash
# SSH into heron server
ssh user@heron.example.com

# Navigate to project
cd ~/pms

# Pull latest changes
git pull origin main

# Run deployment script
bash scripts/deploy-load-balancing.sh
```

The script performs:
1. Environment verification
2. Unit test execution
3. Database migration
4. Prisma Client regeneration
5. PM2 backend restart

### Manual Deployment

```bash
# 1. Navigate to server directory
cd ~/pms/server

# 2. Create database migration
npx prisma migrate dev --name add_load_balancing

# 3. Regenerate Prisma Client
npx prisma generate

# 4. Restart backend
pm2 restart pms-backend

# 5. Verify
pm2 logs pms-backend --lines 50
```

## 🧪 Testing

### Unit Tests

**Location**: `server/__tests__/loadBalancingService.test.ts`

**Coverage** (15 tests):
- Settings retrieval (exist/null)
- Settings creation/update
- LEAST_LOADED strategy (workload distribution, edge cases)
- ROUND_ROBIN strategy (cycling, wrap-around)
- RANDOM strategy (selection validation)
- `shouldAutoAssign()` logic (all conditions)

**Run Tests**:
```bash
npm run test:server -- server/__tests__/loadBalancingService.test.ts
```

### Integration Testing

**Test Workflow**:

1. **Setup**:
   ```bash
   # Log in as PROCUREMENT_MANAGER
   # Navigate to Load Balancing Settings
   ```

2. **Enable Load Balancing**:
   - Enable toggle: ON
   - Select strategy: LEAST_LOADED
   - Auto-assign on approval: ON
   - Save settings

3. **Create Test Request**:
   ```bash
   # Log in as regular user
   # Create new procurement request
   # Fill required fields, attach documents
   # Submit request
   ```

4. **Approve Through Workflow**:
   ```bash
   # Log in as DEPARTMENT_HEAD
   # Approve request → moves to EXECUTIVE_REVIEW
   
   # Log in as EXECUTIVE_DIRECTOR
   # Approve request → moves to BUDGET_MANAGER_REVIEW
   
   # Log in as BUDGET_MANAGER
   # Approve request → moves to PROCUREMENT_REVIEW
   # ✅ Auto-assignment should trigger here
   ```

5. **Verify Assignment**:
   - Check request details shows assigned Procurement Officer
   - Verify officer received notification
   - Check logs for `[LoadBalancing]` entries
   - Query database:
     ```sql
     SELECT * FROM Request WHERE id = <request_id>;
     SELECT * FROM RequestStatusHistory WHERE requestId = <request_id> ORDER BY createdAt DESC LIMIT 5;
     ```

**Test Different Strategies**:

1. **LEAST_LOADED**:
   - Create 3 officers with 5, 3, 7 active requests
   - Trigger assignment → should assign to officer with 3 requests
   - Verify via workload query

2. **ROUND_ROBIN**:
   - Submit 5 requests sequentially
   - Verify each officer gets assigned in order
   - Check `roundRobinCounter` increments: 0→1→2→0→1

3. **RANDOM**:
   - Submit 10 requests
   - Verify distribution is reasonably balanced
   - No officer should get 0 or all 10

## 🔍 Monitoring

### Log Entries

**Success**:
```
[LoadBalancing] Auto-assigning request 123 using LEAST_LOADED strategy
[LoadBalancing] LEAST_LOADED strategy selected officer John Doe (ID: 42, current load: 3)
[LoadBalancing] Successfully auto-assigned request 123 to officer 42
[Workflow] Triggering auto-assignment for request 123 at status PROCUREMENT_REVIEW
```

**Disabled**:
```
[LoadBalancing] Load balancing disabled, skipping auto-assignment for request 123
```

**Errors**:
```
[LoadBalancing] No procurement officers available
[LoadBalancing] No officer selected for request 123
[LoadBalancing] Failed to auto-assign request 123: Error: ...
```

### Database Queries

**Check Settings**:
```sql
SELECT * FROM LoadBalancingSettings;
```

**View Assignments**:
```sql
SELECT 
  r.id,
  r.title,
  r.status,
  r.currentAssigneeId,
  u.name AS assignedTo
FROM Request r
LEFT JOIN User u ON r.currentAssigneeId = u.id
WHERE r.status = 'PROCUREMENT_REVIEW'
ORDER BY r.updatedAt DESC;
```

**Workload Distribution**:
```sql
SELECT 
  u.id,
  u.name,
  COUNT(r.id) AS activeRequests
FROM User u
LEFT JOIN Request r ON u.id = r.currentAssigneeId AND r.status = 'PROCUREMENT_REVIEW'
WHERE u.role = 'PROCUREMENT'
GROUP BY u.id, u.name
ORDER BY activeRequests ASC;
```

**Audit Trail**:
```sql
SELECT 
  rsh.requestId,
  rsh.fromStatus,
  rsh.toStatus,
  rsh.comment,
  rsh.createdAt,
  u.name AS changedBy
FROM RequestStatusHistory rsh
JOIN User u ON rsh.changedById = u.id
WHERE rsh.comment LIKE '%Auto-assigned%'
ORDER BY rsh.createdAt DESC
LIMIT 20;
```

## 🐛 Troubleshooting

### Issue: Auto-assignment not triggering

**Diagnostics**:
1. Check settings are enabled:
   ```sql
   SELECT * FROM LoadBalancingSettings;
   ```
2. Verify `autoAssignOnApproval` is `true`
3. Check request status is moving to `PROCUREMENT_REVIEW`
4. Review backend logs for `[LoadBalancing]` entries

**Fix**:
- Enable load balancing via UI
- Ensure PROCUREMENT_MANAGER has updated settings
- Restart backend: `pm2 restart pms-backend`

### Issue: Officers not in rotation

**Diagnostics**:
```sql
SELECT id, name, role FROM User WHERE role = 'PROCUREMENT';
```

**Fix**:
- Ensure users have `role = 'PROCUREMENT'`
- Verify users are active (not deleted/disabled)
- Check `getProcurementOfficersWithWorkload()` query

### Issue: ROUND_ROBIN stuck

**Diagnostics**:
```sql
SELECT roundRobinCounter FROM LoadBalancingSettings;
-- Check if counter is incrementing
```

**Fix**:
```sql
-- Reset counter
UPDATE LoadBalancingSettings SET roundRobinCounter = 0;
```

### Issue: LEAST_LOADED always selects same officer

**Diagnostics**:
```sql
-- Check active workload distribution
SELECT 
  u.id,
  u.name,
  COUNT(r.id) AS activeCount
FROM User u
LEFT JOIN Request r ON u.id = r.currentAssigneeId AND r.status = 'PROCUREMENT_REVIEW'
WHERE u.role = 'PROCUREMENT'
GROUP BY u.id, u.name;
```

**Fix**:
- Verify officers are actually completing/closing requests
- Check if one officer has significantly fewer requests
- Consider switching to ROUND_ROBIN for more balanced distribution

## 📊 Performance

**Query Complexity**:
- LEAST_LOADED: O(n) where n = number of officers (requires count query per officer)
- ROUND_ROBIN: O(1) (simple counter increment)
- RANDOM: O(1) (immediate selection)

**Database Impact**:
- 1 additional query per auto-assignment (settings fetch)
- 1-3 queries for officer selection (strategy-dependent)
- 2 writes per assignment (request update + history entry)
- 1 write per round-robin assignment (counter increment)

**Recommendations**:
- For high-volume systems: Use ROUND_ROBIN or RANDOM
- For fairness priority: Use LEAST_LOADED
- Monitor query performance if officer count exceeds 50

## 🔒 Security

**Access Control**:
- Only `PROCUREMENT_MANAGER` role can modify settings
- Settings are read-only for other roles
- JWT authentication required for all endpoints

**Audit Trail**:
- All settings changes recorded with `updatedBy` user ID
- Assignment history tracked in `RequestStatusHistory`
- Timestamps preserved for all operations

**Validation**:
- Strategy enum restricted to defined values
- Boolean fields validated
- User ID verified against JWT token

## 📝 Future Enhancements

**Potential Features**:
1. **Weighted Distribution**: Assign based on officer capacity/experience
2. **Skill-Based Routing**: Match requests to officers by category expertise
3. **Time-Based Balancing**: Consider officer availability/schedule
4. **Load Limits**: Prevent assignment if officer exceeds threshold
5. **Manual Override**: Allow managers to reassign auto-assigned requests
6. **Analytics Dashboard**: Visualize distribution metrics and efficiency

## 📚 Related Documentation

- [Procurement Officer Dashboard](./PROCUREMENT_OFFICER_DASHBOARD.md)
- [Backend Middleware Guide](./BACKEND_MIDDLEWARE_GUIDE.md)
- [Quick Start Guide](./QUICK_START.md)
- [Testing Checklist](./TESTING_CHECKLIST.md)

## 🆘 Support

**Contact**:
- Technical Lead: [email]
- Project Manager: [email]

**Resources**:
- GitHub Issues: [repo]/issues
- Internal Wiki: [link]
- Deployment Logs: `pm2 logs pms-backend`
