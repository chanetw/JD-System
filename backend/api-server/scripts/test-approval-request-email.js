
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from email-api
dotenv.config({ path: path.join(__dirname, '../../email-api/.env') });

const EMAIL_API_URL = `http://localhost:${process.env.PORT || 3001}`;
const API_KEY = process.env.API_KEY || 'your-secret-api-key-here';

async function testApprovalRequestEmail() {
    const testRecipient = 'chanetw@sena.co.th';

    console.log(`Sending REAL Job Approval REQUEST to ${testRecipient} via Email API...`);

    try {
        const response = await axios.post(`${EMAIL_API_URL}/api/send-email`, {
            to: testRecipient,
            template: 'job_approval_request',
            data: {
                approverName: 'คุณสมหญิง (Manager)',
                requesterName: 'คุณสมชาย (Requester)',
                jobId: 'DJ-2026-0001',
                jobSubject: 'ออกแบบ Artwork สำหรับแคมเปญใหม่',
                jobType: 'Social Media Content',
                priority: 'high',
                priorityText: 'ด่วนมาก (High)',
                createdAt: new Date().toLocaleDateString('th-TH'),
                deadline: '15/02/2026',
                brief: {
                    objective: 'เพื่อโปรโมทโครงการใหม่ประจำเดือนกุมภาพันธ์',
                    headline: 'SENA NEXT: ชีวิตที่ใช่ ในที่ที่ชอบ',
                    sellingPoints: 'ส่วนลด 50%, ฟรีค่าโอน, ใกล้รถไฟฟ้า',
                    price: 'เริ่มต้น 2.5 ล้านบาท'
                },
                attachments: [
                    { fileName: 'Logo_Sena_Next.png', fileSize: '1.2 MB' },
                    { fileName: 'Reference_Design.pdf', fileSize: '3.5 MB' }
                ],
                approvalToken: 'REQ-p7m3k9x2R4w1',
                approveUrl: 'http://localhost:5173/approve/REQ-p7m3k9x2R4w1',
                rejectUrl: 'http://localhost:5173/reject/REQ-p7m3k9x2R4w1',
                viewUrl: 'http://localhost:5173/jobs/1'
            }
        }, {
            headers: {
                'x-api-key': API_KEY
            }
        });

        if (response.data.success) {
            console.log('Real-style Approval Request email sent successfully! ✅');
        } else {
            console.error('Failed to send email:', response.data.error);
        }
    } catch (error) {
        console.error('Error calling Email API:', error.response?.data || error.message);
    }
}

testApprovalRequestEmail();
