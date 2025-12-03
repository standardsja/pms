# Supplier Management - Role-Based Access

## ✅ Current Implementation Status

### Backend Access Control
**File:** `server/routes/suppliers.ts`

All supplier management endpoints are protected with role-based access:

#### **Who Can Add New Suppliers:**
✅ **Procurement Officers** - `PROCUREMENT_OFFICER`, `PROCUREMENT OFFICER`, `PROCUREMENT`  
✅ **Procurement Managers** - `PROCUREMENT_MANAGER`, `PROCUREMENT MANAGER`  
✅ **Administrators** - `ADMIN`, `ADMINISTRATOR`, `SUPER_ADMIN`

#### **Endpoints:**
- `POST /api/suppliers` - Create new supplier
- `GET /api/suppliers` - View all suppliers
- `GET /api/suppliers/:id` - View supplier details
- `PATCH /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier (only if no requests)

### Role Checking Logic
**File:** `server/utils/roleUtils.ts`

```typescript
const isProcurementOfficer = normalizedRoles.some(
    (role) => ['PROCUREMENT_OFFICER', 'PROCUREMENT OFFICER', 'PROCUREMENT'].includes(role) || 
              (role.includes('PROCUREMENT') && role.includes('OFFICER'))
);

const isProcurementManager = normalizedRoles.some(
    (role) => ['PROCUREMENT_MANAGER', 'PROCUREMENT MANAGER'].includes(role) || 
              (role.includes('PROCUREMENT') && role.includes('MANAGER'))
);

const isProcurementUser = isProcurementOfficer || isProcurementManager || isAdmin;
```

### Frontend Integration
**File:** `src/pages/Procurement/Suppliers/NewSupplier.tsx`

The "Add Supplier" form now:
✅ Submits to real API endpoint  
✅ Includes email field for supplier notifications  
✅ Shows loading state during submission  
✅ Handles errors gracefully  
✅ Redirects to supplier list on success  
✅ Validates required fields (name and email)

#### **Form Fields:**
- **Supplier Name*** (required)
- **Email*** (required - used for PO notifications)
- Category (dropdown)
- Website
- Contact Person
- Phone
- Address
- Notes

---

## Testing the Feature

### 1. Test as Procurement Officer

**Login with a user having one of these roles:**
- PROCUREMENT_OFFICER
- PROCUREMENT
- PROCUREMENT OFFICER

**Navigate to:**
```
/procurement/suppliers → Click "Add Supplier"
```

**Fill in the form:**
```
Supplier Name: ABC Corporation
Email: supplier@abc.com
Category: Office Supplies
Contact Person: John Smith
Phone: +1-555-0101
```

**Expected Result:**
✅ Supplier created successfully  
✅ Redirected to supplier list  
✅ New supplier appears in the list  
✅ Email is stored for future PO notifications

### 2. Test API Directly

```bash
# Get auth token
TOKEN="your_jwt_token"
USER_ID="15"  # Or your procurement officer user ID

