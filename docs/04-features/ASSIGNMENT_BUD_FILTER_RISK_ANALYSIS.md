# การวิเคราะห์ความเสี่ยง: กรองโครงการตาม BUD + Select All ในหน้า User Management

**วันที่:** 2026-02-11
**Feature:** Assignment (Responsibilities) - Filter Projects by BUD + Select All Option

---

## สรุปการเปลี่ยนแปลง (Summary)

### ฟีเจอร์ปัจจุบัน (Current Implementation)
```javascript
// UserManagement.jsx - Line 1593
// แสดง ALL active projects (ไม่กรอง)
masterData.projects.filter(p => p.isActive !== false).map(p => ...)
```

**ปัญหา:**
- ✗ แสดงโครงการทั้งหมดในระบบ ไม่คำนึงถึง BUD ของ User
- ✗ ไม่มีปุ่ม "Select All" ทำให้เลือกโครงการเยอะลำบาก
- ✗ ไม่สอดคล้องกับ Requester/Approver ที่มี BUD filter

### การเปลี่ยนแปลงที่ต้องการ (Requested Changes)

**1. กรองโครงการตาม BUD:**
```
User → Department → BUD → Projects (filtered)
```
- แสดงเฉพาะโครงการที่อยู่ใน BUD เดียวกับแผนกของ User
- มีตัวเลือก "แสดงทั้งหมด" (toggle) เหมือน Department Manager

**2. เพิ่มปุ่ม "เลือกทั้งหมด" (Select All):**
- ✓ เลือกทั้งหมดในโครงการที่แสดง (ตาม filter)
- ✓ ยกเลิกทั้งหมด (Deselect All)

---

## วิเคราะห์ความเสี่ยง (Risk Analysis)

### 🔴 ความเสี่ยงสูง (High Risk)

#### 1. **Data Integrity Risk: การสูญเสียข้อมูล Assignment เดิม**

**สถานการณ์:**
```
User A เดิมมี Assignment:
- Project X (BUD 1) ✓
- Project Y (BUD 2) ✓  ← อยู่คนละ BUD กับแผนกของ User

เมื่อเปิด Edit Modal ครั้งแต่ไป:
- Filter แสดงแค่ BUD 1
- Project Y หายไปจาก UI
- User กด Save → Project Y อาจหายไป!
```

**ผลกระทบ:**
- 🔥 User สูญเสีย assignments ที่มีอยู่แล้ว
- 🔥 Approval Flow อาจเสีย (ถ้า Project Y มีการ auto-assign ไปหา User A)
- 🔥 งานที่กำลังดำเนินการอาจไม่มีคนรับผิดชอบ

**แนวทางแก้ไข:**
```javascript
// Option A: แสดง existing assignments เสมอ (แม้จะข้าม BUD)
const filteredProjects = [
    // Projects ที่เลือกไว้แล้ว (แม้ข้าม BUD)
    ...masterData.projects.filter(p =>
        editAssignmentData.projectIds.includes(p.id)
    ),
    // Projects ที่ filter ตาม BUD
    ...masterData.projects.filter(p =>
        p.budId === currentBudId &&
        !editAssignmentData.projectIds.includes(p.id)
    )
];

// Option B: แสดง warning ถ้ามี assignment ข้าม BUD
const crossBudAssignments = editAssignmentData.projectIds.filter(pid => {
    const project = masterData.projects.find(p => p.id === pid);
    return project?.budId !== currentBudId;
});

if (crossBudAssignments.length > 0) {
    showWarning(`⚠️ คุณมีโครงการข้าม BUD ${crossBudAssignments.length} โครงการ`);
}
```

**คำแนะนำ:** ⭐ ใช้ **Option A + Warning** เพื่อความปลอดภัยสูงสุด

---

#### 2. **Conflict Detection Risk: ความขัดแย้งกับ Scope Permissions**

**สถานการณ์:**
```
User B มี 2 Roles:
1. Requester - Scope: Project A, Project B (BUD 1)
2. Assignee - Assignment: Project C (BUD 2)

ถ้ากรอง Assignment ตาม BUD → User จะไม่เห็น Project C
```

