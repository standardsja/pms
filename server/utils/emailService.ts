import nodemailer from 'nodemailer';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-insecure-key-change-this';

/**
 * Email Service - Sends emails via SMTP with optional encryption for sensitive data
 */
class EmailService {
    private transporter: any;
    private isConfigured = false;

    constructor() {
        this.initializeTransporter();
    }

    /**
     * Initialize SMTP transporter with env variables
     */
    private initializeTransporter() {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
        const smtpUser = process.env.SMTP_USER;
        const smtpPassword = process.env.SMTP_PASSWORD;
        const smtpFrom = process.env.SMTP_FROM_EMAIL || smtpUser || 'noreply@example.com';

        if (!smtpHost || !smtpUser || !smtpPassword) {
            console.warn('[EmailService] SMTP not configured. Emails will not be sent. Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD env vars.');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465, // true for 465, false for other ports
                auth: {
                    user: smtpUser,
                    pass: smtpPassword,
                },
            });

            this.isConfigured = true;
            console.log('[EmailService] SMTP transporter initialized successfully');
        } catch (err) {
            console.error('[EmailService] Failed to initialize SMTP transporter:', err);
        }
    }

    /**
     * Encrypt sensitive content (optional - for sensitive rejection reasons, etc.)
     */
    public encryptContent(content: string): string {
        try {
            const cipher = crypto.createCipher('aes192', ENCRYPTION_KEY);
            let encrypted = cipher.update(content, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return encrypted;
        } catch (err) {
            console.warn('[EmailService] Encryption failed, sending unencrypted:', err);
            return content;
        }
    }

    /**
     * Decrypt sensitive content
     */
    public decryptContent(encryptedContent: string): string {
        try {
            const decipher = crypto.createDecipher('aes192', ENCRYPTION_KEY);
            let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (err) {
            console.warn('[EmailService] Decryption failed:', err);
            return '';
        }
    }

    /**
     * Send a generic email
     */
    async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
        if (!this.isConfigured) {
            console.warn(`[EmailService] Email not configured. Would have sent to ${to}: ${subject}`);
            return false;
        }

        try {
            const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
            await this.transporter.sendMail({
                from,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, ''), // Fallback to HTML without tags
            });
            console.log(`[EmailService] Email sent successfully to ${to}`);
            return true;
        } catch (err) {
            console.error(`[EmailService] Failed to send email to ${to}:`, err);
            return false;
        }
    }

    /**
     * Send request rejection notification email
     */
    async sendRejectionNotification(recipientEmail: string, recipientName: string, requestId: number, requestRef: string, rejectionReason: string, rejectorName: string): Promise<boolean> {
        console.log(`[EmailService:SEND_REJECTION] ========== CALLED ==========`);
        console.log(`[EmailService:SEND_REJECTION] isConfigured: ${this.isConfigured}`);
        console.log(`[EmailService:SEND_REJECTION] recipientEmail: ${recipientEmail}`);
        console.log(`[EmailService:SEND_REJECTION] recipientName: ${recipientName}`);
        console.log(`[EmailService:SEND_REJECTION] requestRef: ${requestRef}`);
        const subject = `Request ${requestRef} Has Been Returned for Revision`;

        const html = `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2>Request Returned for Revision</h2>
                    <p>Dear ${recipientName},</p>
                    
                    <p>Your request <strong>${requestRef}</strong> (ID: ${requestId}) has been returned for revision.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;">
                        <p><strong>Revision Reason:</strong></p>
                        <p>${rejectionReason || 'No reason provided'}</p>
                    </div>
                    
                    <p><strong>Returned by:</strong> ${rejectorName}</p>
                    
                    <p>Please review the request and make the necessary revisions. You can access your request in the Procurement Management System.</p>
                    
                    <p>If you have any questions, please contact the procurement team.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">
                        This is an automated message from the Procurement Management System. Please do not reply to this email.
                    </p>
                </body>
            </html>
        `;

        return this.sendEmail(recipientEmail, subject, html);
    }

    /**
     * Send message notification email
     */
    async sendMessageNotification(recipientEmail: string, recipientName: string, senderName: string, messageSubject: string, messagePreview: string): Promise<boolean> {
        const subject = `New Message: ${messageSubject}`;

        const html = `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2>You Have a New Message</h2>
                    <p>Dear ${recipientName},</p>
                    
                    <p><strong>${senderName}</strong> has sent you a message:</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0275d8; margin: 20px 0;">
                        <p><strong>${messageSubject}</strong></p>
                        <p>${messagePreview}</p>
                    </div>
                    
                    <p>Please log in to the Procurement Management System to view the full message and respond.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">
                        This is an automated message from the Procurement Management System. Please do not reply to this email.
                    </p>
                </body>
            </html>
        `;

        return this.sendEmail(recipientEmail, subject, html);
    }

    /**
     * Send stage assignment/next-step notification email
     */
    async sendStageAssignmentNotification(recipientEmail: string, recipientName: string, requestRef: string, nextStage: string, assignerName?: string): Promise<boolean> {
        const normalizedStage = nextStage.replace(/_/g, ' ').toUpperCase();
        const subject = `Action Required: Request ${requestRef} - ${normalizedStage}`;

        const html = `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2>Action Required</h2>
                    <p>Dear ${recipientName},</p>
                    <p>Request <strong>${requestRef}</strong> is now at stage <strong>${normalizedStage}</strong> and has been assigned to you for the next action.</p>
                    ${assignerName ? `<p><strong>Assigned by:</strong> ${assignerName}</p>` : ''}
                    <p>Please sign in to the Procurement Management System to review and take action.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">This is an automated message from the Procurement Management System. Please do not reply to this email.</p>
                </body>
            </html>
        `;

        return this.sendEmail(recipientEmail, subject, html);
    }

    /**
     * Test email configuration
     */
    async testConfiguration(testEmail: string): Promise<boolean> {
        if (!this.isConfigured) {
            console.error('[EmailService] Email service not configured');
            return false;
        }

        try {
            await this.transporter.verify();
            console.log('[EmailService] SMTP configuration verified successfully');

            // Send test email
            return this.sendEmail(testEmail, 'Test Email from Procurement Management System', '<h1>Test Email</h1><p>If you received this, email configuration is working correctly.</p>');
        } catch (err) {
            console.error('[EmailService] Configuration test failed:', err);
            return false;
        }
    }
}

// Export singleton instance
export const emailService = new EmailService();
