## แผน: รวบรวมและปรับปรุงการสมัครใช้งาน (Register) — ใช้ `/api/v2/auth/register-request` เป็นหลัก

รวมเส้นทางการสมัครเป็น flow เดียวโดยใช้ `/api/v2/auth/register-request` เป็นทางการหลัก โดยผู้สมัครจะถูกเปิดใช้งานทันทีในสถานะ `Requester` (auto-approved) แล้วลบ/ปรับแก้เส้นทางที่ขัดแย้ง ทั้งฝั่ง frontend และ backend ให้ validation และ payload ตรงกัน ซึ่งจะแก้ปัญหา route เสีย, dead code, และความไม่สอดคล้องของ API

ขั้นตอนหลัก
1. Phase 1 — กำหนดสัญญา (Contract) และ Acceptance Criteria
   1.1 ระบุสัญญา canonical ระหว่าง frontend ↔ backend: ฟิลด์ที่ต้องมี (`email`, `password`, `firstName`, `lastName`, `tenantId`) และฟิลด์เสริม (optional) เช่น `phone`, `position`, `title`, `departmentId` รวมรูปแบบการตอบกลับและโค้ดข้อผิดพลาดที่ชัดเจน (`MISSING_FIELDS`, `INVALID_EMAIL`, `EMAIL_EXISTS`, `WEAK_PASSWORD`).
   1.2 ตรึงการตัดสินใจเชิงพฤติกรรมในเอกสาร: ให้ใช้ self-service route เดียว, บทบาท `Requester`, เปิดใช้งานทันที, มอบ scope โครงการเริ่มต้น (HO).
   1.3 ระบุขอบเขตที่ไม่เปลี่ยน: ไม่แก้ flow การสร้างผู้ใช้โดยแอดมิน ยกเว้นการแยกเส้นทางที่อาจถูกเข้าถึงโดยสาธารณชนโดยไม่ได้ตั้งใจ

2. Phase 2 — ทำให้ backend เป็นมาตรฐาน (ก่อน frontend)
   2.1 รักษา `/api/v2/auth/register-request` เป็น public registration endpoint และเสริมการตรวจสอบ input ให้เข้มงวดและสอดคล้อง (เช่น validate email regex + นโยบายรหัสผ่าน + การจัดการ tenantId ให้ชัด)
   2.2 ระบุว่าคำสั่ง `/api/v2/auth/register` เป็น internal/admin เท่านั้น (หรือ deprecate) เพื่อป้องกันการสมัครแบบกระจัดกระจาย
   2.3 ทำให้ response/error contract สอดคล้องกันหากยังคงมีทั้งสอง endpoint (เพื่อให้ frontend ประมวลผลได้เป็นมาตรฐาน)
   2.4 เพิ่มการตรวจตอนสตาร์ทแอปหรือ runtime guard ว่า `DEFAULT_REQUESTER_PROJECT_CODE` หรือ default project ID ต้องถูกตั้งค่า หากไม่พบให้ล็อกข้อผิดพลาดและคืนข้อความที่ชัดเจน
   2.5 เพิ่ม/ปรับชุดทดสอบ backend ครอบคลุม: happy path, duplicate email, weak password, invalid email, missing default project

3. Phase 3 — รวมหน้า UI ฝั่ง frontend (ขึ้นกับ Phase 2)
   3.1 เก็บหน้า register หน้าเดียวที่ mount ที่ `/register` และผูก action ให้เรียก `registerRequest` ด้วย payload ตามสัญญากลาง
   3.2 ลบหรือ retire หน้าจอ auth-v2 ที่ orphaned และแก้ลิงก์ที่ชี้ไปยัง `/register-request` หรือเพจ pending เพื่อให้ redirect กลับมาที่ `/register` ชั่วคราวหากต้องการ
   3.3 รวม validation และข้อความในฟอร์มให้ตรงกับนโยบาย backend: กฎรหัสผ่านเดียวกัน, ข้อความ per-field ชัดเจน, mapping ข้อผิดพลาด `EMAIL_EXISTS` เป็นข้อความที่อ่านง่าย
   3.4 ใช้ service API เดียวสำหรับการสมัคร (ย้ายให้ component เรียก authServiceV2.registerRequest) หลีกเลี่ยงการมี fetch ที่กระจัดกระจายในหลายที่
   3.5 ทำให้ชื่อฟิลด์ `department` เป็นหนึ่งเดียว (`departmentId` เป็นที่แนะนำ) ทั้งใน store/service/component

4. Phase 4 — ทำความสะอาด, ความเข้ากันได้, และเอกสาร (ทำควบคู่กับท้าย Phase 3)
   4.1 เอา export/import ที่ไม่ใช้แล้วของหน้าจอสมัครและ pending ออก
   4.2 อัปเดตเอกสาร integration และ README ส่วน auth ให้ชัดว่ามี flow เดียวและ endpoint ใครเป็นเจ้าของ
   4.3 เพิ่มบันทึกสำหรับ QA/support ว่าเส้นทางเก่าโดนลบหรือ redirect ผลที่คาดหวังหลังสมัครคือสามารถล็อกอินได้ทันที