**ผลกระทบ:**
- 🔥 Requester scope vs Assignee assignment ไม่ตรงกัน
- 🔥 User อาจได้รับงานจาก Project ที่ไม่ได้มี Requester scope
- 🔥 สับสนในการจัดการ Multi-Role

**แนวทางแก้ไข:**
```javascript
// Backend: checkAssignmentConflicts() ควรตรวจสอบ BUD conflicts
async checkAssignmentConflicts(userId, jobTypeIds, projectIds) {
    // ตรวจสอบ existing conflicts
    const existingConflicts = await this.checkExistingConflicts(...);

    // NEW: ตรวจสอบ BUD conflicts
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true }
    });

    const userBudId = user.department?.budId;
    const crossBudProjects = projectIds.filter(pid => {
        const project = await prisma.project.findUnique({
            where: { id: pid }
        });
        return project?.budId !== userBudId;
    });

    return {
        existingConflicts,
        crossBudProjects,  // NEW: แจ้งเตือนโครงการข้าม BUD
        warning: crossBudProjects.length > 0
            ? `มีโครงการข้าม BUD ${crossBudProjects.length} โครงการ`
            : null
    };
}
```

**คำแนะนำ:** ⭐ เพิ่ม BUD conflict detection ใน Backend

---

### 🟡 ความเสี่ยงปานกลาง (Medium Risk)

#### 3. **Migration Risk: ข้อมูลเดิมที่ไม่ match filter**

**สถานการณ์:**
```sql
-- ตรวจสอบ assignments ที่ข้าม BUD
SELECT
    u.id,
    u.email,
    u.department_id,
    d.bud_id as user_bud,
    p.id as project_id,
    p.name as project_name,
    p.bud_id as project_bud
FROM users u
JOIN departments d ON u.department_id = d.id
JOIN project_job_assignments pja ON pja.assignee_id = u.id
JOIN projects p ON pja.project_id = p.id
WHERE d.bud_id != p.bud_id;  -- ข้าม BUD!
```

**ผลกระทบ:**
- ⚠️ อาจมีข้อมูลเก่าไม่ตรงกับ rule ใหม่
- ⚠️ Admin ต้องตัดสินใจว่าจะ migrate ยังไง

**แนวทางแก้ไข:**
1. **ตรวจสอบข้อมูลก่อน deploy:**
```sql
-- Migration Check Script
SELECT
    COUNT(*) as cross_bud_assignments,
    COUNT(DISTINCT u.id) as affected_users
FROM users u
JOIN departments d ON u.department_id = d.id
JOIN project_job_assignments pja ON pja.assignee_id = u.id
JOIN projects p ON pja.project_id = p.id
WHERE d.bud_id != p.bud_id;
```

2. **สร้าง Migration Plan:**
```markdown
ถ้ามีข้อมูลข้าม BUD:
- Option 1: Keep ไว้ (แสดง warning)
- Option 2: Auto-remove (อันตราย!)
- Option 3: Manual review (ปลอดภัยที่สุด)
```

**คำแนะนำ:** ⭐ ใช้ **Option 1 (Keep + Warning)** ให้ Admin review manual

---

#### 4. **Performance Risk: "Select All" กับโครงการเยอะ**

**สถานการณ์:**
```javascript
// ถ้า BUD มี 500+ projects
const handleSelectAll = () => {
    const allProjectIds = filteredProjects.map(p => p.id);  // 500 IDs!
    setEditAssignmentData({
        ...editAssignmentData,
        projectIds: allProjectIds
    });

    // Backend: checkAssignmentConflicts(userId, jobTypeIds, 500 projectIds)
    // → อาจช้า!
};
```

**ผลกระทบ:**
- ⚠️ UI อาจค้าง (state update 500 items)
- ⚠️ Backend conflict check อาจช้า (500 projects × N job types)
- ⚠️ Database: 500 rows insert ใน `project_job_assignments`

