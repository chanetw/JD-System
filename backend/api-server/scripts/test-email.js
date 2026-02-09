
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import EmailService from '../src/services/emailService.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testEmail() {
    const emailService = new EmailService();

    console.log('Testing SMTP connection...');
    const isConnected = await emailService.verifyConnection();

    if (!isConnected) {
        console.error('SMTP connection failed. Check your .env settings.');
        process.exit(1);
    }

    const testRecipient = 'chanetw@sena.co.th'; // The user's email domain seems to be sena.co.th
    console.log(`Sending test email to ${testRecipient}...`);

    const result = await emailService.sendEmail(
        testRecipient,
        '🔔 DJ System - Test Notification',
        '<h1>ระบบ Notification ของคุณทำงานได้ปกติ</h1><p>นี่คือเมล์ทดสอบจาก DJ System ครับ</p>',
        'นี่คือเมล์ทดสอบจาก DJ System ครับ'
    );

    if (result.success) {
        console.log('Test email sent successfully! ✅');
    } else {
        console.error('Failed to send test email: ❌', result.error);
    }
}

testEmail();
