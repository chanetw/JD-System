# BUD-Level Assignment UI Implementation Guide

**ไฟล์:** `/Users/chanetw/Documents/DJ-System/frontend/src/modules/features/admin/pages/UserManagement.jsx`

**สถานะ:** Backend เสร็จ 100%, Frontend Logic เสร็จ 80%, **เหลือ UI Section 20%**

---

## สิ่งที่ทำเสร็จแล้ว ✅

### 1. State (Line 85-86)
```javascript
// ✅ เพิ่ม budIds แล้ว
const [editAssignmentData, setEditAssignmentData] = useState({
    jobTypeIds: [],
    budIds: [],      // ✅ NEW
    projectIds: []
});
const [initialAssignmentData, setInitialAssignmentData] = useState({
    jobTypeIds: [],
    budIds: [],      // ✅ NEW
    projectIds: []
});
```

### 2. Load Assignments (Line 526-555)
```javascript
// ✅ รองรับ format ใหม่แล้ว { budAssignments: [], projectAssignments: [] }
const assignments = await adminService.getUserAssignments(userToEdit.id);
const { budAssignments = [], projectAssignments = [] } = assignments;

const jobTypeIds = [...new Set([
    ...budAssignments.map(a => a.jobTypeId),
    ...projectAssignments.map(a => a.jobTypeId)
])];

const budIds = [...new Set(budAssignments.map(a => a.budId))];      // ✅ NEW
const projectIds = [...new Set(projectAssignments.map(a => a.projectId))];

setEditAssignmentData({ jobTypeIds, budIds, projectIds });
```

### 3. Change Detection (Line 653-656)
```javascript
// ✅ เพิ่ม budsChanged แล้ว
const jobTypesChanged = ...;
const budsChanged = JSON.stringify(editAssignmentData.budIds?.sort() || []) !==
                    JSON.stringify(initialAssignmentData.budIds?.sort() || []);
const projectsChanged = ...;
assignmentsChanged = jobTypesChanged || budsChanged || projectsChanged;
```

### 4. Save (Line 769)
```javascript
// ✅ ส่ง budIds ไปแล้ว
await adminService.saveUserAssignments(editModal.user.id, editAssignmentData);
// editAssignmentData มี { jobTypeIds, budIds, projectIds }
```

---

## สิ่งที่เหลือต้องทำ: เพิ่ม UI Section ❌

**ตำแหน่ง:** ประมาณบรรทัด 1585-1590 (หลัง Job Types section, ก่อน Projects section)

### ค้นหาจุดนี้:
```javascript
// ค้นหาส่วนนี้ใน UserManagement.jsx
<div className="text-xs text-right text-gray-400 mt-1">
    เลือกแล้ว: {editAssignmentData.jobTypeIds.length}
</div>
</div>  {/* ปิด Job Types section */}

{/* ⚠️ เพิ่ม BUD Selection ตรงนี้! */}

{/* Projects Select */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        โครงการที่ดูแล (Projects)
    </label>
```

### Code ที่ต้องเพิ่ม:

```jsx
{/* ===== เพิ่มส่วนนี้ระหว่าง Job Types และ Projects ===== */}

{/* BUD-Level Selection (NEW!) */}
<div className="mb-4">
    <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold text-indigo-900">
            💼 ระดับ BUD (ครอบคลุมทุกโครงการใน BUD)
        </label>
        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => {
                    const allBudIds = masterData.buds.map(b => b.id);
                    setEditAssignmentData({
                        ...editAssignmentData,
                        budIds: allBudIds
                    });
                }}
                className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 border border-indigo-200"
            >
                ✓ เลือกทั้งหมด
            </button>
            <button
                type="button"
                onClick={() => {
                    setEditAssignmentData({
                        ...editAssignmentData,
                        budIds: []
                    });
                }}
                className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 border border-gray-200"
            >
                ✗ ยกเลิกทั้งหมด
            </button>
        </div>
    </div>

    {/* Info Box */}
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3 text-sm">
        <div className="flex items-start gap-2">
            <span className="text-indigo-600 text-lg">ℹ️</span>
            <div className="text-indigo-800">
                <strong>BUD-Level Assignment:</strong> เลือก BUD ครั้งเดียว = ครอบคลุมทุกโครงการใน BUD นั้นอัตโนมัติ
                <br />
                <span className="text-xs text-indigo-600">
                    • โครงการใหม่ใน BUD จะ inherit ความรับผิดชอบอัตโนมัติ
                    <br />
                    • Project-level มี priority สูงกว่า (สำหรับ override)
                </span>
            </div>
        </div>
    </div>

    {/* BUD Selection List */}
    <div className="border border-indigo-200 rounded-md max-h-48 overflow-y-auto p-2 bg-white">
        {masterData.buds && masterData.buds.length > 0 ? (
            masterData.buds
                .filter(b => b.isActive !== false)
                .map(bud => {
                    const projectCount = masterData.projects.filter(
                        p => p.budId === bud.id || p.bud_id === bud.id
                    ).length;

                    return (
                        <label
                            key={bud.id}
                            className={`flex items-center justify-between p-2 hover:bg-indigo-50 rounded cursor-pointer ${
                                editAssignmentData.budIds?.includes(bud.id) ? 'bg-indigo-50' : ''
                            }`}
                        >
                            <div className="flex items-center flex-1">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    checked={editAssignmentData.budIds?.includes(bud.id) || false}
                                    onChange={(e) => {
                                        const id = bud.id;
                                        const newIds = e.target.checked
                                            ? [...(editAssignmentData.budIds || []), id]
                                            : (editAssignmentData.budIds || []).filter(x => x !== id);
                                        setEditAssignmentData({
                                            ...editAssignmentData,
                                            budIds: newIds
                                        });
                                    }}
                                />
                                <div className="ml-3 flex-1">
                                    <span className="text-sm font-medium text-gray-900">
                                        💼 {bud.name}
                                    </span>
                                    {bud.code && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({bud.code})
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                    {projectCount} โครงการ
                                </span>
                                {editAssignmentData.budIds?.includes(bud.id) && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                        ✓ ครอบคลุมทุกโครงการ
                                    </span>
                                )}
                            </div>
                        </label>
                    );
                })
        ) : (
            <div className="text-sm text-gray-400 p-2">ไม่มีข้อมูล BUDs</div>
        )}
    </div>

    {/* Counter & Summary */}
    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
        <span>เลือกแล้ว: {editAssignmentData.budIds?.length || 0} BUD</span>
        {editAssignmentData.budIds && editAssignmentData.budIds.length > 0 && (
            <span className="text-indigo-600 font-medium">
                ครอบคลุม ~
                {masterData.projects.filter(p =>
                    editAssignmentData.budIds.includes(p.budId || p.bud_id)
                ).length} โครงการ
            </span>
        )}
    </div>
</div>

{/* ===== จบส่วนที่เพิ่ม ===== */}
```