**แนวทางแก้ไข:**
```javascript
// 1. Debounce conflict check
const [conflictCheckTimeout, setConflictCheckTimeout] = useState(null);

const handleProjectChange = (newProjectIds) => {
    setEditAssignmentData({ ...editAssignmentData, projectIds: newProjectIds });

    // Debounce conflict check (รอ 1 วินาที)
    if (conflictCheckTimeout) clearTimeout(conflictCheckTimeout);
    setConflictCheckTimeout(setTimeout(() => {
        checkConflicts(newProjectIds);  // ตรวจสอบทีเดียวหลังหยุดเลือก
    }, 1000));
};

// 2. แสดง warning ก่อน Select All
const handleSelectAll = () => {
    if (filteredProjects.length > 100) {
        Swal.fire({
            title: 'ยืนยันเลือกทั้งหมด?',
            text: `คุณกำลังเลือก ${filteredProjects.length} โครงการ`,
            icon: 'warning',
            showCancelButton: true
        }).then(result => {
            if (result.isConfirmed) doSelectAll();
        });
    } else {
        doSelectAll();
    }
};

// 3. Backend: Batch insert optimization
await prisma.projectJobAssignment.createMany({
    data: projectIds.map(pid => ({
        projectId: pid,
        jobTypeId: jid,
        assigneeId: userId,
        tenantId,
        isActive: true
    })),
    skipDuplicates: true  // ข้าม duplicates
});
```

**คำแนะนำ:** ⭐ Implement debounce + warning + batch insert

---

### 🟢 ความเสี่ยงต่ำ (Low Risk)

#### 5. **UX Confusion Risk: Toggle "แสดงทั้งหมด" อาจสับสน**

**สถานการณ์:**
- User เปิด filter → เห็น 10 โครงการ
- User กด "แสดงทั้งหมด" → เห็น 500 โครงการ 😱
- User สับสน: "ทำไมโครงการเยอะขึ้นเยอะจัง"

**แนวทางแก้ไข:**
```jsx
<label className="flex items-center gap-2 cursor-pointer">
    <input
        type="checkbox"
        checked={showAllProjects}
        onChange={(e) => setShowAllProjects(e.target.checked)}
        className="w-4 h-4 rounded"
    />
    <span className="text-xs text-gray-600">
        แสดงโครงการข้าม BUD
        {!showAllProjects && (
            <span className="text-amber-600 font-medium">
                {' '}(แสดงเฉพาะ BUD {currentBudName})
            </span>
        )}
    </span>
</label>

{/* Counter */}
<div className="text-xs text-gray-500 mt-1">
    แสดง {filteredProjects.length} จากทั้งหมด {masterData.projects.length} โครงการ
</div>
```

**คำแนะนำ:** ⭐ แสดง label ชัดเจน + counter

---

#### 6. **API Impact Risk: Backend คาดหวัง format อะไร**

**การตรวจสอบ:**
```javascript
// Backend: saveUserAssignments() - adminService.js (approx line 752)
// ไม่มีการตรวจสอบ BUD → รับ projectIds อะไรก็ได้

// ดังนั้นการ filter ที่ Frontend จะไม่กระทบ Backend API
```

**ผลกระทบ:** ✅ ไม่มี - Backend รับ array of projectIds ใดๆ ก็ได้

---

## สรุปความเสี่ยงและแนวทางแก้ไข (Summary & Recommendations)

### ตาราง Risk Matrix

| Risk | Level | Impact | Probability | Mitigation Priority |
|------|-------|--------|-------------|-------------------|
| Data Loss (existing assignments) | 🔴 High | Critical | High | ⭐⭐⭐ Must Fix |
| Scope Conflict | 🔴 High | High | Medium | ⭐⭐⭐ Must Fix |
| Migration Issues | 🟡 Medium | Medium | Medium | ⭐⭐ Should Fix |
| Performance (Select All) | 🟡 Medium | Low | Low | ⭐ Nice to Have |
| UX Confusion | 🟢 Low | Low | Medium | ⭐ Nice to Have |
| API Impact | 🟢 None | None | None | ✅ No Action |

