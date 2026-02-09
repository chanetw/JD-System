-- Reset password ทุก user เป็น "123456"
-- bcrypt hash ของ "123456" ที่ salt rounds = 10

UPDATE users 
SET password = '$2b$10$XMWrh2uS7VDsXcsSMc0aduF2K5K5FG57kqu247V0QbdWRq0ZJlPq.'
WHERE 1=1;

-- ตรวจสอบผลลัพธ์
SELECT COUNT(*) as total_users, 'Password reset สำเร็จ' as status
FROM users;
