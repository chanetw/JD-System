# Data Handling Rules

## Mock Data Storage
- ข้อมูล Mock Data ทั้งหมดต้องจัดเก็บอยู่ในโฟลเดอร์ `mock-data/` เท่านั้น
- แยกไฟล์ตาม Entity เช่น `users.json`, `projects.json`, `jobs.json` เพื่อความระเบียบ

## Multi-Tenancy
ระบบออกแบบมาเพื่อรองรับหลายองค์กร (Multi-Tenant) ดังนั้นการ Query ข้อมูลทุกครั้งต้องมีความปลอดภัย:
- **Tenant ID Requirement:** ทุก Query ที่กระทำกับ Database (หรือ Mock Data Filter) **ต้องมี `tenant_id` ระบุเสมอ**
- **Data Isolation:** ห้ามดึงข้อมูลของ Tenant อื่นมาแสดงผลโดยเด็ดขาด (แม้จะเป็น Admin ก็ควรเห็นเฉพาะ Tenant ที่ตนเองดูแล หรือมีสิทธิ์)

## Data Fetching
- ให้เลี่ยงการดึงข้อมูลทั้งหมด (Select All) แล้วมา Filter ที่ Frontend ในกรณีที่มีข้อมูลจำนวนมาก
- ควร Filter ที่ระดับ Service/API (Mock Function) ให้เรียบร้อยก่อนส่งคืน