---

## ขั้นตอนการเพิ่ม UI (Manual)

### 1. เปิดไฟล์
```bash
code /Users/chanetw/Documents/DJ-System/frontend/src/modules/features/admin/pages/UserManagement.jsx
```

### 2. ค้นหาบรรทัดนี้ (ประมาณบรรทัด 1584-1590):
```javascript
<div className="text-xs text-right text-gray-400 mt-1">
    เลือกแล้ว: {editAssignmentData.jobTypeIds.length}
</div>
</div>

{/* Projects Select */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        โครงการที่ดูแล (Projects)
```

### 3. Copy code ด้านบน วางระหว่าง `</div>` และ `{/* Projects Select */}`

### 4. Save ไฟล์

---

## ผลลัพธ์ที่คาดหวัง

### UI ที่จะได้:

```
┌─────────────────────────────────────────────┐
│ ความรับผิดชอบ (Assignee)                    │
├─────────────────────────────────────────────┤
│                                             │
│ 📋 ประเภทงาน (Job Types)                   │
│   ☑ Design                                  │
│   ☑ Content                                 │
│   เลือกแล้ว: 2                             │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│ 💼 ระดับ BUD       [✓ เลือกทั้งหมด] [✗ ยกเลิก]│
│                                             │
│ ℹ️ BUD-Level Assignment: เลือก BUD ครั้งเดียว│
│    = ครอบคลุมทุกโครงการใน BUD อัตโนมัติ   │
│                                             │
│ ┌───────────────────────────────────────┐  │
│ │ ☑ 💼 Creative (45 โครงการ) ✓ ครอบคลุม│  │
│ │ ☑ 💼 Marketing (32 โครงการ) ✓ ครอบคลุม│  │
│ │ ☐ 💼 IT (12 โครงการ)                 │  │
│ └───────────────────────────────────────┘  │
│ เลือกแล้ว: 2 BUD  ครอบคลุม ~77 โครงการ    │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│ 🏗️ ระดับ Project (Override)                │
│   ☑ VIP Campaign (Override)                 │
│   ☐ Spring Campaign                         │
│   เลือกแล้ว: 1                             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ทดสอบหลังเพิ่ม UI

### 1. ทดสอบเลือก BUD:
- เปิด Edit User modal
- เลือก BUD "Creative"
- ดูว่าแสดง "ครอบคลุม X โครงการ"
- กด Save → ดูใน Console log ว่าส่ง budIds ไปหรือไม่

### 2. ทดสอบ Select All / Deselect All:
- กดปุ่ม "เลือกทั้งหมด" → BUD ทั้งหมดควรติ๊ก
- กดปุ่ม "ยกเลิกทั้งหมด" → BUD ทั้งหมดควรไม่ติ๊ก

### 3. ทดสอบ Load ข้อมูล:
- Save BUD assignments
- Reload page
- Edit user อีกครั้ง → BUD ที่เลือกไว้ควรติ๊กอยู่

---

## Fallback: ถ้าเพิ่ม UI ไม่ได้

ถ้ามีปัญหาในการเพิ่ม UI manually, สามารถทดสอบ Backend ด้วย API โดยตรง:

```javascript
// Test ใน Browser Console
await fetch('http://localhost:3001/api/users/1/assignments', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
        jobTypeIds: [1, 2],
        budIds: [10],        // BUD-level
        projectIds: [101]    // Project-level
    })
});
```

---

## Next Steps

หลังเพิ่ม UI เสร็จ:

1. ✅ รัน Migration (สร้าง table จริง)
   ```bash
   psql ... -f database/migrations/add_bud_job_assignments.sql
   ```

2. ✅ ทดสอบ End-to-End:
   - เลือก BUD → Save → Reload → ตรวจสอบว่าโหลดกลับมาถูกต้อง

3. ✅ Update Auto-Assignment Logic (Optional):
   - ให้ระบบ auto-assign งานตาม BUD-level + Project-level priority

4. ✅ Commit & Deploy

---

**สถานะปัจจุบัน:** 80% เสร็จ - เหลือแค่เพิ่ม UI Section!