5. Phase 5 — ยืนยันและปล่อยใช้งาน
   5.1 ทดสอบ backend: tests ระดับ route สำหรับ `/api/v2/auth/register-request` และ assertions ของ adapter ที่สร้าง requester + scope
   5.2 ทดสอบ frontend: validation tests หรือ manual checks (รหัสผ่าน, ข้อความ duplicate email, redirect หลังสมัคร)
   5.3 Smoke E2E: สมัคร user ใหม่ → ล็อกอิน → ยืนยัน role เป็น `Requester` และมี default HO project scope
   5.4 ตรวจสอบ regression: ฟีเจอร์สร้างผู้ใช้โดยแอดมิน และหน้า admin ที่เกี่ยวกับ pending registrations ยังคงทำงาน

ไฟล์ที่เกี่ยวข้อง (ตัวอย่าง)
- frontend: `frontend/src/App.jsx` — ตรวจสอบ route `/register` และลบ reference ที่พัง
- frontend: `frontend/src/modules/core/auth/pages/Register.jsx` — หน้า register ที่จะใช้เป็น canonical
- frontend: `frontend/src/modules/core/auth-v2/pages/RegisterRequest.tsx` — ปัจจุบัน orphaned; ให้รวม/retire
- frontend: `frontend/src/modules/core/auth-v2/pages/Register.tsx` — direct-register ที่ขัดแย้ง
- frontend: `frontend/src/modules/core/auth-v2/pages/RegistrationPending.tsx` — เพจ pending ที่ไม่มี route
- frontend store: `frontend/src/modules/core/stores/authStoreV2.ts` — ปรับ normalize action `registerRequest`
- frontend service: `frontend/src/modules/shared/services/modules/authServiceV2.ts` — wrapper API สำหรับ register-request
- backend: `backend/api-server/src/v2/index.js` — ตรวจสอบ behavior/validation ของ `/register` กับ `/register-request`
- backend adapter: `backend/api-server/src/v2/adapters/PrismaV1Adapter.js` — logic การสร้าง requester และผูก default scope
- prisma schema: `backend/prisma/schema.prisma` — ดู constraints ของ `User`, `UserRole`, `UserScopeAssignment`
- เอกสารที่ต้องอัปเดต: `docs/04-features/INTEGRATE_V2_REGISTRATION_ADMIN.md`

การตรวจยืนยัน (Verification)
1. รันชุดทดสอบ backend ที่เกี่ยวข้องกับ v2 registration endpoints และ adapter behavior
2. รัน frontend lint/build และตรวจว่า `/register` render/submit ถูกต้อง
3. ทดสอบ API ด้วยมือ:
   - POST `/api/v2/auth/register-request` (payload ถูกต้อง) → คาด 201 + role `Requester` + status `APPROVED`
   - ลองสมัครซ้ำ email เดิมภายใต้ tenant เดียว → คาด 409 `EMAIL_EXISTS`
   - ส่ง email ผิดรูปแบบ หรือ password อ่อน → คาด 400 กับ error code ที่ deterministic
4. ทดสอบ UI flow ด้วยมือ:
   - เข้า `/register`, กรอกข้อมูลจริง, ยืนยัน success state
   - ล็อกอินด้วยบัญชีใหม่ได้ทันที
   - ตรวจ role และ default scope ในหน้า admin/user

การตัดสินใจสำคัญ
- Endpoint canonical: `/api/v2/auth/register-request`
- นโยบายอนุมัติ: เปิดใช้งานทันที (auto-approved)
- ขอบเขตของการแก้ไข: ทำ cleanup ทั้ง frontend + backend + docs (ไม่ใช่แค่ patch เร่งด่วน)
- ข้อเสนอแนะสำหรับ `/api/v2/auth/register`: เก็บไว้สำหรับ internal/admin หรือ deprecate จาก public UX

ข้อควรพิจารณาเพิ่มเติม
1. นโยบาย tenant: ยังคงใช้ `tenantId=1` เป็น default สำหรับ public signup ในตอนแรก หรือพิจารณา derive tenant จากโดเมน/คำเชิญในอนาคต
2. กลยุทธ์ deprecation: แนะนำ soft-deprecate `/register` ก่อน (เพิ่ม log/warning) ก่อนจะ disable จริงจัง
3. QA: เตรียมบัญชีทดสอบและสคริปต์ cleanup สำหรับการรัน E2E ซ้ำ ๆ

---
ไฟล์นี้สร้างขึ้นเพื่อให้คุณแก้ไขต่อได้ ถ้าต้องการผมจะแปลงเป็น checklist รายการงานที่ assign ได้, เพิ่ม owner/ETA, หรือแบ่งเป็น milestone ให้เลย
