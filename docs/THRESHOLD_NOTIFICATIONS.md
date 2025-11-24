# Procurement Threshold Notifications

## Overview

The procurement threshold notification system alerts procurement officers when requests arrive that require Executive Director approval due to exceeding predefined monetary thresholds.

## Implementation

### Frontend Components

#### 1. Threshold Detection Utility (`src/utils/thresholdUtils.ts`)

**Core Functions:**

-   `checkExecutiveThreshold(amount, procurementTypes, currency)` - Determines if a request requires executive approval
-   `getThresholdBadge(alert)` - Generates display information for threshold alerts
-   `shouldShowThresholdNotification(userRoles)` - Checks if user should see notifications

**Threshold Rules:**

-   **Goods/Services:** ≥ JMD $3,000,000 requires Executive Director approval
-   **Works/Construction:** ≥ JMD $5,000,000 requires Executive Director approval

**Supported Procurement Types:**

-   **Goods/Services:** `['goods', 'services', 'consulting service', 'non-consulting service', 'supplies', 'equipment']`
-   **Works:** `['works', 'construction', 'infrastructure', 'building']`

#### 2. Request List Integration (`src/pages/Procurement/Requests/Requests.tsx`)

**Visual Notifications:**

1. **Summary Banner** - Shows count of high-value requests requiring executive approval
2. **Row-Level Badges** - Individual request indicators with warning styling

**User Experience:**

-   Only visible to users with procurement-related roles
-   Orange warning styling for immediate visual recognition
-   Clear messaging about Executive Director approval requirements

### Backend Integration

#### 1. Request Endpoint Enhancement (`server/index.ts`)

**Added Fields:**

-   `totalEstimated` - Request total amount
-   `procurementType` - Array of procurement categories
-   `currency` - Request currency (defaults to JMD)

**Database Schema:**

```prisma
model Request {
  totalEstimated   Decimal?  @db.Decimal(12, 2)
  currency         String?   @default("USD")
  procurementType  Json?     // Array of procurement types
  // ... other fields
}
```

#### 2. Data Adaptation (`src/utils/requestUtils.ts`)

**Enhanced `adaptRequestsResponse` Function:**

-   Handles procurement type arrays from backend JSON field
-   Provides fallback currency defaulting to JMD
-   Maintains backward compatibility with existing data structures

## User Roles & Permissions

**Notification Recipients:**

-   `PROCUREMENT_OFFICER`
-   `PROCUREMENT_MANAGER`
-   `PROCUREMENT`
-   `MANAGER`
-   `ADMIN`
-   Any role containing "PROCUREMENT"

**Non-Recipients:**

-   `EMPLOYEE`
-   `DEPARTMENT_HEAD`
-   `EXECUTIVE_DIRECTOR`
-   Other non-procurement roles

## Testing

**Test Coverage:** `src/utils/__tests__/thresholdUtils.test.ts`

**Test Categories:**

1. **Threshold Detection** - Verifies correct threshold calculations for different amounts and types
2. **Badge Generation** - Confirms proper visual indicator creation
3. **Role Permissions** - Validates notification visibility rules
4. **Edge Cases** - Handles invalid inputs, empty arrays, mixed types

**Example Test Cases:**

```typescript
// Works over 5M JMD requires executive approval
checkExecutiveThreshold(5500000, ['works'], 'JMD'); // isRequired: true

// Goods over 3M JMD requires executive approval
checkExecutiveThreshold(3200000, ['goods'], 'JMD'); // isRequired: true

// Under threshold amounts do not require approval
checkExecutiveThreshold(2800000, ['goods'], 'JMD'); // isRequired: false
```

## Implementation Notes

### Design Decisions

1. **Frontend-First Approach** - Threshold logic implemented in frontend for immediate user feedback without requiring backend workflow changes
2. **Role-Based Visibility** - Notifications only shown to procurement staff to reduce noise for other users
3. **Visual Hierarchy** - Orange warning styling provides clear priority indication
4. **Flexible Detection** - Supports multiple procurement types and currencies for future extensibility

### Performance Considerations

1. **Memoized Calculations** - Threshold calculations cached using React useMemo
2. **Minimal Re-renders** - Badge generation only triggers when request data changes
3. **Efficient Filtering** - User role checks performed once per component mount

### Backward Compatibility

1. **Optional Fields** - New database fields are nullable to support existing requests
2. **Graceful Degradation** - System works with missing procurement type data
3. **Default Fallbacks** - Sensible defaults provided for currency and amounts

## Future Enhancements

### Potential Improvements

1. **Real-Time Updates** - WebSocket integration for live threshold alerts
2. **Email Notifications** - Automated alerts to procurement officers
3. **Audit Trail** - Log threshold detections for compliance reporting
4. **Configurable Thresholds** - Admin interface for updating threshold amounts
5. **Multi-Currency Support** - Automatic conversion for international requests

### Integration Opportunities

1. **Workflow Engine** - Automatic routing to Executive Director for high-value requests
2. **Analytics Dashboard** - Trends and statistics on threshold-exceeding requests
3. **Mobile Notifications** - Push alerts for procurement staff
4. **Vendor Portal** - Threshold visibility for supplier submissions

## Error Handling

**Frontend Resilience:**

-   Graceful handling of missing procurement type data
-   Safe parsing of numeric amounts with fallbacks
-   Error boundaries prevent notification failures from breaking page

**Backend Safety:**

-   Optional field handling prevents database errors
-   JSON field validation for procurement type arrays
-   Decimal precision maintained for financial calculations

## Compliance & Governance

**Audit Requirements:**

-   All threshold detections can be traced through request data
-   Historical accuracy maintained through database versioning
-   User role verification ensures proper notification delivery

**Business Rules:**

-   Threshold amounts align with organizational procurement policies
-   Executive approval workflow integration points clearly defined
-   Notification timing ensures timely decision-making