---

## Implementation Checklist

### Phase 1: Safety First (Must Do)
- [ ] **Preserve Existing Assignments** - แสดง assignments เดิมเสมอ (แม้ข้าม BUD)
- [ ] **Add Cross-BUD Warning** - แจ้งเตือนถ้ามีโครงการข้าม BUD
- [ ] **Backend Conflict Check** - เพิ่ม BUD conflict detection
- [ ] **Migration Check Script** - ตรวจสอบข้อมูลเดิมก่อน deploy

### Phase 2: Feature Implementation
- [ ] **Filter Projects by BUD** - กรองโครงการตามแผนก → BUD
- [ ] **Add "Show All" Toggle** - เพิ่มตัวเลือกแสดงข้าม BUD
- [ ] **Add "Select All" Button** - เลือกทั้งหมด (filtered)
- [ ] **Add Project Counter** - แสดงจำนวนโครงการที่แสดง vs ทั้งหมด

### Phase 3: Optimization
- [ ] **Debounce Conflict Check** - ลด API calls
- [ ] **Batch Insert** - optimize database operations
- [ ] **Warning for Large Select** - แจ้งเตือนถ้าเลือกเยอะ (>100)

### Phase 4: Testing
- [ ] **Test: Existing assignments preserved** - ทดสอบว่าข้อมูลเก่าไม่หาย
- [ ] **Test: Cross-BUD warning** - ทดสอบ warning แสดงถูกต้อง
- [ ] **Test: Select All performance** - ทดสอบกับ 500+ โครงการ
- [ ] **Test: Multi-role conflicts** - ทดสอบกับ user ที่มีหลาย role

---

## Code Example: Recommended Implementation

### Frontend: UserManagement.jsx

