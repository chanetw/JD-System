/**
 * @file reset-passwords.js
 * @description Reset รหัสผ่านของ User ทุกคนเป็น "123456"
 * 
 * คำเตือน: ใช้เฉพาะใน Development/Testing เท่านั้น!
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAllPasswords() {
    try {
        console.log('🔄 กำลัง Reset Password ทุก User...\n');

        // Hash password "123456"
        const newPassword = '123456';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`📝 New Password: ${newPassword}`);
        console.log(`🔐 Hashed: ${hashedPassword.substring(0, 20)}...\n`);

        // ดึง User ทั้งหมด
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                displayName: true
            }
        });

        console.log(`👥 พบ User ทั้งหมด: ${users.length} คน\n`);

        if (users.length === 0) {
            console.log('⚠️  ไม่มี User ในระบบ');
            return;
        }

        // แสดงรายชื่อ User
        console.log('รายชื่อ User ที่จะถูก Reset Password:');
        console.log('─'.repeat(60));
        users.forEach((user, index) => {
            const name = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
            console.log(`${index + 1}. [${user.id}] ${user.email} (${name || 'No Name'})`);
        });
        console.log('─'.repeat(60));
        console.log('');

        // Confirm
        console.log('⚠️  คุณแน่ใจหรือไม่ว่าต้องการ Reset Password ทุกคน?');
        console.log('   (กด Ctrl+C เพื่อยกเลิก, รอ 3 วินาทีเพื่อดำเนินการต่อ...)\n');

        // รอ 3 วินาที
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Update Password ทุกคน
        const result = await prisma.user.updateMany({
            data: {
                password: hashedPassword
            }
        });

        console.log(`\n✅ Reset Password สำเร็จ!`);
        console.log(`   จำนวน User ที่ถูกอัพเดต: ${result.count} คน`);
        console.log(`   Password ใหม่: ${newPassword}\n`);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// รัน script
resetAllPasswords()
    .then(() => {
        console.log('🎉 เสร็จสิ้น!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script ล้มเหลว:', error);
        process.exit(1);
    });
