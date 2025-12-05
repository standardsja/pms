# Supplier PO/Contract Award Notifications

## Overview

Suppliers can now receive email notifications when they are awarded Purchase Orders (POs) or Contracts. This feature ensures suppliers are immediately informed of awards so they can prepare for timely delivery.

---

## Features Implemented

### 1. Database Changes

**File:** `server/prisma/schema.prisma`

#### Added Notification Types

```prisma
enum NotificationType {
  MENTION
  STAGE_CHANGED
  IDEA_APPROVED
  THRESHOLD_EXCEEDED
  EVALUATION_VERIFIED
  EVALUATION_RETURNED
  PO_AWARDED           // NEW
  CONTRACT_AWARDED     // NEW
}
```

#### Enhanced Vendor Model

```prisma
model Vendor {
  id        Int       @id @default(autoincrement())
  name      String
  contact   Json?
  email     String?   // NEW - Primary email for notifications
  address   String?
  website   String?
  createdAt DateTime  @default(now())
  requests  Request[]
}
```

**Note:** The `email` field allows suppliers to receive notifications even if they don't have user accounts in the system.

---

### 2. Notification Service

**File:** `server/services/notificationService.ts`

#### New Functions

##### `sendPOAwardNotification()`

Sends email notification when a Purchase Order is awarded to a supplier.

**Parameters:**

```typescript
{
  poNumber: string;          // PO-YYYYMMDD-###
  poId: number;
  supplierName: string;
  supplierEmail?: string;    // Optional - notifications only sent if provided
  description: string;
  amount: number;
  currency: string;
  deliveryDate?: Date;
  createdBy: string;
  terms?: string;
}
```

**Email Content:**

-   PO Number
-   Description
-   Amount and Currency
-   Expected Delivery Date
-   Issuing Officer
-   Terms & Conditions
-   Link to system (future enhancement)

##### `sendContractAwardNotification()`

Sends email notification when a Contract is awarded to a supplier.

**Parameters:**

```typescript
{
  contractNumber: string;
  contractId: number;
  supplierName: string;
  supplierEmail?: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
}
```

---

### 3. Purchase Orders Integration

**File:** `server/routes/purchaseOrders.ts`

#### Notification Triggers

**1. When PO is Created (POST /api/purchase-orders)**

-   Accepts optional `supplierEmail` in request body
-   Sends notification immediately after PO creation
-   PO created in "Draft" status

**2. When PO is Approved (PATCH /api/purchase-orders/:id/status)**

-   Automatically looks up supplier email from:
    1. Request body (`supplierEmail` parameter)
    2. Vendor record by supplier name
    3. Vendor contact JSON (`contact.email`)
-   Sends notification when status changes to "Approved"
-   Includes approver name and approval timestamp

**Example Request:**

```json
POST /api/purchase-orders
{
  "supplierName": "ABC Corporation",
  "supplierEmail": "john@abccorp.com",  // Optional but recommended
  "description": "Office Supplies Q4 2025",
  "amount": 125000,
  "currency": "JMD",
  "deliveryDate": "2025-12-31",
  "items": [...],
  "terms": "Net 30 days payment terms"
}
```

---

### 4. Suppliers Management

**File:** `server/routes/suppliers.ts`

Now supports the `email` field for supplier records:

**Create Supplier:**

```json
POST /api/suppliers
{
  "name": "ABC Corporation",
  "email": "john@abccorp.com",  // NEW - Primary contact email
  "contact": {
    "name": "John Smith",
    "email": "john@abccorp.com",
    "phone": "+1-555-0101",
    "category": "Office Supplies"
  },
  "address": "123 Business St, City",
  "website": "https://abccorp.com"
}
```

**Update Supplier:**

```json
PATCH /api/suppliers/:id
{
  "email": "procurement@abccorp.com"  // Update notification email
}
```

---

## Email Integration

### Current Implementation

-   Notifications are **logged to console** for development/testing
-   Email content is formatted and ready for integration
-   No emails are sent yet (infrastructure pending)

### Production Setup Required

To enable actual email delivery, integrate with:

**Option 1: SendGrid**

```javascript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
    to: data.supplierEmail,
    from: 'procurement@yourdomain.com',
    subject: `Purchase Order Awarded - ${data.poNumber}`,
    text: emailContent.body,
    html: `<pre>${emailContent.body}</pre>`,
});
```

**Option 2: AWS SES**