```javascript
// 1. Add state for "Show All Projects" toggle
const [showAllAssignmentProjects, setShowAllAssignmentProjects] = useState(false);

// 2. Filter projects by BUD (with existing assignments preserved)
const getFilteredAssignmentProjects = () => {
    const selectedUserDeptId = editModal.user?.departmentId;
    const selectedDeptObj = masterData.departments.find(d => d.id == selectedUserDeptId);
    const currentBudId = selectedDeptObj?.bud_id;

    // If no BUD or "Show All" enabled → show all
    if (!currentBudId || showAllAssignmentProjects) {
        return masterData.projects.filter(p => p.isActive !== false);
    }

    // Filter by BUD, BUT preserve existing assignments
    const existingAssignmentIds = editAssignmentData.projectIds || [];

    return masterData.projects.filter(p =>
        p.isActive !== false && (
            p.budId === currentBudId ||  // Same BUD
            existingAssignmentIds.includes(p.id)  // OR already assigned (even if cross-BUD)
        )
    );
};

// 3. Detect cross-BUD assignments
const getCrossBudAssignments = () => {
    const selectedUserDeptId = editModal.user?.departmentId;
    const selectedDeptObj = masterData.departments.find(d => d.id == selectedUserDeptId);
    const currentBudId = selectedDeptObj?.bud_id;

    if (!currentBudId) return [];

    return editAssignmentData.projectIds
        .map(pid => masterData.projects.find(p => p.id === pid))
        .filter(p => p && p.budId !== currentBudId);
};

// 4. Select All handler
const handleSelectAllProjects = () => {
    const filteredProjects = getFilteredAssignmentProjects();

    // Warning for large selection
    if (filteredProjects.length > 100) {
        Swal.fire({
            title: 'ยืนยันเลือกทั้งหมด?',
            text: `คุณกำลังเลือก ${filteredProjects.length} โครงการ`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        }).then(result => {
            if (result.isConfirmed) {
                doSelectAllProjects(filteredProjects);
            }
        });
    } else {
        doSelectAllProjects(filteredProjects);
    }
};

const doSelectAllProjects = (filteredProjects) => {
    const allIds = filteredProjects.map(p => p.id);
    setEditAssignmentData({
        ...editAssignmentData,
        projectIds: allIds
    });
};

// 5. Deselect All handler
const handleDeselectAllProjects = () => {
    setEditAssignmentData({
        ...editAssignmentData,
        projectIds: []
    });
};

// 6. UI Implementation
<div>
    {/* Header with Toggle */}
    <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">
            โครงการที่ดูแล (Projects)
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={showAllAssignmentProjects}
                onChange={(e) => setShowAllAssignmentProjects(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-xs text-gray-500">แสดงข้าม BUD</span>
        </label>
    </div>

    {/* Warning: Cross-BUD Assignments */}
    {getCrossBudAssignments().length > 0 && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            ⚠️ คุณมีโครงการข้าม BUD {getCrossBudAssignments().length} โครงการ: {' '}
            {getCrossBudAssignments().map(p => p.name).join(', ')}
        </div>
    )}

    {/* Select All / Deselect All */}
    <div className="flex gap-2 mb-2">
        <button
            type="button"
            onClick={handleSelectAllProjects}
            className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200"
        >
            ✓ เลือกทั้งหมด
        </button>
        <button
            type="button"
            onClick={handleDeselectAllProjects}
            className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 border border-gray-200"
        >
            ✗ ยกเลิกทั้งหมด
        </button>
    </div>

    {/* Project List */}
    <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto p-2 bg-white">
        {getFilteredAssignmentProjects().map(p => {
            const isCrossBud = getCrossBudAssignments().some(cb => cb.id === p.id);
            return (
                <label
                    key={p.id}
                    className={`flex items-center p-1.5 hover:bg-gray-50 rounded cursor-pointer ${
                        isCrossBud ? 'bg-amber-50' : ''
                    }`}
                >
                    <input
                        type="checkbox"
                        className="h-4 w-4 text-amber-600 rounded border-gray-300"
                        checked={editAssignmentData.projectIds.includes(p.id)}
                        onChange={(e) => {
                            const newIds = e.target.checked
                                ? [...editAssignmentData.projectIds, p.id]
                                : editAssignmentData.projectIds.filter(x => x !== p.id);
                            setEditAssignmentData({
                                ...editAssignmentData,
                                projectIds: newIds
                            });
                        }}
                    />
                    <span className={`ml-2 text-sm truncate ${
                        isCrossBud ? 'text-amber-700 font-medium' : 'text-gray-700'
                    }`}>
                        {p.name} ({p.code})
                        {isCrossBud && ' ⚠️'}
                    </span>
                </label>
            );
        })}
    </div>

    {/* Counter */}
    <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>เลือกแล้ว: {editAssignmentData.projectIds.length}</span>
        <span>แสดง: {getFilteredAssignmentProjects().length} / {masterData.projects.filter(p => p.isActive !== false).length}</span>
    </div>
</div>
```

### Backend: Enhanced Conflict Check

```javascript
// adminService.js - checkAssignmentConflicts()
checkAssignmentConflicts: async (userId, jobTypeIds, projectIds) => {
    try {
        // 1. Existing conflict check (unchanged)
        const conflicts = await httpClient.post('/admin/check-assignment-conflicts', {
            userId,
            jobTypeIds,
            projectIds
        });

        // 2. NEW: BUD conflict check
        const userResponse = await httpClient.get(`/users/${userId}`);
        const user = userResponse.data.data;
        const userBudId = user.department?.budId;

        if (userBudId) {
            const crossBudProjects = [];

            for (const projectId of projectIds) {
                const projectResponse = await httpClient.get(`/projects/${projectId}`);
                const project = projectResponse.data.data;

                if (project.budId !== userBudId) {
                    crossBudProjects.push({
                        id: project.id,
                        name: project.name,
                        budId: project.budId,
                        budName: project.bud?.name
                    });
                }
            }

            return {
                ...conflicts.data,
                crossBudProjects,
                crossBudWarning: crossBudProjects.length > 0
                    ? `พบโครงการข้าม BUD ${crossBudProjects.length} โครงการ`
                    : null
            };
        }

        return conflicts.data;
    } catch (error) {
        console.error('checkAssignmentConflicts error:', error);
        throw error;
    }
}
```

