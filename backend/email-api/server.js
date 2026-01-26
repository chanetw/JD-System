/**
 * @file server.js
 * @description Email API Server - ส่ง email ผ่าน SMTP
 * 
 * Features:
 * - SMTP Email sending via Nodemailer
 * - Multiple email templates
 * - API Key authentication
 * - CORS support
 * - Modular & pluggable design
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// Middleware
// ========================================

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());

// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;
    
    // Skip auth if no API_KEY is set (development mode)
    if (!validApiKey || validApiKey === 'your-secret-api-key-here') {
        console.warn('⚠️ Warning: API_KEY not configured, running in development mode');
        return next();
    }
    
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
};

// ========================================
// SMTP Transporter
// ========================================

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT) || 587,
        secure: process.env.MAIL_ENCRYPTION === 'ssl', // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certificates
        }
    });
};

// ========================================
// Email Templates
// ========================================

const templates = {
    // Template: Registration Approved
    registration_approved: (data) => ({
        subject: '🎉 บัญชีของคุณได้รับการอนุมัติแล้ว - DJ System',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #E11D48, #BE123C); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .password-box { background: #FEF2F2; border: 2px dashed #E11D48; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
        .password-box code { font-size: 24px; font-weight: bold; color: #E11D48; letter-spacing: 2px; }
        .btn { display: inline-block; background: #E11D48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 ยินดีต้อนรับสู่ DJ System!</h1>
        </div>
        <div class="content">
            <p>สวัสดีคุณ <strong>${data.firstName}</strong>,</p>
            <p>บัญชีของคุณได้รับการอนุมัติจาก Admin เรียบร้อยแล้ว คุณสามารถเข้าใช้งานระบบได้ทันที</p>
            
            <h3>📧 ข้อมูลการเข้าสู่ระบบ:</h3>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>รหัสผ่านชั่วคราว:</strong></p>
            
            <div class="password-box">
                <code>${data.tempPassword}</code>
            </div>
            
            <div class="warning">
                ⚠️ <strong>สำคัญ:</strong> กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก เพื่อความปลอดภัยของบัญชี
            </div>
            
            <p style="text-align: center;">
                <a href="${data.loginUrl || '#'}" class="btn">เข้าสู่ระบบ</a>
            </p>
            
            <p>หากมีข้อสงสัย กรุณาติดต่อ Admin</p>
            <p>ขอบคุณครับ/ค่ะ<br><strong>DJ System Team</strong></p>
        </div>
        <div class="footer">
            <p>© 2026 DJ System - Design Job Management</p>
            <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    // Template: Registration Rejected
    registration_rejected: (data) => ({
        subject: 'เกี่ยวกับคำขอสมัครสมาชิก - DJ System',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #6B7280; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .reason-box { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>เกี่ยวกับคำขอสมัครสมาชิก</h1>
        </div>
        <div class="content">
            <p>สวัสดีคุณ <strong>${data.firstName}</strong>,</p>
            <p>ขออภัย คำขอสมัครสมาชิกของคุณไม่ได้รับการอนุมัติในครั้งนี้</p>
            
            <h3>📋 เหตุผล:</h3>
            <div class="reason-box">
                ${data.rejectionReason || 'ไม่ได้ระบุเหตุผล'}
            </div>
            
            <p>หากคุณมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อ Admin</p>
            <p>ขอบคุณที่ให้ความสนใจ DJ System</p>
        </div>
        <div class="footer">
            <p>© 2026 DJ System</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    // Template: Job Assigned
    job_assigned: (data) => ({
        subject: `📋 คุณได้รับมอบหมายงานใหม่: ${data.jobId}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .job-info { background: #EFF6FF; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .job-info p { margin: 8px 0; }
        .btn { display: inline-block; background: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 งานใหม่รอคุณอยู่!</h1>
        </div>
        <div class="content">
            <p>สวัสดีคุณ <strong>${data.firstName}</strong>,</p>
            <p>คุณได้รับมอบหมายงานใหม่ในระบบ DJ System</p>
            
            <div class="job-info">
                <p><strong>🔖 รหัสงาน:</strong> ${data.jobId}</p>
                <p><strong>📝 หัวข้อ:</strong> ${data.jobSubject}</p>
                <p><strong>📅 กำหนดส่ง:</strong> ${data.dueDate ? new Date(data.dueDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</p>
            </div>
            
            <p style="text-align: center;">
                <a href="${data.jobUrl || '#'}" class="btn">ดูรายละเอียดงาน</a>
            </p>
        </div>
        <div class="footer">
            <p>© 2026 DJ System</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    // Template: Job Status Update
    job_status_update: (data) => ({
        subject: `🔔 อัปเดตสถานะงาน ${data.jobId}: ${data.newStatus}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .comment-box { background: #F3F4F6; border-radius: 8px; padding: 15px; margin: 20px 0; font-style: italic; }
        .btn { display: inline-block; background: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 อัปเดตสถานะงาน</h1>
        </div>
        <div class="content">
            <p>สวัสดีคุณ <strong>${data.firstName}</strong>,</p>
            <p>งานของคุณมีการอัปเดตสถานะ</p>
            
            <p><strong>🔖 รหัสงาน:</strong> ${data.jobId}</p>
            <p><strong>📝 หัวข้อ:</strong> ${data.jobSubject}</p>
            <p><strong>📊 สถานะใหม่:</strong> <span class="status-badge">${data.newStatus}</span></p>
            
            ${data.comment ? `
            <div class="comment-box">
                <strong>💬 ความคิดเห็น:</strong><br>
                "${data.comment}"
            </div>
            ` : ''}
            
            <p style="text-align: center;">
                <a href="${data.jobUrl || '#'}" class="btn">ดูรายละเอียด</a>
            </p>
        </div>
        <div class="footer">
            <p>© 2026 DJ System</p>
        </div>
    </div>
</body>
</html>
        `
    })
};

// ========================================
// API Routes
// ========================================

// Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'DJ Email API',
        timestamp: new Date().toISOString()
    });
});

// Send Email Endpoint
app.post('/api/send-email', authenticateApiKey, async (req, res) => {
    try {
        const { to, template, data } = req.body;

        // Validate required fields
        if (!to || !template) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: to, template' 
            });
        }

        // Get template
        const templateFn = templates[template];
        if (!templateFn) {
            return res.status(400).json({ 
                success: false, 
                error: `Unknown template: ${template}`,
                availableTemplates: Object.keys(templates)
            });
        }

        // Generate email content
        const emailContent = templateFn(data || {});

        // Create transporter
        const transporter = createTransporter();

        // Send email
        const info = await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: to,
            subject: emailContent.subject,
            html: emailContent.html
        });

        console.log(`✅ Email sent: ${info.messageId} -> ${to}`);

        res.json({
            success: true,
            messageId: info.messageId,
            to: to,
            template: template
        });

    } catch (error) {
        console.error('❌ Email send error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send Custom Email (without template)
app.post('/api/send-custom', authenticateApiKey, async (req, res) => {
    try {
        const { to, subject, html, text } = req.body;

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject, and either html or text'
            });
        }

        const transporter = createTransporter();

        const info = await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: to,
            subject: subject,
            html: html,
            text: text
        });

        console.log(`✅ Custom email sent: ${info.messageId} -> ${to}`);

        res.json({
            success: true,
            messageId: info.messageId
        });

    } catch (error) {
        console.error('❌ Custom email error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test SMTP Connection
app.get('/api/test-connection', authenticateApiKey, async (req, res) => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        
        res.json({
            success: true,
            message: 'SMTP connection successful',
            config: {
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                from: process.env.MAIL_FROM_ADDRESS
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║         DJ System - Email API Service         ║
╠═══════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}               ║
║  📧 SMTP Host: ${process.env.MAIL_HOST}           
║  👤 From: ${process.env.MAIL_FROM_ADDRESS}        
╚═══════════════════════════════════════════════╝
    `);
});

module.exports = app;
