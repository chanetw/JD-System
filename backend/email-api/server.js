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

const templates = require('./templates.js');

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