```javascript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const client = new SESClient({ region: 'us-east-1' });
await client.send(
    new SendEmailCommand({
        Source: 'procurement@yourdomain.com',
        Destination: { ToAddresses: [data.supplierEmail] },
        Message: {
            Subject: { Data: `PO Awarded - ${data.poNumber}` },
            Body: { Text: { Data: emailContent.body } },
        },
    })
);
```

**Option 3: Nodemailer (SMTP)**

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

await transporter.sendMail({
    from: 'procurement@yourdomain.com',
    to: data.supplierEmail,
    subject: `Purchase Order Awarded - ${data.poNumber}`,
    text: emailContent.body,
});
```

---

## Testing

### 1. Schema Migration

```bash
cd server
npx prisma db push --accept-data-loss
npx prisma generate
```

### 2. Create Supplier with Email

```bash
curl -X POST http://heron:4000/api/suppliers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-user-id: 15" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Supplier Inc",
    "email": "supplier@test.com",
    "contact": {"name": "John Doe", "category": "General"}
  }'
```

### 3. Create PO with Notification

```bash
curl -X POST http://heron:4000/api/purchase-orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-user-id: 15" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierName": "Test Supplier Inc",
    "supplierEmail": "supplier@test.com",
    "description": "Test Order",
    "amount": 10000,
    "currency": "JMD"
  }'
```

### 4. Check Console Logs

Look for:

```
[PO Award] Sending PO award notification to Test Supplier Inc (supplier@test.com)
[PO Award Email]: {
  "to": "supplier@test.com",
  "subject": "Purchase Order Awarded - PO-20251203-001",
  ...
}
[PO Award] Notification sent successfully to Test Supplier Inc
```

---

## Security Considerations

1. **Email Validation**

    - Validate email format before storing
    - Prevent email injection attacks
    - Sanitize all user inputs

2. **Rate Limiting**

    - Prevent notification spam
    - Implement cooldown periods
    - Track failed delivery attempts

3. **Privacy**

    - Don't log sensitive PO details in production
    - Encrypt email addresses at rest (optional)
    - Comply with data protection regulations

4. **Authentication**
    - Only authorized procurement users can trigger notifications
    - Suppliers cannot trigger their own notifications
    - Audit all notification sends

---

## Future Enhancements

### Short-term

-   [ ] Add email templates with HTML formatting
-   [ ] Include PDF attachment of PO
-   [ ] Add "View in System" button/link
-   [ ] Support multiple contact emails per supplier
-   [ ] Add SMS notifications for urgent POs

### Medium-term

-   [ ] Supplier portal for PO acceptance/rejection
-   [ ] Delivery tracking integration
-   [ ] Automated reminders for pending deliveries
-   [ ] Notification preferences per supplier
-   [ ] Email delivery status tracking

### Long-term

-   [ ] Multi-language support
-   [ ] Integration with supplier ERPs
-   [ ] Electronic signatures for PO acceptance
-   [ ] Real-time chat with procurement team
-   [ ] Analytics on supplier response times

---

## Troubleshooting

### Notifications Not Sending

**Issue:** No log output when creating PO

-   **Check:** Is `supplierEmail` provided in request body?
-   **Fix:** Add email to supplier record or pass in request

**Issue:** TypeScript errors about `email` field

-   **Check:** Has Prisma client been regenerated?
-   **Fix:** Run `npx prisma generate` after schema changes

**Issue:** Supplier email not found automatically

-   **Check:** Does vendor name exactly match?
-   **Check:** Is email in `vendor.email` or `vendor.contact.email`?
-   **Fix:** Update supplier record with email field

### Email Integration Issues

**Issue:** Emails not delivered in production

-   **Check:** Email service credentials configured?
-   **Check:** Sender domain verified?
-   **Check:** Check spam folder
-   **Fix:** Review email service logs and bounce reports

---

## Support

For questions or issues:

1. Check server console logs for notification details
2. Verify supplier email is correctly stored
3. Test with your own email first
4. Review email service provider dashboard
5. Check firewall/network restrictions

---

## Changelog

### Version 1.0 (December 3, 2025)

-   ✅ Added `PO_AWARDED` and `CONTRACT_AWARDED` notification types
-   ✅ Added `email` field to Vendor model
-   ✅ Implemented `sendPOAwardNotification()` service
-   ✅ Implemented `sendContractAwardNotification()` service
-   ✅ Integrated notifications into PO creation workflow
-   ✅ Integrated notifications into PO approval workflow
-   ✅ Updated suppliers API to support email field
-   ✅ Automatic supplier email lookup from vendor records
-   ⏳ Email delivery infrastructure (pending production setup)
