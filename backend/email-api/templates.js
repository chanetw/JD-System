/**
 * @file templates.js
 * @description Enhanced Email Templates with HTML & Interactive Features
 * 
 * Features:
 * - Rich HTML templates with modern design
 * - Interactive approval buttons
 * - Job details display
 * - Responsive design for mobile
 * - Thai language support
 */

const templates = {
    /**
     * Template: Job Approval Request
     * ส่งให้ approver เมื่อมีงานรอการอนุมัติ
     */
    job_approval_request: (data) => ({
        subject: `📋 คำขออนุมัติงาน: ${data.jobId} - ${data.jobSubject}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>คำขออนุมัติงาน - DJ System</title>
    <style>
        body {
            font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #E11D48;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #E11D48;
            margin: 0;
            font-size: 28px;
        }
        .job-info {
            background-color: #f8f9fa;
            border-left: 4px solid #E11D48;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .job-info h3 {
            color: #E11D48;
            margin-top: 0;
        }
        .detail-row {
            display: flex;
            margin: 10px 0;
        }
        .detail-label {
            font-weight: bold;
            min-width: 120px;
            color: #666;
        }
        .detail-value {
            flex: 1;
        }
        .priority-high {
            color: #dc3545;
            font-weight: bold;
        }
        .priority-normal {
            color: #28a745;
        }
        .priority-low {
            color: #6c757d;
        }
        .brief-section {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .brief-section h4 {
            color: #856404;
            margin-top: 0;
        }
        .action-buttons {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            margin: 10px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            text-align: center;
            min-width: 120px;
        }
        .btn-approve {
            background-color: #28a745;
            color: white;
        }
        .btn-reject {
            background-color: #dc3545;
            color: white;
        }
        .btn-view {
            background-color: #6c757d;
            color: white;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .approval-info {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 คำขออนุมัติงาน</h1>
            <p>DJ System - Design Job Management</p>
        </div>

        <p>เรียน <strong>${data.approverName}</strong>,</p>
        <p>คุณมีงานที่รอการอนุมัติจาก <strong>${data.requesterName}</strong></p>

        <div class="job-info">
            <h3>📄 รายละเอียดงาน</h3>
            <div class="detail-row">
                <div class="detail-label">รหัสงาน:</div>
                <div class="detail-value"><strong>${data.jobId}</strong></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">หัวข้องาน:</div>
                <div class="detail-value">${data.jobSubject}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">ประเภทงาน:</div>
                <div class="detail-value">${data.jobType}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">ความสำคัญ:</div>
                <div class="detail-value priority-${data.priority}">${data.priorityText}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">วันที่สร้าง:</div>
                <div class="detail-value">${data.createdAt}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Deadline:</div>
                <div class="detail-value">${data.deadline || 'ไม่ระบุ'}</div>
            </div>
        </div>

        ${data.brief ? `
        <div class="brief-section">
            <h4>📝 Job Brief</h4>
            <p><strong>วัตถุประสงค์:</strong> ${data.brief.objective || 'ไม่ระบุ'}</p>
            ${data.brief.headline ? `<p><strong>Headline:</strong> ${data.brief.headline}</p>` : ''}
            ${data.brief.sellingPoints ? `<p><strong>จุดขาย:</strong> ${data.brief.sellingPoints}</p>` : ''}
            ${data.brief.price ? `<p><strong>ราคา:</strong> ${data.brief.price}</p>` : ''}
        </div>
        ` : ''}

        ${data.attachments && data.attachments.length > 0 ? `
        <div class="job-info">
            <h4>📎 ไฟล์แนบ</h4>
            ${data.attachments.map(att => `
                <div class="detail-row">
                    <div class="detail-label">•</div>
                    <div class="detail-value">${att.fileName} (${att.fileSize})</div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="approval-info">
            <p><strong>🔐 รหัสการอนุมัติ:</strong> ${data.approvalToken}</p>
            <p>รหัสนี้ใช้สำหรับยืนยันตัวตนในการอนุมัติงาน มีอายุการใช้งาน 24 ชั่วโมง</p>
        </div>

        <div class="action-buttons">
            <a href="${data.approveUrl}" class="btn btn-approve">✅ อนุมัติ</a>
            <a href="${data.rejectUrl}" class="btn btn-reject">❌ ปฏิเสธ</a>
            <a href="${data.viewUrl}" class="btn btn-view">👀 ดูรายละเอียด</a>
        </div>

        <div class="footer">
            <p>อีเมลนี้ส่งโดยระบบ DJ System โดยอัตโนมัติ</p>
            <p>หากคุณไม่ได้รับการแจ้งเตือนนี้ กรุณาติดต่อผู้ดูแลระบบ</p>
            <p>© 2026 DJ System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    /**
     * Template: Job Approved Notification
     * ส่งให้ requester เมื่องานได้รับการอนุมัติ
     */
    job_approved: (data) => ({
        subject: `✅ งาน ${data.jobId} ได้รับการอนุมัติแล้ว`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>งานได้รับการอนุมัติ - DJ System</title>
    <style>
        body {
            font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #28a745;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #28a745;
            margin: 0;
            font-size: 28px;
        }
        .success-box {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
            text-align: center;
        }
        .success-box h2 {
            color: #155724;
            margin-top: 0;
        }
        .job-info {
            background-color: #f8f9fa;
            border-left: 4px solid #28a745;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .detail-row {
            display: flex;
            margin: 10px 0;
        }
        .detail-label {
            font-weight: bold;
            min-width: 120px;
            color: #666;
        }
        .detail-value {
            flex: 1;
        }
        .approval-info {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }
        .action-button {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ งานได้รับการอนุมัติ</h1>
            <p>DJ System - Design Job Management</p>
        </div>

        <div class="success-box">
            <h2>🎉 ยินดีด้วย!</h2>
            <p>งานของคุณได้รับการอนุมัติแล้ว</p>
        </div>

        <p>เรียน <strong>${data.requesterName}</strong>,</p>
        <p>งาน <strong>${data.jobId} - ${data.jobSubject}</strong> ได้รับการอนุมัติจาก <strong>${data.approverName}</strong> เรียบร้อยแล้ว</p>

        <div class="job-info">
            <h3>📄 รายละเอียดการอนุมัติ</h3>
            <div class="detail-row">
                <div class="detail-label">ผู้อนุมัติ:</div>
                <div class="detail-value">${data.approverName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">วันที่อนุมัติ:</div>
                <div class="detail-value">${data.approvedAt}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">ความคิดเห็น:</div>
                <div class="detail-value">${data.comment || 'ไม่มีความคิดเห็น'}</div>
            </div>
            ${data.assigneeName ? `
            <div class="detail-row">
                <div class="detail-label">ผู้รับมอบหมาย:</div>
                <div class="detail-value">${data.assigneeName}</div>
            </div>
            ` : ''}
        </div>

        <div class="approval-info">
            <p><strong>🔐 รหัสการอนุมัติ:</strong> ${data.approvalToken}</p>
            <p><strong>📍 IP Address:</strong> ${data.approverIp || 'ไม่ระบุ'}</p>
            <p>การอนุมัตินี้ได้ถูกบันทึกไว้ในระบบแล้ว</p>
        </div>

        <div class="action-button">
            <a href="${data.viewUrl}" class="btn">👀 ดูรายละเอียดงาน</a>
        </div>

        <div class="footer">
            <p>อีเมลนี้ส่งโดยระบบ DJ System โดยอัตโนมัติ</p>
            <p>© 2026 DJ System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    /**
     * Template: Job Rejected Notification
     * ส่งให้ requester เมื่องานถูกปฏิเสธ
     */
    job_rejected: (data) => ({
        subject: `❌ งาน ${data.jobId} ถูกปฏิเสธ`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>งานถูกปฏิเสธ - DJ System</title>
    <style>
        body {
            font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #dc3545;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #dc3545;
            margin: 0;
            font-size: 28px;
        }
        .reject-box {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
            text-align: center;
        }
        .reject-box h2 {
            color: #721c24;
            margin-top: 0;
        }
        .job-info {
            background-color: #f8f9fa;
            border-left: 4px solid #dc3545;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .detail-row {
            display: flex;
            margin: 10px 0;
        }
        .detail-label {
            font-weight: bold;
            min-width: 120px;
            color: #666;
        }
        .detail-value {
            flex: 1;
        }
        .comment-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .comment-box h4 {
            color: #856404;
            margin-top: 0;
        }
        .approval-info {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }
        .action-button {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background-color: #dc3545;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ งานถูกปฏิเสธ</h1>
            <p>DJ System - Design Job Management</p>
        </div>

        <div class="reject-box">
            <h2>📋 แจ้งเตือนการปฏิเสธงาน</h2>
            <p>งานของคุณถูกปฏิเสฐโดยผู้มีอำนาจ</p>
        </div>

        <p>เรียน <strong>${data.requesterName}</strong>,</p>
        <p>งาน <strong>${data.jobId} - ${data.jobSubject}</strong> ถูกปฏิเสฐจาก <strong>${data.approverName}</strong></p>

        <div class="job-info">
            <h3>📄 รายละเอียดการปฏิเสธ</h3>
            <div class="detail-row">
                <div class="detail-label">ผู้ปฏิเสฐ:</div>
                <div class="detail-value">${data.approverName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">วันที่ปฏิเสฐ:</div>
                <div class="detail-value">${data.rejectedAt}</div>
            </div>
        </div>

        ${data.comment ? `
        <div class="comment-box">
            <h4>💬 เหตุผลการปฏิเสฐ</h4>
            <p>${data.comment}</p>
        </div>
        ` : ''}

        <div class="approval-info">
            <p><strong>🔐 รหัสการปฏิเสฐ:</strong> ${data.approvalToken}</p>
            <p><strong>📍 IP Address:</strong> ${data.approverIp || 'ไม่ระบุ'}</p>
            <p>การปฏิเสฐนี้ได้ถูกบันทึกไว้ในระบบแล้ว</p>
        </div>

        <div class="action-button">
            <a href="${data.editUrl}" class="btn">📝 แก้ไขงาน</a>
        </div>

        <div class="footer">
            <p>อีเมลนี้ส่งโดยระบบ DJ System โดยอัตโนมัติ</p>
            <p>© 2026 DJ System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    /**
     * Template: Job Assigned
     * ส่งให้ assignee เมื่อได้รับมอบหมายงาน
     */
    job_assigned: (data) => ({
        subject: `📋 คุณได้รับมอบหมายงานใหม่: ${data.jobId}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>มอบหมายงานใหม่ - DJ System</title>
    <style>
        body {
            font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
        }
        .assignment-box {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
            text-align: center;
        }
        .assignment-box h2 {
            color: #0c5460;
            margin-top: 0;
        }
        .job-info {
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .detail-row {
            display: flex;
            margin: 10px 0;
        }
        .detail-label {
            font-weight: bold;
            min-width: 120px;
            color: #666;
        }
        .detail-value {
            flex: 1;
        }
        .priority-high {
            color: #dc3545;
            font-weight: bold;
        }
        .priority-normal {
            color: #28a745;
        }
        .priority-low {
            color: #6c757d;
        }
        .action-button {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 มอบหมายงานใหม่</h1>
            <p>DJ System - Design Job Management</p>
        </div>

        <div class="assignment-box">
            <h2>🎯 คุณได้รับมอบหมายงานใหม่!</h2>
            <p>กรุณาตรวจสอบและดำเนินการตามความเหมาะสม</p>
        </div>

        <p>เรียน <strong>${data.assigneeName}</strong>,</p>
        <p>คุณได้รับมอบหมายงานจาก <strong>${data.requesterName}</strong></p>

        <div class="job-info">
            <h3>📄 รายละเอียดงาน</h3>
            <div class="detail-row">
                <div class="detail-label">รหัสงาน:</div>
                <div class="detail-value"><strong>${data.jobId}</strong></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">หัวข้องาน:</div>
                <div class="detail-value">${data.jobSubject}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">ผู้ของาน:</div>
                <div class="detail-value">${data.requesterName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">ความสำคัญ:</div>
                <div class="detail-value priority-${data.priority}">${data.priorityText}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">วันที่มอบหมาย:</div>
                <div class="detail-value">${data.assignedAt}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Deadline:</div>
                <div class="detail-value">${data.deadline || 'ไม่ระบุ'}</div>
            </div>
        </div>

        <div class="action-button">
            <a href="${data.viewUrl}" class="btn">👀 ดูรายละเอียดงาน</a>
        </div>

        <div class="footer">
            <p>อีเมลนี้ส่งโดยระบบ DJ System โดยอัตโนมัติ</p>
            <p>© 2026 DJ System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
    })
};

module.exports = templates;
