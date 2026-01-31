import { EmailService } from '../src/services/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from one level up (api-server root)
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSMTP() {
    console.log('📧 Testing SMTP Configuration...');

    const emailService = new EmailService();

    // 1. Verify Connection
    console.log('\n1. Verifying Connection...');
    const isConnected = await emailService.verifyConnection();

    if (!isConnected) {
        console.error('❌ Connection Failed! Please check your .env settings.');
        console.error('Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
        process.exit(1);
    }

    // 2. Try Sending Test Email
    const testEmail = process.env.SMTP_USER; // Send to self
    console.log(`\n2. Sending test email to: ${testEmail}...`);

    const result = await emailService.sendEmail(
        testEmail,
        '🧪 Test Email from DJ System',
        '<h1>SMTP Test Success!</h1><p>If you see this, your SMTP configuration is working correctly. ✅</p>',
        'SMTP Test Success! If you see this, your SMTP configuration is working correctly.'
    );

    if (result.success) {
        console.log(`✅ Email sent successfully! Message ID: ${result.messageId}`);
    } else {
        console.error('❌ Failed to send email:', result.error);
    }
}

testSMTP();
