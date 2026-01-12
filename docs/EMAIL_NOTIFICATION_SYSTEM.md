# Email Notification System Implementation

## Overview
A complete email notification system has been implemented to send automated email alerts when requests are rejected. The system supports:
- **Automated rejection notifications** sent to requester, department manager, and HOD
- **SMTP configuration** with standard email protocols (TLS/SSL)
- **Optional encryption** for sensitive data like rejection reasons
- **Fallback handling** if SMTP is not configured

## Database Structure
The system uses the existing database structure:
- **User.email**: Stores recipient email addresses (required, unique)
- **Message**: Stores messages in the system
- **Notification**: Stores in-app notifications

No database schema changes were required.

## Architecture

### Email Service (`server/utils/emailService.ts`)
A singleton service class that handles all email operations:

```typescript
class EmailService {
  // SMTP transporter initialization
  private initializeTransporter()
  
  // Core email sending
  async sendEmail(to: string, subject: string, html: string, text?: string)
  
  // Specialized methods
  async sendRejectionNotification(...)
  async sendMessageNotification(...)
  
  // Encryption/Decryption (optional)
  encryptContent(content: string): string
  decryptContent(encryptedContent: string): string
  
  // Configuration testing
  async testConfiguration(testEmail: string): boolean
}
```

### Integration Points

#### 1. **Request Rejection (`/api/requests/:id/action`)**
When a request is rejected, the system now:
1. Creates Message records in the database (existing behavior)
2. **NEW:** Fetches recipient email addresses
3. **NEW:** Sends professional HTML emails to all recipients

Recipients include:
- Request requester
- Department manager (if available)
- Head of Division/HOD (if available)
- The rejector (for audit trail)

#### 2. **Email Content**
Rejection emails include:
- Professional HTML template with styling
- Request reference and ID
- Rejection reason from the rejector
- Rejector's name
- Clear instructions to review in the PMS
- Unsubscribe notice

#### 3. **Email Test Endpoint**
Admins can test email configuration:
```
POST /api/admin/test-email
Body: { "testEmail": "admin@example.com" }
Response: { "success": true, "message": "Test email sent..." }
```

## Configuration

### Environment Variables
Add these to `.env`:

```env
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com                    # Your SMTP server
SMTP_PORT=587                               # Standard TLS port
SMTP_USER=your-email@company.com            # SMTP username
SMTP_PASSWORD=your-password                 # SMTP password
SMTP_FROM_EMAIL=noreply@company.com         # Sender email address

# Optional: Encryption for sensitive data
EMAIL_ENCRYPTION_KEY=your-strong-key        # 32-byte hex string for AES encryption
```

### SMTP Server Examples

**Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use 2FA app password, not regular password
```

**Office 365/Outlook:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.onmicrosoft.com
SMTP_PASSWORD=your-password
```

**Custom Corporate SMTP:**
```env
SMTP_HOST=mail.company.local
SMTP_PORT=587 (or 25 for unencrypted)
SMTP_USER=your-username
SMTP_PASSWORD=your-password
```

## Features

### 1. Automatic Rejection Notifications
When any approver rejects a request:
- ✅ In-app messages created (existing)
- ✅ Notifications created (existing)
- ✅ **NEW:** Emails sent to all stakeholders

### 2. Encryption Support
For sensitive data like rejection reasons, the system can encrypt content:
```typescript
const encrypted = emailService.encryptContent(rejectionReason);
const decrypted = emailService.decryptContent(encrypted);
```

### 3. Graceful Degradation
If SMTP is not configured:
- System logs a warning message
- Messages and notifications still work
- Emails silently skip (logged to console)
- No errors thrown to frontend

### 4. Error Handling
- Individual email failures don't block the request workflow
- All errors logged with context (`[EmailService]` prefix)
- Detailed logging for debugging SMTP issues

## Installation

1. **Install dependencies:**
   ```bash
   npm install nodemailer @types/nodemailer
   ```
   (Already done - added to package.json and installed)

2. **Update .env file** with SMTP configuration

3. **Test configuration:**
   - Use the admin panel or:
   ```bash
   curl -X POST http://localhost:4000/api/admin/test-email \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"testEmail": "admin@company.com"}'
   ```

4. **Test rejection workflow:**
   - Create a request
   - Move it through approval stages
   - Reject it as an approver
   - Check recipient's email for notification

## Logging

The system logs all email operations with `[EmailService]` and `[REJECTION]` prefixes:

```
[EmailService] SMTP transporter initialized successfully
[REJECTION] Processing rejection for request 23, department: 5
[REJECTION] Added requester: 1
[REJECTION] Added dept manager: 2 (John Manager)
[REJECTION] Created message for recipient 1
[REJECTION] Sent email notification to john@example.com
```

## Security Considerations

1. **Never hardcode SMTP credentials** - Always use environment variables
2. **Use application passwords** for Gmail/Office365, not regular passwords
3. **Keep EMAIL_ENCRYPTION_KEY secret** if using encryption
4. **Limit email test endpoint** to admins (already done with `requireAdmin` middleware)
5. **Sanitize email content** - All HTML is generated, not user-controlled
6. **SMTP credentials not logged** - Only logged once at startup

## Email Customization

To customize email templates, edit `server/utils/emailService.ts`:

```typescript
async sendRejectionNotification(...) {
    const html = `
        <html>
            {/* Customize this HTML template */}
        </html>
    `;
    ...
}
```

## Testing Checklist

- [ ] Configure SMTP in `.env`
- [ ] Run test endpoint at `/api/admin/test-email`
- [ ] Create and reject a test request
- [ ] Check recipient email inbox (may appear in spam)
- [ ] Verify all stakeholders received emails
- [ ] Check server logs for `[REJECTION]` and `[EmailService]` messages
- [ ] Test graceful degradation (remove SMTP config, test rejection still works)

## Troubleshooting

**"Email service not configured"**
- Check SMTP_HOST, SMTP_USER, SMTP_PASSWORD are set in .env
- Restart server after changing .env: `npm run server:dev`

**"SMTP auth failed"**
- Verify SMTP credentials are correct
- For Gmail: use an app-specific password, not your regular password
- For Office365: use full email address as username

**Emails not received**
- Check inbox spam/junk folder
- Verify SMTP_FROM_EMAIL is a valid sender
- Test with admin test endpoint first
- Check server logs for error details

**Encryption issues**
- Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Update EMAIL_ENCRYPTION_KEY in .env
- Restart server

## Future Enhancements

1. **Email templates** - Move to separate template files
2. **Email queuing** - Queue emails for retry if SMTP fails
3. **Email history** - Store sent emails in database for audit
4. **HTML builder** - WYSIWYG template editor in admin panel
5. **Attachments** - Send request PDF with rejection email
6. **Scheduled emails** - Delay sending for off-peak hours
7. **Email preferences** - Let users control which notifications they receive
8. **Multi-language support** - Localize email content

## Related Files

- `/server/utils/emailService.ts` - Email service implementation
- `/server/index.ts` - Integration with rejection workflow + test endpoint
- `/package.json` - Updated with nodemailer dependency
- `/.env` - SMTP configuration variables