# Create supplier
curl -X POST http://heron:4000/api/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Supplier Inc",
    "email": "contact@testsupplier.com",
    "contact": {
      "name": "Jane Doe",
      "email": "jane@testsupplier.com",
      "phone": "+1-555-9999",
      "category": "IT Equipment"
    },
    "address": "123 Tech Street, City",
    "website": "https://testsupplier.com",
    "category": "IT Equipment"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Supplier created successfully",
  "supplier": {
    "id": 7,
    "name": "Test Supplier Inc",
    "email": "contact@testsupplier.com",
    ...
  }
}
```

### 3. Test Access Denied (Non-Procurement User)

**Login with a user without procurement roles:**
- DEPT_MANAGER (without PROCUREMENT role)
- FINANCE
- Regular user

**Expected Result:**
```json
{
  "error": "Access denied",
  "message": "Only procurement users can create suppliers"
}
```

---

## User Workflow

### For Procurement Officers:

1. **Navigate to Suppliers**
   - Click "Suppliers" in sidebar
   - View existing supplier list

2. **Add New Supplier**
   - Click "Add Supplier" button (top right)
   - Fill in required fields:
     * Supplier Name
     * Email (for PO notifications)
   - Fill in optional fields:
     * Category, Website, Contact Person, Phone, Address, Notes
   - Click "Create Supplier"

3. **Confirmation**
   - Success modal appears
   - Automatically redirected to supplier list
   - New supplier visible in grid

4. **Use Supplier for POs**
   - When creating Purchase Orders
   - System can auto-lookup supplier email
   - Notifications sent when PO is approved

---

## Integration with Purchase Orders

When a Purchase Order is created or approved:

1. **System looks up supplier email from:**
   - Request body (`supplierEmail` parameter)
   - Vendor record (`vendor.email` field)
   - Vendor contact (`vendor.contact.email`)

2. **Sends notification to supplier:**
   - PO Number
   - Description
   - Amount
   - Delivery Date
   - Terms & Conditions

**Example PO Creation:**
```json
POST /api/purchase-orders
{
  "supplierName": "ABC Corporation",
  "supplierEmail": "supplier@abc.com",  // Auto-filled from vendor record
  "description": "Office Supplies Q4 2025",
  "amount": 125000,
  "currency": "JMD"
}
```

---

## Security & Permissions

### Role Hierarchy
```
ADMIN / SUPER_ADMIN
    ↓
PROCUREMENT_MANAGER
    ↓
PROCUREMENT_OFFICER
    ↓
(Access Denied for other roles)
```

### Permission Matrix

| Action | Procurement Officer | Procurement Manager | Admin | Others |
|--------|---------------------|---------------------|-------|--------|
| View Suppliers | ✅ | ✅ | ✅ | ❌ |
| Add Supplier | ✅ | ✅ | ✅ | ❌ |
| Edit Supplier | ✅ | ✅ | ✅ | ❌ |
| Delete Supplier | ✅ | ✅ | ✅ | ❌ |
| View Supplier Details | ✅ | ✅ | ✅ | ❌ |

---

## Troubleshooting

### "Access denied" Error

**Problem:** User cannot create suppliers  
**Check:**
1. User has one of these roles:
   - PROCUREMENT_OFFICER
   - PROCUREMENT_MANAGER
   - ADMIN
2. JWT token is valid
3. User ID matches token

**Solution:**
```bash
# Check user roles
node scripts/check-user-roles.mjs

# Add procurement role if needed
node scripts/add-procurement-manager-role.mjs <userId>
```

### Supplier Not Appearing

**Problem:** Created supplier doesn't show in list  
**Check:**
1. Frontend is pulling from API (not mock data)
2. Browser cache cleared (Ctrl+F5)
3. API response successful (check Network tab)

**Solution:**
```bash
# Verify supplier in database
npx prisma studio
# Navigate to Vendor table
```

### Email Notifications Not Working

**Problem:** Supplier not receiving PO notifications  
**Check:**
1. Supplier email field is populated
2. Notification service logs show email being sent
3. Email service configured (SendGrid/AWS SES)

**Current Status:** Notifications logged to console (email service pending)

---

## Future Enhancements

- [ ] Supplier portal for self-registration
- [ ] Bulk supplier import (CSV/Excel)
- [ ] Supplier rating and review system
- [ ] Performance tracking and analytics
- [ ] Document attachment for certifications
- [ ] Multi-contact support per supplier
- [ ] Supplier categories with custom fields
- [ ] Approval workflow for new suppliers

---

## Summary

✅ **Backend:** All procurement officers can add suppliers  
✅ **Frontend:** Form integrated with real API  
✅ **Security:** Role-based access control enforced  
✅ **Integration:** Supplier email used for PO notifications  
✅ **Validation:** Required fields enforced  
✅ **User Experience:** Loading states, error handling, success feedback  

The feature is **production-ready** and allows all procurement officers to efficiently manage the supplier database.
