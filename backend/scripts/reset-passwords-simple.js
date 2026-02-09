/**
 * @file reset-passwords-simple.js
 * @description Reset รหัสผ่านทุก User เป็น "123456" (แบบง่าย - รันจาก backend root)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔄 กำลัง Reset Password ทุก User เป็น "123456"...\n');

        // Hash password
        const hashedPassword = await bcrypt.hash('123456', 10);
        console.log('🔐 Password Hash สร้างเรียบร้อย\n');

        // ดึงรายชื่อ User ทั้งหมด
        const users = await prisma.user.findMany({
            select: { id: true, email: true, firstName: true, lastName: true }
        });

        console.log(`👥 พบ ${users.length} users:`);
        users.forEach((u, i) => {
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'No Name';
            console.log(`  ${i + 1}. ${u.email} (${name})`);
        });
        console.log('');

        // รอ 2 วินาที
        console.log('⏳ รอ 2 วินาที... (Ctrl+C เพื่อยกเลิก)');
        await new Promise(r => setTimeout(r, 2000));

        // Update
        const result = await prisma.user.updateMany({
            data: { passwordHash: hashedPassword }
        });

        console.log(`\n✅ สำเร็จ! Reset password ${result.count} users`);
        console.log('   Password ใหม่ทุกคน: 123456\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
