import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    debug: true, // Enable debug output
    logger: true  // Log to console
});

async function testEmail() {
    try {
        console.log('Testing SMTP connection...');
        console.log('Host:', process.env.SMTP_HOST);
        console.log('User:', process.env.SMTP_USER);
        console.log('Port:', process.env.SMTP_PORT);
        console.log('Password set:', process.env.SMTP_PASSWORD ? 'YES' : 'NO');
        
        await transporter.verify();
        console.log('✅ SMTP connection verified!');
        
        console.log('\nSending test email...');
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
            to: process.env.SMTP_USER, // Send to yourself for testing
            subject: 'Test Email from PMS',
            text: 'This is a test email from the procurement management system.',
            html: '<p>This is a <strong>test email</strong> from the procurement management system.</p>',
        });
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('Full error:', error);
    }
}

testEmail();
