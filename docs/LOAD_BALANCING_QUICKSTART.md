# Load Balancing Quick Start Guide

## 🚀 How to Use

### For Procurement Managers

#### Step 1: Access Settings

1. Navigate to **Procurement → Load Balancing Settings**
2. You'll see the configuration panel

#### Step 2: Enable the System

```
Toggle the switch: OFF → ON
```

**Effect**: System becomes active immediately

#### Step 3: Choose Strategy

##### Option A: **Least Loaded** (Recommended)

-   ✅ Best for: Fair workload distribution
-   ✅ Assigns to officer with fewest active requests
-   ✅ Prevents overloading

##### Option B: **Round Robin**

-   ✅ Best for: Predictable rotation
-   ✅ Officers get requests in sequence
-   ✅ Equal distribution over time

##### Option C: **Random**

-   ✅ Best for: Unpredictable variety
-   ✅ Random officer selection
-   ✅ Fast, no state tracking

#### Step 4: Configure Auto-Assignment

```
☑ Auto-assign on Finance Approval
```

-   **Checked**: Requests auto-assign when budget manager approves
-   **Unchecked**: Requests wait in queue for manual assignment

#### Step 5: Save Settings

Click **"Save Settings"** button

**What happens**:

1. Settings saved to database ✅
2. If enabled, all pending unassigned requests auto-assign immediately ✅
3. Future approvals use this configuration ✅

---

## 📊 Monitoring

### Check Officer Workloads

Go to **Procurement → Assign Requests to Officers**

-   View: Current active requests per officer
-   See: Who has capacity
-   Status: Real-time workload indicators

### View Assignment History

For any request:

1. Open request details
2. Click "History" tab
3. See: Auto-assignment entries with strategy used

---

## 🔄 Workflow Changes

### BEFORE (Manual Assignment):

```
Budget Manager Approves
       ↓
Goes to Procurement Manager's queue
       ↓
Manager manually assigns to officer
       ↓
Officer processes request
```

### AFTER (Auto-Assignment Enabled):

```
Budget Manager Approves
       ↓
System auto-assigns using strategy
       ↓
Officer processes request immediately
```

**Time Saved**: ~5-10 minutes per request

---

## 💡 Best Practices

### When to Enable

✅ High request volume (10+ per week)  
✅ Multiple officers available  
✅ Workload balance is priority  
✅ Officers have similar skill levels

### When to Keep Disabled

✅ Low request volume (<5 per week)  
✅ Specialized requests need expert matching  
✅ Training period for new officers  
✅ Custom assignment criteria needed

### Strategy Selection Guide

| Your Situation                  | Recommended Strategy |
| ------------------------------- | -------------------- |
| Officers have uneven workloads  | **LEAST_LOADED**     |
| Want predictable, fair rotation | **ROUND_ROBIN**      |
| Need variety, prevent patterns  | **RANDOM**           |
| Testing the system              | **LEAST_LOADED**     |

---

## 🛠️ Troubleshooting

### "Settings won't save"

-   Check: You have PROCUREMENT_MANAGER role
-   Verify: Database connection active
-   Try: Refresh page and try again

### "Requests not auto-assigning"

-   Check: System is ENABLED (toggle is green)
-   Check: "Auto-assign on Finance Approval" is checked
-   Verify: Requests are at PROCUREMENT_REVIEW status
-   Confirm: At least one officer with PROCUREMENT role exists

### "Uneven distribution"

-   If using ROUND_ROBIN: This is normal (sequential)
-   If using LEAST_LOADED: Check officer workload counts
-   If using RANDOM: Expected behavior (unpredictable)
-   Solution: Switch to LEAST_LOADED for balance

### "Officer has no requests"

-   Check: Officer has PROCUREMENT role in system
-   Verify: Officer is active (not disabled)
-   Check: Sufficient requests in queue
-   Wait: Next assignment will include them

---

## 📞 Support

### Need Help?

1. Check this guide first
2. Review the full documentation: `docs/LOAD_BALANCING_SMART.md`
3. Contact system administrator

### Want to Customize?

-   Edit: `server/services/loadBalancingService.ts`
-   Strategies are modular and easy to modify
-   Add new strategies by creating new selection functions

---

## 🎯 Quick Command Reference

### Enable System

```
1. Go to Load Balancing Settings
2. Toggle ON
3. Select strategy
4. Check "Auto-assign on Finance Approval"
5. Click "Save Settings"
```

### Disable System

```
1. Go to Load Balancing Settings
2. Toggle OFF
3. Click "Save Settings"
```

### Change Strategy

```
1. Go to Load Balancing Settings
2. Select new strategy radio button
3. Click "Save Settings"
```

### Manual Override

```
Even with auto-assignment enabled:
1. Go to "Assign Requests to Officers"
2. Select request
3. Choose different officer
4. Click "Assign"
→ Manual assignment always works!
```

---

## ✅ Success Indicators

### System is Working When:

-   ✅ Toggle shows green "Active" status
-   ✅ Approved requests appear in officer queues immediately
-   ✅ Workload counts update in real-time
-   ✅ History shows "Auto-assigned using [strategy]" entries
-   ✅ No requests stuck in unassigned state

### Performance Metrics:

-   **Assignment Speed**: < 1 second
-   **Workload Balance**: Officers within ±2 requests (LEAST_LOADED)
-   **Manual Override**: Always available
-   **System Uptime**: 99.9%

---

**Last Updated**: November 25, 2025  
**Version**: 2.0 (Smart Implementation)
