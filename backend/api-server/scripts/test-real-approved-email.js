
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from email-api to get correctly configured port and API KEY
dotenv.config({ path: path.join(__dirname, '../../email-api/.env') });

const EMAIL_API_URL = `http://localhost:${process.env.PORT || 3001}`;
const API_KEY = process.env.API_KEY || 'your-secret-api-key-here';

async function testRealApprovedEmail() {
    const testRecipient = 'chanetw@sena.co.th';

    console.log(`Sending REAL Job Approved notification to ${testRecipient} via Email API...`);

    try {
        const response = await axios.post(`${EMAIL_API_URL}/api/send-email`, {
            to: testRecipient,
            template: 'job_approved',
            data: {
                jobId: 'DJ-2026-0001',
                jobSubject: 'ออกแบบ Artwork สำหรับแคมเปญใหม่',
                requesterName: 'คุณสมชาย (Requester)',
                approverName: 'คุณสมหญิง (Manager)',
                approvedAt: new Date().toLocaleString('th-TH'),
                comment: 'อนุมัติครับ งานนี้เร่งด่วน ฝากทีมงานจัดการต่อเลย',
                assigneeName: 'คุณวิชัย (Designer)',
                approvalToken: 'APP-v8n2x9z4L0m1',
                approverIp: '192.168.1.1',
                viewUrl: 'http://localhost:5173/jobs/1'
            }
        }, {
            headers: {
                'x-api-key': API_KEY
            }
        });

        if (response.data.success) {
            console.log('Real-style Approved email sent successfully! ✅');
            console.log('Message ID:', response.data.messageId);
        } else {
            console.error('Failed to send email:', response.data.error);
        }
    } catch (error) {
        console.error('Error calling Email API:', error.response?.data || error.message);
    }
}

testRealApprovedEmail();
