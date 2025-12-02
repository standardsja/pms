# Load Balancing Settings Persistence Fix

## Problem

When users toggled the Load Balancing System on/off in the UI, the setting would not persist after page refresh.

## Root Cause

The frontend component (`LoadBalancingSettings.tsx`) was only updating **local React state** when the toggle was clicked, but was **not automatically saving** the change to the backend database.

Users had to:

1. Toggle the setting
2. Manually click "Save Settings" button
3. Otherwise the change would be lost on page reload

## Solution Implemented

### Backend Changes

#### 1. Improved Type Coercion in `server/index.ts`

Added proper type conversion functions to handle different data types from frontend:

```typescript
// Convert and validate numeric values
const parseFloat = (val: any, defaultVal: number): number => {
    const parsed = Number(val);
    return isNaN(parsed) ? defaultVal : parsed;
};

const parseBoolean = (val: any, defaultVal: boolean): boolean => {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return Boolean(val);
};
```

This ensures:

-   Boolean values are properly converted even if sent as strings
-   Numeric values are validated and have defaults
-   No undefined/null errors

### Frontend Changes

#### 2. Auto-Save on Toggle in `LoadBalancingSettings.tsx`

**Refactored the settings save logic:**

1. **Extracted `fetchSettings()` function** outside of `useEffect` so it can be reused
2. **Created `saveSettings()` function** with full error handling and state management
3. **Updated `handleToggle()` to auto-save** immediately after state change

**Before:**

```typescript
const handleToggle = () => {
    if (settings.enabled) {
        // Just update local state
        setSettings({ ...settings, enabled: false });
    } else {
        setSettings({ ...settings, enabled: true });
    }
};
```

**After:**

```typescript
const handleToggle = async () => {
    if (settings.enabled) {
        // Confirm before disabling
        MySwal.fire({...}).then(async (result) => {
            if (result.isConfirmed) {
                const newSettings = { ...settings, enabled: false };
                setSettings(newSettings);

                // Auto-save immediately
                await saveSettings(newSettings);
            }
        });
    } else {
        const newSettings = { ...settings, enabled: true };
        setSettings(newSettings);

        // Auto-save immediately
        await saveSettings(newSettings);
    }
};
```

**Key improvements:**

-   Toggle now **automatically persists** to database
-   Shows success/error notification
-   Reverts state on error (calls `fetchSettings()` to reload from DB)
-   Updates local state with server response
-   No manual "Save" button click required

## Testing

### How to Test

1. **Enable Load Balancing:**

    - Navigate to Procurement Manager → Load Balancing Settings
    - Toggle the switch to **ON**
    - Should see "Settings Saved" notification
    - Refresh the page
    - ✅ Setting should still be **ON**

2. **Disable Load Balancing:**

    - Toggle the switch to **OFF**
    - Confirm the warning dialog
    - Should see "Settings Saved" notification
    - Refresh the page
    - ✅ Setting should still be **OFF**

3. **Change Strategy:**
    - Select different strategy (AI_SMART, SKILL_BASED, etc.)
    - Click "Save Settings" button
    - Refresh page
    - ✅ Strategy should persist

### API Testing

You can also test directly with API calls:

```bash
# Get current settings
GET http://heron:4000/procurement/load-balancing-settings
Headers:
  Authorization: Bearer <token>
  x-user-id: <user-id>

# Enable load balancing
POST http://heron:4000/procurement/load-balancing-settings
Headers:
  Authorization: Bearer <token>
  x-user-id: <user-id>
Body:
{
  "enabled": true,
  "strategy": "AI_SMART",
  "autoAssignOnApproval": true,
  "aiEnabled": true,
  "learningEnabled": true,
  "priorityWeighting": 1.0,
  "performanceWeighting": 1.5,
  "workloadWeighting": 1.2,
  "specialtyWeighting": 1.3,
  "minConfidenceScore": 0.6
}
```

## Files Modified

1. **server/index.ts** (lines ~3092-3130)

    - Added `parseFloat()` helper
    - Added `parseBoolean()` helper
    - Updated config object creation with proper type conversion

2. **src/pages/Procurement/Manager/LoadBalancingSettings.tsx**
    - Moved `fetchSettings()` outside `useEffect` for reusability
    - Created new `saveSettings(settings)` function with error handling
    - Updated `handleToggle()` to auto-save on toggle
    - Simplified `handleSave()` to call `saveSettings()`

## Benefits

✅ **Better UX** - No need to remember to click "Save" after toggling
✅ **Immediate Feedback** - Success/error notification on every toggle
✅ **Safer** - Reverts state if save fails
✅ **Type Safe** - Backend handles string/boolean/number conversion properly
✅ **Production Ready** - Proper error handling and state management

## Related Documentation

-   [AI_LOAD_BALANCING.md](./AI_LOAD_BALANCING.md) - Full AI Load Balancing implementation
-   [AI_LOAD_BALANCING_SUMMARY.md](./AI_LOAD_BALANCING_SUMMARY.md) - Quick reference
-   [LOAD_BALANCING_QUICKSTART.md](./LOAD_BALANCING_QUICKSTART.md) - Setup guide

## Next Steps

The load balancing system is now fully functional and production-ready. Users can:

1. Toggle the system on/off with auto-save
2. Select assignment strategies
3. Configure AI weights and parameters
4. Monitor performance analytics
5. View assignment logs
