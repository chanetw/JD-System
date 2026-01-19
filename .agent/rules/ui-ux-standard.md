# UI/UX Standard

## Design Philosophy
ยึดหลักการออกแบบที่ทันสมัย สะอาด และใช้งานง่าย (Modern, Clean, and User-Friendly)

## Color Palette
ใช้โทนสีหลักเป็น **Rose/Pink** เพื่อให้ความรู้สึกสดใสและมีความเป็นกันเอง
- **Primary Color:** `#F43F5E` (Rose 500)
- **Secondary Color:** `#E11D48` (Rose 600)
- **Background:** `#FFF1F2` (Rose 50) - สำหรับพื้นหลังทั่วไป
- **Contrast:** `#881337` (Rose 900) - สำหรับข้อความหัวข้อหรือจุดที่ต้องการเน้น

## Layout & Components
อ้างอิงโครงสร้างจาก HTML ต้นแบบทั้ง 11 หน้าในโฟลเดอร์ `HTML Original/dj-system/` โดยเคร่งครัด
**Path:** `/Users/chanetw/Documents/DJ-System/HTML Original/dj-system/`

โดยมีการจัดวางองค์ประกอบดังนี้:
1.  **Sidebar/Navigation:** ด้านซ้ายหรือด้านบน (Responsive) ใช้สีโทนเข้มหรือไล่เฉดสี
2.  **Content Area:** พื้นที่หลักตรงกลาง ใช้ Card หรือ Container สีขาวเพื่อแบ่งเนื้อหา
3.  **Typhography:** ใช้ฟอนต์ที่อ่านง่าย รองรับภาษาไทย (เช่น Sarabun, Kanit, หรือ System Font)

## Styling Guide
- ใช้ **Tailwind CSS** ในการตกแต่งเป็นหลัก
- **Buttons:**
    - Primary: `bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow`
    - Secondary: `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg`
- **Cards:** `bg-white rounded-xl shadow-sm border border-gray-100`
- **Inputs:** `border-gray-300 focus:ring-rose-500 focus:border-rose-500 rounded-lg`

> **Note:** การปรับแต่งหน้าจอใดๆ ต้องคำนึงถึงความสม่ำเสมอ (Consistency) กับหน้าต้นแบบที่มีอยู่แล้ว