---

## Testing Strategy

### Unit Tests
```javascript
describe('Assignment BUD Filter', () => {
    test('should filter projects by user BUD', () => {
        const user = { departmentId: 1 };
        const dept = { id: 1, budId: 10 };
        const projects = [
            { id: 1, budId: 10 },  // Same BUD
            { id: 2, budId: 20 }   // Different BUD
        ];

        const filtered = getFilteredAssignmentProjects(user, dept, projects, []);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe(1);
    });

    test('should preserve existing cross-BUD assignments', () => {
        const user = { departmentId: 1 };
        const dept = { id: 1, budId: 10 };
        const projects = [
            { id: 1, budId: 10 },
            { id: 2, budId: 20 }
        ];
        const existingAssignments = [2];  // Project 2 already assigned

        const filtered = getFilteredAssignmentProjects(user, dept, projects, existingAssignments);
        expect(filtered).toHaveLength(2);  // Both shown!
    });
});
```

### Manual Test Cases

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC1: Filter by BUD | 1. Edit user from Dept A (BUD 1)<br>2. Open Assignment section | Show only BUD 1 projects |
| TC2: Preserve existing | 1. User has Project X (BUD 2)<br>2. Edit user from Dept A (BUD 1) | Project X still shown with warning |
| TC3: Select All | 1. Click "เลือกทั้งหมด"<br>2. Check selected count | All filtered projects selected |
| TC4: Show All toggle | 1. Toggle "แสดงข้าม BUD"<br>2. Check project count | All projects shown |
| TC5: Large selection | 1. BUD with 200 projects<br>2. Click Select All | Warning dialog shown |

---

## Deployment Plan

### Pre-Deployment
1. **Data Audit:**
```sql
-- Run this query in production to check cross-BUD assignments
SELECT
    u.id,
    u.email,
    d.name as dept_name,
    d.bud_id as user_bud,
    p.name as project_name,
    p.bud_id as project_bud
FROM users u
JOIN departments d ON u.department_id = d.id
JOIN project_job_assignments pja ON pja.assignee_id = u.id
JOIN projects p ON pja.project_id = p.id
WHERE d.bud_id != p.bud_id
ORDER BY u.id;
```

2. **Backup:**
```sql
-- Backup assignments before deployment
CREATE TABLE project_job_assignments_backup_20260211 AS
SELECT * FROM project_job_assignments;
```

### Deployment Steps
1. Deploy Backend changes (conflict check enhancement)
2. Deploy Frontend changes (filter + select all)
3. Monitor error logs for 24 hours
4. Review cross-BUD warnings in production

### Rollback Plan
- Frontend: Revert commit (no data impact)
- Backend: Restore from backup if needed

---

## Conclusion

การเพิ่ม BUD filter + Select All เป็น **feature ที่มีประโยชน์** แต่มี **ความเสี่ยงสูง** ถ้าไม่ระวัง:

### ✅ ทำถูกต้อง (Safe Implementation)
- Preserve existing assignments (แม้ข้าม BUD)
- Show warnings for cross-BUD
- Add "Show All" toggle
- Implement Select All safely

### ❌ อย่าทำ (Dangerous)
- อย่าซ่อน/ลบ existing assignments
- อย่าบังคับ filter โดยไม่มี toggle
- อย่า Select All โดยไม่มี warning (large data)
- อย่า deploy โดยไม่ audit ข้อมูลก่อน

### 🎯 Recommendation
**ให้ implement ตาม Code Example ข้างต้น** ซึ่งรวม safety measures ทั้งหมดแล้ว

---

**เอกสารนี้สร้างโดย:** Claude Sonnet 4.5
**วันที่:** 2026-02-11
**Status:** ✅ Ready for Implementation
