# 📋 DJ-System Development Plan
## แผนพัฒนาระบบ Design Job System

> **สร้างจาก:** Meeting Transcript + Current Codebase Analysis  
> **วันที่สร้าง:** 22 มกราคม 2569  
> **สถานะ:** Draft v1.0

---

## 📑 สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สถานะปัจจุบัน](#2-สถานะปัจจุบัน)
3. [Feature Roadmap](#3-feature-roadmap)
4. [รายละเอียด Feature](#4-รายละเอียด-feature)
5. [Database Changes](#5-database-changes)
6. [Frontend Changes](#6-frontend-changes)
7. [API Changes](#7-api-changes)
8. [Timeline & Priority](#8-timeline--priority)

---

## 1. ภาพรวมระบบ

### 1.1 วัตถุประสงค์
ระบบ DJ-System เป็นระบบจัดการงานออกแบบสำหรับ:
- **Marketing Team** - ผู้สั่งงาน (Requesters)
- **CC Team** - ผู้ตรวจสอบ/อนุมัติ (Approvers)
- **Graphic Team** - ผู้รับงาน (Assignees)

### 1.2 Workflow หลัก
```
Marketing สร้าง DJ → Head BU อนุมัติ → CC Team อนุมัติ → Graphic รับงาน → ส่งงาน → Complete
```

### 1.3 Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| State | Zustand |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (Planned) |

---

## 2. สถานะปัจจุบัน

### 2.0 👥 Menu Permission Summary (สิทธิ์การเข้าถึงเมนูตาม Role)

#### 🔵 Admin (ผู้ดูแลระบบ)
```
✅ เข้าได้ทุกหน้า - จัดการระบบทั้งหมด
```

| เมนู | สิทธิ์ | หมายเหตุ |
|------|-------|----------|
| 📊 Dashboard | ✅ View | สถิติระดับระบบ |
| 📋 DJ List | ✅ View All | เห็นงานทุกโครงการ |
| ➕ Create DJ | ✅ Create | สร้างงานแทนทุก Role |
| ✅ Approvals Queue | ✅ View All | เห็นงานรออนุมัติทั้งหมด |
| **⚙️ Admin Section** | | |
| - Job Type & SLA | ✅ Full Access | CRUD Job Types + SLA |
| - Job Type Items | ✅ Full Access | จัดการชิ้นงานย่อย |
| - Approval Flow (Master) | ✅ Full Access | ตั้งค่า Master Default |
| - Approval Flow (Override) | ✅ Full Access | ตั้งค่า Override |
| - Assignment Matrix | ✅ Full Access | กำหนดผู้รับงาน |
| - Holiday Calendar | ✅ Full Access | กำหนดวันหยุด |
| - Organization | ✅ Full Access | จัดการ BU/Dept |
| - Users | ✅ Full Access | จัดการผู้ใช้ |
| - Reports | ✅ View All | รายงานทุกประเภท |
| 🎨 Media Portal | ✅ View | ดูไฟล์ทั้งหมด |
| 👤 User Portal | ✅ View | ดูข้อมูลผู้ใช้ทั้งหมด |

---

#### 🟢 Requester (Marketing Team - ผู้สั่งงาน)
```
✅ สร้างงาน, ติดตามงาน, ดูรายงานของตัวเอง
❌ ไม่เข้าหน้า Admin, ไม่อนุมัติงาน
```

| เมนู | สิทธิ์ | หมายเหตุ |
|------|-------|----------|
| 📊 Dashboard | ✅ View | สถิติของ BU ตัวเอง |
| 📋 DJ List | ✅ View (Filtered) | เห็นเฉพาะงานที่สร้างเอง + BU ตัวเอง |
| ➕ Create DJ | ✅ Create | สร้างงานสำหรับ BU ตัวเอง |
| 🔍 Job Detail | ✅ View | ดูรายละเอียดงาน + Chat |
| ✅ Approvals Queue | ❌ No Access | ไม่มีสิทธิ์อนุมัติ |
| ⚙️ Admin Section | ❌ No Access | ไม่เห็นเมนู Admin |
| 🎨 Media Portal | ✅ View (Filtered) | เห็นเฉพาะไฟล์งานตัวเอง |
| 👤 User Portal | ✅ View (Self) | ดูข้อมูลตัวเอง + แก้ไข Profile |

---

#### 🟡 Approver (Head BU / CC Team - ผู้อนุมัติ)
```
✅ สร้างงาน (Auto-approve), อนุมัติงาน, ดูรายงาน
❌ ไม่เข้าหน้า Admin (ยกเว้น Reports)
```

| เมนู | สิทธิ์ | หมายเหตุ |
|------|-------|----------|
| 📊 Dashboard | ✅ View | สถิติของ BU/โครงการที่รับผิดชอบ |
| 📋 DJ List | ✅ View (Filtered) | เห็นงานที่เกี่ยวข้อง + งานรออนุมัติ |
| ➕ Create DJ | ✅ Create | **สร้างได้ + Auto-skip Level ตัวเอง** |
| 🔍 Job Detail | ✅ View + Approve | ดู + อนุมัติ/ปฏิเสธ + Chat |
| ✅ Approvals Queue | ✅ View (Assigned) | เห็นเฉพาะงานที่รออนุมัติจากตัวเอง |
| ⚙️ Admin Section | ⚠️ Partial Access | เข้าได้เฉพาะ Reports |
| - Reports | ✅ View (Filtered) | รายงานของ BU/โครงการที่รับผิดชอบ |
| 🎨 Media Portal | ✅ View (Filtered) | เห็นไฟล์งานที่เกี่ยวข้อง |
| 👤 User Portal | ✅ View (Filtered) | ดูทีมงานใน BU ตัวเอง |

---

#### 🟣 Assignee (Graphic Team - ผู้รับงาน)
```
✅ รับงาน, ทำงาน, ส่งงาน, Cancel/Reject
❌ ไม่สร้างงาน, ไม่อนุมัติงาน, ไม่เข้าหน้า Admin
```

| เมนู | สิทธิ์ | หมายเหตุ |
|------|-------|----------|
| 📊 Dashboard | ✅ View | สถิติงานในมือตัวเอง |
| 📋 DJ List | ✅ View (Filtered) | เห็นเฉพาะงานที่ได้รับมอบหมาย |
| ➕ Create DJ | ❌ No Access | ไม่มีสิทธิ์สร้างงาน |
| 🔍 Job Detail | ✅ View + Actions | ดู + รับงาน/ส่งงาน/Cancel + Chat + Upload |
| ✅ Approvals Queue | ❌ No Access | ไม่มีสิทธิ์อนุมัติ |
| ⚙️ Admin Section | ❌ No Access | ไม่เห็นเมนู Admin |
| 🎨 Media Portal | ✅ View (Filtered) | เห็นเฉพาะไฟล์งานตัวเอง |
| 👤 User Portal | ✅ View (Self) | ดูข้อมูลตัวเอง |

---

### 2.1 ✅ Features ที่ทำเสร็จแล้ว

| Feature | ไฟล์ที่เกี่ยวข้อง | หมายเหตุ |
|---------|------------------|----------|
| Database Integration | `apiService.js`, `apiDatabase.js` | เชื่อมต่อ Supabase แล้ว |
| Auto-Assignment | `AssignmentMatrix.jsx` | กำหนดผู้รับงานตาม Job Type |
| Approval Flow | `ApprovalFlow.jsx` | กำหนดลำดับผู้อนุมัติ 2 Steps |
| Job Type Management | `JobTypeSLA.jsx`, `JobTypeItems.jsx` | CRUD Job Types + SLA |
| Organization Structure | `Organization.jsx` | จัดการ BU/Department |
| User Management | `Users.jsx` | CRUD Users + Roles |
| Holiday Calendar | `HolidayCalendar.jsx` | กำหนดวันหยุดสำหรับ SLA |
| Approvals Queue | `ApprovalsQueue.jsx` | รายการรออนุมัติ |
| Job Detail | `JobDetail.jsx` | รายละเอียดงาน + Chat |

### 2.2 🔧 Features ที่ต้องแก้ไข/เพิ่มเติม

| Feature | สถานะ | Priority |
|---------|--------|----------|
| Urgent Priority Impact | ❌ ยังไม่มี | 🔴 High |
| Approval Master + Override | ⚠️ มีบางส่วน | 🔴 High |
| Auto-Approve for Self-Created Jobs | ❌ ยังไม่มี | 🔴 High |
| Artwork Count per DJ | ❌ ยังไม่มี | 🟡 Medium |
| Graphic Cancel/Reject | ⚠️ มีบางส่วน | 🟡 Medium |
| Reports Dashboard | ❌ ยังไม่มี | 🟡 Medium |
| Work Day Calculation | ⚠️ มีบางส่วน | 🟡 Medium |
| Menu Permission System | ⚠️ มีบางส่วน | 🟡 Medium |
| Cloud Storage | ❌ ยังไม่มี | 🟢 Low |
| In-App Notifications | ⚠️ มี Store แต่ยังไม่ใช้ | 🟢 Low |

---

## 3. Feature Roadmap

### Phase 1: Core Business Logic (สำคัญมาก)
1. ~~Database Integration~~ ✅
2. ~~Approval Flow System~~ ✅
3. **Urgent Priority Impact** ⚠️ (Frontend Ready / Backend Logic Mocked)
   - [x] UI Warning in CreateDJ
   - [x] Service Logic for SLA Shift
   - [ ] Real Database Columns (`priority`, `original_due_date`, `shifted_by`)
4. **Approval Master + Override Pattern**
5. **Auto-Approve for Self-Created Jobs**
6. **Menu Permission System**
7. **Work Day Calculation Enhancement**
8. ~~Notification System Basic~~ ✅ (Refactored & Connected to API)

### Phase 2: Graphic Team Features
1. **Graphic Cancel/Reject Job**
2. **Artwork Count Field**
3. **Job Status Tracking**

### Phase 3: Reports & Analytics
1. **Dashboard Overview**
2. **Drill-down Reports**
3. **Export Features**

### Phase 4: Enhancement
1. **Cloud Storage Integration**
2. **Email Notifications**
3. **In-App Notifications**
4. **Chat Enhancement**

---

## 4. รายละเอียด Feature

### 4.1 🚨 Urgent Priority Impact (ความสำคัญสูงสุด)

#### Business Rules (จาก Meeting)
```
เมื่อมี Job Urgent แทรกเข้ามา:
1. งานอื่นทุก Job ในมือ Graphic คนนั้น → บวก +2 วัน (SLA Shift)
2. Alert/Notify ไปยังทุก Job Owner ที่ได้รับผลกระทบ
3. Head BU ต้องอนุมัติ Job Urgent เท่านั้น
```

#### Database Changes
```sql
-- เพิ่ม column ใน jobs table
ALTER TABLE jobs ADD COLUMN priority VARCHAR(20) DEFAULT 'normal'; -- 'normal' | 'urgent'
ALTER TABLE jobs ADD COLUMN original_due_date TIMESTAMP; -- เก็บ due date เดิมก่อน shift
ALTER TABLE jobs ADD COLUMN shifted_by_job_id INTEGER; -- อ้างอิง job urgent ที่ทำให้ shift

-- สร้าง table เก็บ log การ shift
CREATE TABLE sla_shift_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id),
    urgent_job_id INTEGER REFERENCES jobs(id),
    original_due_date TIMESTAMP,
    new_due_date TIMESTAMP,
    shift_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Frontend Changes

**ไฟล์: `CreateDJ.jsx`**
```jsx
// เพิ่ม Priority selector
const [priority, setPriority] = useState('normal');

// เพิ่ม UI
<div className="form-group">
    <label>ความเร่งด่วน (Priority)</label>
    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="normal">ปกติ (Normal)</option>
        <option value="urgent">ด่วน (Urgent) ⚠️</option>
    </select>
    {priority === 'urgent' && (
        <div className="warning-box">
            ⚠️ งานด่วนจะทำให้งานอื่นในมือ Graphic ถูกเลื่อน Due Date +2 วัน ทุกงาน
        </div>
    )}
</div>
```

**ไฟล์: `apiService.js`**
```javascript
// เพิ่ม function สำหรับ shift SLA
async shiftSLAForUrgentJob(urgentJobId, assigneeId, shiftDays = 2) {
    // 1. ดึงงานทั้งหมดในมือ assignee
    const { data: affectedJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('assignee_id', assigneeId)
        .neq('id', urgentJobId)
        .in('status', ['pending', 'in_progress']);
    
    // 2. Loop shift due date
    for (const job of affectedJobs) {
        const newDueDate = addWorkDays(job.due_date, shiftDays);
        await supabase.from('jobs').update({
            original_due_date: job.original_due_date || job.due_date,
            due_date: newDueDate,
            shifted_by_job_id: urgentJobId
        }).eq('id', job.id);
        
        // 3. Log การ shift
        await supabase.from('sla_shift_logs').insert({
            job_id: job.id,
            urgent_job_id: urgentJobId,
            original_due_date: job.due_date,
            new_due_date: newDueDate,
            shift_days: shiftDays
        });
    }
    
    // 4. Send notifications
    // TODO: Implement notification system
}
```

**ไฟล์: `DJList.jsx`**
```jsx
// เพิ่มแสดง Priority badge และ Shift indicator
<td>
    {job.priority === 'urgent' && (
        <Badge variant="danger">🔥 ด่วน</Badge>
    )}
    {job.shifted_by_job_id && (
        <Badge variant="warning">
            ⏰ ถูกเลื่อน +{job.shift_days || 2} วัน
        </Badge>
    )}
</td>
```

---

### 4.2 🔀 Approval Flow: Master + Override Pattern

> ⚠️ **แนวทาง:** ตั้งค่า **Master Default ที่ Job Type** → โครงการไหนต้องการต่าง → **Override ที่ Project**

#### Business Rules (จาก Meeting)
```
- ตั้ง Master Default ที่ Job Type (ใช้ได้ทุกโครงการ)
- โครงการไหนมี Policy ต่าง → Override ได้
- ลดงานตั้งค่า: ไม่ต้องตั้งทุก Project x Job Type
- ยืดหยุ่น: โครงการพิเศษ Override ได้
```

#### 🎯 Inheritance Pattern

```
Job Type (Master Default)
    ↓
    ├── Project A → ใช้ Master (ไม่มี Override)
    ├── Project B → Override (ทีมบริหารต่างกัน)
    └── Project C → ใช้ Master
```

#### 📊 ตัวอย่างการทำงาน

| Job Type | Master Default | โครงการ Park Grand | โครงการ Sena Park |
|----------|---------------|-------------------|------------------|
| **New KV** | ✅ ต้องอนุมัติ 2 Level | ใช้ Master | ⚠️ **Override:** คน Head BU คนละคน |
| **Resize** | ❌ ไม่ต้องอนุมัติ | ใช้ Master | ⚠️ **Override:** ต้องอนุมัติ 1 Level |
| **Social Media** | ✅ ต้องอนุมัติ 1 Level (CC) | ใช้ Master | ⚠️ **Override:** ไม่ต้องอนุมัติ |

#### โครงสร้างข้อมูล (Master + Override)

```
Job Type "Resize" (Master)
├── default_requires_approval: false
├── default_levels: []
└── default_assignee_id: 20

    ↓ ใช้ทุกโครงการ ยกเว้น...

Override: โครงการ "Sena Park" + "Resize"
├── requires_approval: true  ← Override!
├── levels: [{"level":1,"approvers":[...]}]
└── is_override: true
```

#### Database Changes

```sql
-- ===================================================
-- 1. เพิ่ม Master Default ใน job_types table
-- ===================================================

ALTER TABLE job_types ADD COLUMN IF NOT EXISTS default_requires_approval BOOLEAN DEFAULT true;
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS default_levels JSONB DEFAULT '[]';
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS default_assignee_id INTEGER REFERENCES users(id);

COMMENT ON COLUMN job_types.default_requires_approval IS 'Master: ค่าเริ่มต้นว่างานประเภทนี้ต้องอนุมัติหรือไม่';
COMMENT ON COLUMN job_types.default_levels IS 'Master: Flow การอนุมัติเริ่มต้น (ใช้ทุกโครงการที่ไม่มี Override)';
COMMENT ON COLUMN job_types.default_assignee_id IS 'Master: ผู้รับงานเริ่มต้น';

-- ===================================================
-- 2. สร้าง approval_flows table สำหรับ Override
-- ===================================================

DROP TABLE IF EXISTS approval_flows CASCADE;

CREATE TABLE approval_flows (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE,
    
    -- Override Configuration
    requires_approval BOOLEAN,               -- Override Master
    levels JSONB,                           -- Override Master
    default_assignee_id INTEGER REFERENCES users(id),
    
    -- Flag
    is_override BOOLEAN DEFAULT true,       -- บอกว่านี่คือ Override (ไม่ใช่ Master)
    
    -- Meta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique: 1 โครงการ + 1 Job Type = 1 Override
    UNIQUE(project_id, job_type_id)
);

-- Index
CREATE INDEX idx_approval_flows_project ON approval_flows(project_id);
CREATE INDEX idx_approval_flows_job_type ON approval_flows(job_type_id);

-- Comment
COMMENT ON TABLE approval_flows IS 'Override Flow การอนุมัติสำหรับโครงการที่มี Policy พิเศษ (ถ้าไม่มี = ใช้ Master จาก job_types)';
COMMENT ON COLUMN approval_flows.is_override IS 'true = นี่คือ Override (ไม่ใช่ Master)';
```

#### ตัวอย่างข้อมูล (Master + Override)

```sql
-- ===================================================
-- 1. ตั้ง Master Default ที่ job_types
-- ===================================================

-- Job Type "New KV" → Master: ต้องอนุมัติ 2 Level
UPDATE job_types SET 
    default_requires_approval = true,
    default_levels = '[
        {"level":1,"approvers":[{"userId":5,"roleId":2,"roleName":"Head BU"}],"logic":"any"},
        {"level":2,"approvers":[{"userId":10,"roleId":3,"roleName":"CC Team"}],"logic":"any"}
    ]',
    default_assignee_id = 20
WHERE name = 'New KV';

-- Job Type "Resize" → Master: ไม่ต้องอนุมัติ
UPDATE job_types SET 
    default_requires_approval = false,
    default_levels = '[]',
    default_assignee_id = 20
WHERE name = 'Resize';

-- Job Type "Social Media" → Master: อนุมัติ 1 Level
UPDATE job_types SET 
    default_requires_approval = true,
    default_levels = '[
        {"level":1,"approvers":[{"userId":10,"roleId":3,"roleName":"CC Team"}],"logic":"any"}
    ]',
    default_assignee_id = 21
WHERE name = 'Social Media';

-- ===================================================
-- 2. Override สำหรับโครงการพิเศษ
-- ===================================================

-- โครงการ "Sena Park" (id=2) + "Resize" → Override: ต้องอนุมัติ!
INSERT INTO approval_flows (project_id, job_type_id, requires_approval, levels, default_assignee_id, is_override)
VALUES (2, 2, true, '[
    {"level":1,"approvers":[{"userId":10,"name":"พี่ทิม (CC)"}],"logic":"any"}
]', 22, true);

-- โครงการ "Sena Park" + "New KV" → Override: Head BU คนละคน
INSERT INTO approval_flows (project_id, job_type_id, requires_approval, levels, default_assignee_id, is_override)
VALUES (2, 1, true, '[
    {"level":1,"approvers":[{"userId":6,"name":"วิชัย (Head BU)"}],"logic":"any"},
    {"level":2,"approvers":[{"userId":10,"name":"พี่ทิม (CC)"}],"logic":"any"}
]', 22, true);

-- โครงการ "Sena Park" + "Social Media" → Override: ไม่ต้องอนุมัติ
INSERT INTO approval_flows (project_id, job_type_id, requires_approval, levels, default_assignee_id, is_override)
VALUES (2, 3, false, '[]', 23, true);

-- หมายเหตุ: โครงการ Park Grand (id=1) ไม่มี Override = ใช้ Master ทั้งหมด
```

#### Frontend Changes

**ไฟล์: `JobTypeSLA.jsx` - เพิ่ม Master Default UI**
```jsx
// === เพิ่ม Section สำหรับ Master Default ===
<Card className="mt-6">
    <CardHeader 
        title="Master Default Approval Flow"
        subtitle="กำหนด Flow เริ่มต้นสำหรับทุกโครงการ (สามารถ Override ได้ที่แต่ละโครงการ)"
    />
    
    {/* Toggle: ต้องอนุมัติหรือไม่ */}
    <div className="p-6 border-b">
        <label className="flex items-center gap-3 cursor-pointer">
            <input 
                type="checkbox"
                checked={jobType.default_requires_approval}
                onChange={(e) => handleChange('default_requires_approval', e.target.checked)}
                className="w-5 h-5"
            />
            <div>
                <span className="font-medium">ต้องผ่านการอนุมัติ (Master Default)</span>
                <p className="text-sm text-gray-500">
                    {jobType.default_requires_approval 
                        ? 'งานประเภทนี้ต้องผ่านการอนุมัติ (ใช้ทุกโครงการที่ไม่มี Override)'
                        : '⚡ งานจะส่งตรงไป Graphic โดยไม่ต้องรออนุมัติ'}
                </p>
            </div>
        </label>
    </div>
    
    {/* แสดง Level Editor เฉพาะเมื่อต้องอนุมัติ */}
    {jobType.default_requires_approval && (
        <div className="p-6">
            <h4 className="font-semibold mb-4">Master Approval Levels</h4>
            <ApprovalLevelEditor 
                levels={jobType.default_levels || []}
                onChange={(levels) => handleChange('default_levels', levels)}
            />
        </div>
    )}
    
    {/* Default Assignee */}
    <div className="p-6 border-t">
        <FormSelect 
            label="ผู้รับงานเริ่มต้น (Master Default Assignee)"
            value={jobType.default_assignee_id || ''}
            onChange={(e) => handleChange('default_assignee_id', e.target.value)}
        >
            <option value="">-- เลือกผู้รับงาน --</option>
            {assignees.map(u => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
            ))}
        </FormSelect>
    </div>
</Card>
```

**ไฟล์: `ApprovalFlow.jsx` - ปรับเป็น Override UI**
```jsx
// === States ===
const [selectedProject, setSelectedProject] = useState(null);
const [selectedJobType, setSelectedJobType] = useState(null);
const [masterFlow, setMasterFlow] = useState(null);    // Master จาก Job Type
const [overrideFlow, setOverrideFlow] = useState(null); // Override จาก approval_flows
const [isOverriding, setIsOverriding] = useState(false); // Flag: กำลัง Override หรือไม่

// === Load Master + Override ===
useEffect(() => {
    if (selectedProject && selectedJobType) {
        loadFlows();
    }
}, [selectedProject, selectedJobType]);

const loadFlows = async () => {
    // 1. Load Master จาก Job Type
    const jobType = await api.getJobType(selectedJobType.id);
    setMasterFlow({
        requires_approval: jobType.default_requires_approval,
        levels: jobType.default_levels,
        default_assignee_id: jobType.default_assignee_id
    });
    
    // 2. Load Override (ถ้ามี)
    const override = await api.getApprovalFlowOverride(selectedProject.id, selectedJobType.id);
    if (override) {
        setOverrideFlow(override);
        setIsOverriding(true);
    } else {
        setOverrideFlow(null);
        setIsOverriding(false);
    }
};

// === UI ===
return (
    <div className="approval-flow-page">
        <h1>Override Approval Flow</h1>
        <p className="text-gray-600">กำหนด Override สำหรับโครงการที่มี Policy พิเศษ</p>
        
        {/* เลือก Project + Job Type */}
        <div className="selector-row">
            {/* ... existing selectors ... */}
        </div>
        
        {/* แสดง Master + Override */}
        {selectedProject && selectedJobType && (
            <>
                {/* Master Default (Read-only) */}
                <Card className="mt-6 bg-blue-50">
                    <CardHeader 
                        title={`🔵 Master Default: ${selectedJobType.name}`}
                        subtitle="ค่าเริ่มต้นจาก Job Type (แก้ไขได้ที่หน้า Job Type Management)"
                    />
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="font-medium">ต้องอนุมัติ:</span>
                            <Badge variant={masterFlow.requires_approval ? 'blue' : 'gray'}>
                                {masterFlow.requires_approval ? 'Yes' : 'No (ข้าม)'}
                            </Badge>
                        </div>
                        
                        {masterFlow.requires_approval && (
                            <div>
                                <span className="font-medium">Levels:</span>
                                <div className="mt-2">
                                    {/* แสดง Master Levels (Read-only) */}
                                    <ApprovalLevelViewer levels={masterFlow.levels} />
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
                
                {/* Override Section */}
                <Card className="mt-6">
                    <CardHeader 
                        title={`⚠️ Override: ${selectedProject.name} → ${selectedJobType.name}`}
                        subtitle="กำหนด Flow พิเศษสำหรับโครงการนี้ (Override Master)"
                    />
                    
                    {/* Toggle: ใช้ Override หรือไม่ */}
                    <div className="p-6 border-b">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={isOverriding}
                                onChange={(e) => setIsOverriding(e.target.checked)}
                                className="w-5 h-5"
                            />
                            <div>
                                <span className="font-medium">Override Master Default</span>
                                <p className="text-sm text-gray-500">
                                    {isOverriding 
                                        ? '⚠️ โครงการนี้จะใช้ Flow พิเศษ (ไม่ใช้ Master)'
                                        : '✅ ใช้ Master Default (ไม่มี Override)'}
                                </p>
                            </div>
                        </label>
                    </div>
                    
                    {/* แสดง Override Editor เฉพาะเมื่อ isOverriding = true */}
                    {isOverriding && (
                        <>
                            <div className="p-6 border-b">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={overrideFlow?.requires_approval ?? true}
                                        onChange={(e) => handleOverrideChange('requires_approval', e.target.checked)}
                                        className="w-5 h-5"
                                    />
                                    <span className="font-medium">ต้องผ่านการอนุมัติ (Override)</span>
                                </label>
                            </div>
                            
                            {overrideFlow?.requires_approval && (
                                <div className="p-6">
                                    <h4 className="font-semibold mb-4">Override Approval Levels</h4>
                                    <ApprovalLevelEditor 
                                        levels={overrideFlow?.levels || []}
                                        onChange={(levels) => handleOverrideChange('levels', levels)}
                                    />
                                </div>
                            )}
                            
                            <div className="p-6 border-t">
                                <FormSelect 
                                    label="ผู้รับงานเริ่มต้น (Override)"
                                    value={overrideFlow?.default_assignee_id || ''}
                                    onChange={(e) => handleOverrideChange('default_assignee_id', e.target.value)}
                                >
                                    <option value="">-- เลือกผู้รับงาน --</option>
                                    {assignees.map(u => (
                                        <option key={u.id} value={u.id}>{u.displayName}</option>
                                    ))}
                                </FormSelect>
                            </div>
                        </>
                    )}
                    
                    {/* Save Button */}
                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                        {isOverriding && overrideFlow && (
                            <Button variant="outline" onClick={handleDeleteOverride}>
                                ลบ Override
                            </Button>
                        )}
                        <Button onClick={handleSaveOverride}>
                            {isOverriding ? 'บันทึก Override' : 'ใช้ Master Default'}
                        </Button>
                    </div>
                </Card>
            </>
        )}
    </div>
);
```

**ไฟล์: `ApprovalFlow.jsx` - Matrix View (แสดง Master + Override)**
```jsx
// Tab: Matrix View - แสดงตารางภาพรวม
{activeTab === 'matrix' && (
    <Card>
        <CardHeader title="ภาพรวม Approval Flow: Master + Override" />
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="p-3 text-left">โครงการ</th>
                        {jobTypes.map(jt => (
                            <th key={jt.id} className="p-3 text-center">
                                {jt.name}
                                <div className="text-xs font-normal text-gray-500">
                                    Master: {jt.default_requires_approval ? 'Yes' : 'No'}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {projects.map(proj => (
                        <tr key={proj.id} className="border-b">
                            <td className="p-3 font-medium">{proj.name}</td>
                            {jobTypes.map(jt => {
                                const override = getOverride(proj.id, jt.id);
                                const effective = override || {
                                    requires_approval: jt.default_requires_approval,
                                    levels: jt.default_levels
                                };
                                
                                return (
                                    <td key={jt.id} className="p-3 text-center">
                                        {override ? (
                                            // มี Override
                                            <div className="flex flex-col items-center gap-1">
                                                <Badge variant="orange">
                                                    ⚠️ Override
                                                </Badge>
                                                <Badge variant={effective.requires_approval ? 'blue' : 'gray'}>
                                                    {effective.requires_approval 
                                                        ? `${effective.levels?.length || 0} Level`
                                                        : 'ข้าม'}
                                                </Badge>
                                            </div>
                                        ) : (
                                            // ใช้ Master
                                            <Badge variant={effective.requires_approval ? 'blue' : 'gray'}>
                                                {effective.requires_approval 
                                                    ? `${effective.levels?.length || 0} Level`
                                                    : 'ข้าม'}
                                            </Badge>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        {/* Legend */}
        <div className="p-4 border-t bg-gray-50 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
                <Badge variant="blue">X Level</Badge>
                <span>= ใช้ Master Default</span>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant="orange">⚠️ Override</Badge>
                <span>= Override สำหรับโครงการนี้</span>
            </div>
        </div>
    </Card>
)}
```

**ไฟล์: `apiService.js` - Functions ใหม่**
```javascript
// =====================================
// Master Default (Job Type)
// =====================================

async getJobType(jobTypeId) {
    const { data } = await supabase
        .from('job_types')
        .select('*, default_requires_approval, default_levels, default_assignee_id')
        .eq('id', jobTypeId)
        .single();
    
    return data;
},

async updateJobTypeMaster(jobTypeId, masterData) {
    const { data, error } = await supabase
        .from('job_types')
        .update({
            default_requires_approval: masterData.default_requires_approval,
            default_levels: masterData.default_levels,
            default_assignee_id: masterData.default_assignee_id,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobTypeId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
},

// =====================================
// Override (Project-specific)
// =====================================

async getApprovalFlowOverride(projectId, jobTypeId) {
    const { data } = await supabase
        .from('approval_flows')
        .select('*')
        .eq('project_id', projectId)
        .eq('job_type_id', jobTypeId)
        .eq('is_override', true)
        .single();
    
    return data; // null ถ้าไม่มี Override
},

async saveApprovalFlowOverride(projectId, jobTypeId, overrideData) {
    const { data, error } = await supabase
        .from('approval_flows')
        .upsert({
            project_id: projectId,
            job_type_id: jobTypeId,
            requires_approval: overrideData.requires_approval,
            levels: overrideData.levels,
            default_assignee_id: overrideData.default_assignee_id,
            is_override: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'project_id,job_type_id'
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
},

async deleteApprovalFlowOverride(projectId, jobTypeId) {
    const { error } = await supabase
        .from('approval_flows')
        .delete()
        .eq('project_id', projectId)
        .eq('job_type_id', jobTypeId);
    
    if (error) throw error;
},

async getAllApprovalFlowsWithMaster() {
    // ดึง Override ทั้งหมด
    const { data: overrides } = await supabase
        .from('approval_flows')
        .select(`
            *,
            project:projects(id, name),
            job_type:job_types(id, name)
        `)
        .eq('is_override', true)
        .eq('is_active', true);
    
    return overrides || [];
},

// =====================================
// Get Effective Flow (Master + Override)
// =====================================

async getEffectiveApprovalFlow(projectId, jobTypeId) {
    // 1. ลอง Load Override ก่อน
    const override = await this.getApprovalFlowOverride(projectId, jobTypeId);
    if (override) {
        return {
            ...override,
            source: 'override'
        };
    }
    
    // 2. ถ้าไม่มี → ใช้ Master จาก Job Type
    const jobType = await this.getJobType(jobTypeId);
    return {
        requires_approval: jobType.default_requires_approval,
        levels: jobType.default_levels,
        default_assignee_id: jobType.default_assignee_id,
        source: 'master'
    };
},

// =====================================
// Create Job (ใช้ Effective Flow)
// =====================================

async createJob(jobData) {
    // 1. ดึง Effective Flow (Master หรือ Override)
    const flow = await this.getEffectiveApprovalFlow(jobData.project_id, jobData.job_type_id);
    
    // 2. กำหนด initial status
    let initialStatus = 'pending_approval'; // Default
    let assigneeId = jobData.assignee_id;
    
    if (!flow.requires_approval) {
        // ไม่ต้องอนุมัติ → ส่งตรงไป Graphic
        initialStatus = 'assigned';
        assigneeId = assigneeId || flow.default_assignee_id;
    }
    
    // 3. Insert job
    const { data: job } = await supabase.from('jobs').insert({
        ...jobData,
        status: initialStatus,
        assignee_id: assigneeId,
        flow_source: flow.source // 'master' | 'override' (สำหรับ debug)
    }).select().single();
    
    return job;
}
```

---

### 4.3 👤 Auto-Approve for Self-Created Jobs (Approver สร้างงานเอง)

> ⚠️ **แนวทาง:** Approver (Head BU, CC Team) สามารถสร้าง DJ ได้ และ **Auto-skip Level ที่ตัวเองเป็น Approver**

#### Business Rules
```
1. Approver มี Dual Role: สร้าง DJ ได้ + อนุมัติได้
2. ตอนสร้าง DJ: เช็คว่า requester อยู่ใน Approval Flow หรือไม่
3. ถ้าอยู่ → Auto-skip Level นั้นไปเลย
4. ถ้าข้ามหมดทุก Level → Assigned ไปที่ Graphic เลย
```

#### 📊 ตัวอย่างการทำงาน

| สถานการณ์ | Flow | ผลลัพธ์ |
|-----------|------|---------|
| Marketing สร้าง | L1(Head BU) → L2(CC) | รอ L1 อนุมัติ |
| Head BU สร้างเอง | L1(Head BU) → L2(CC) | ⚡ Skip L1 → รอ L2 อนุมัติ |
| CC Team สร้างเอง | L1(Head BU) → L2(CC) | รอ L1 → ⚡ Skip L2 → Assigned |
| Head BU สร้าง (1 Level only) | L1(Head BU) | ⚡ Skip L1 → Assigned เลย |

#### Database Changes
```sql
-- เพิ่ม column เก็บ log การ auto-skip
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_approved_levels JSONB DEFAULT '[]';

COMMENT ON COLUMN jobs.auto_approved_levels IS 'Log Level ที่ถูก auto-skip เพราะ requester เป็น approver: [{"level":1,"approver_id":5,"reason":"self-created","skipped_at":"..."}]';
```

#### API Changes (`apiService.js`)

```javascript
// =====================================
// Auto-Approve Logic
// =====================================

processAutoApproveLogic(levels, requesterId) {
    const autoApprovedLevels = [];
    const remainingLevels = [];
    
    for (const level of levels) {
        // เช็คว่า requester อยู่ใน approvers หรือไม่
        const isRequesterInLevel = level.approvers.some(
            approver => approver.userId == requesterId
        );
        
        if (isRequesterInLevel) {
            // Auto-skip Level นี้
            autoApprovedLevels.push({
                level: level.level,
                approver_id: requesterId,
                reason: 'self-created',
                skipped_at: new Date().toISOString()
            });
        } else {
            remainingLevels.push(level);
        }
    }
    
    return {
        remainingLevels,
        autoApprovedLevels,
        nextLevel: remainingLevels[0] || null
    };
},

// =====================================
// Create Job with Auto-Approve
// =====================================

async createJob(jobData) {
    const requesterId = jobData.requester_id || this.getCurrentUserId();
    
    // 1. ดึง Effective Flow
    const flow = await this.getEffectiveApprovalFlow(
        jobData.project_id, 
        jobData.job_type_id
    );
    
    // 2. ถ้าไม่ต้องอนุมัติ → assigned เลย
    if (!flow.requires_approval) {
        return await this.insertJob({
            ...jobData,
            status: 'assigned',
            requester_id: requesterId,
            assignee_id: flow.default_assignee_id,
            auto_approved_levels: []
        });
    }
    
    // 3. มี Flow → เช็ค Auto-Skip
    const { 
        remainingLevels, 
        autoApprovedLevels, 
        nextLevel 
    } = this.processAutoApproveLogic(flow.levels, requesterId);
    
    // 4. ถ้าข้ามหมดทุก Level → assigned เลย
    if (remainingLevels.length === 0) {
        return await this.insertJob({
            ...jobData,
            status: 'assigned',
            requester_id: requesterId,
            assignee_id: flow.default_assignee_id,
            auto_approved_levels: autoApprovedLevels,
            current_approval_level: null
        });
    }
    
    // 5. ยังมี Level เหลือ → รออนุมัติ Level ถัดไป
    return await this.insertJob({
        ...jobData,
        status: 'pending_approval',
        requester_id: requesterId,
        current_approval_level: nextLevel.level,
        auto_approved_levels: autoApprovedLevels
    });
}
```

#### Frontend Changes

**1. ProtectedRoute - อนุญาตให้ Approver สร้าง DJ**
```javascript
// ใน ProtectedRoute.jsx
const canCreateDJ = (user) => {
    return ['requester', 'approver', 'head_bu', 'cc_team', 'admin'].includes(user.role);
};
```

**2. CreateDJ.jsx - แสดง Info สำหรับ Approver**
```jsx
{isApprover && (
    <div className="alert alert-info mb-4">
        <i className="icon-info-circle"></i>
        <div>
            <strong>คุณมีสิทธิ์อนุมัติในระบบ</strong>
            <p className="text-sm">งานที่สร้างจะข้ามการอนุมัติจากคุณโดยอัตโนมัติ</p>
        </div>
    </div>
)}
```

**3. JobDetail.jsx - แสดง Auto-Approved Badge**
```jsx
{job.auto_approved_levels?.length > 0 && (
    <Card className="mt-4">
        <CardHeader title="⚡ Auto-Approved Levels" />
        <div className="p-4">
            {job.auto_approved_levels.map(log => (
                <div key={log.level} className="flex items-center gap-2 mb-2">
                    <Badge variant="success">Level {log.level}</Badge>
                    <span className="text-sm text-gray-600">
                        ข้ามการอนุมัติ (Requester เป็น Approver)
                    </span>
                    <span className="text-xs text-gray-400">
                        {new Date(log.skipped_at).toLocaleString('th-TH')}
                    </span>
                </div>
            ))}
        </div>
    </Card>
)}
```

---

### 4.4 📊 Artwork Count Field (จำนวนชิ้นงานย่อย)

#### Business Rules (จาก Meeting)
```
- 1 DJ อาจมีหลาย Artworks (เช่น FB Post 10 ชิ้น, IG Story 5 ชิ้น)
- ต้องเลือกประเภทชิ้นงานย่อยจาก CMS ก่อน (job_type_items) แล้วระบุจำนวน (บังคับใส่)
- Report ต้องแสดงทั้ง DJ count และ Artwork count
- ใช้สำหรับคำนวณ Workload ของ Graphic
```

#### ใช้ Table ที่มีอยู่แล้ว
> ⚠️ **ไม่ต้องสร้าง table ใหม่!** 
> ใช้ `job_type_items` ที่มีอยู่แล้ว (จัดการผ่าน `JobTypeItems.jsx`)

**Table ที่มีอยู่:**
```sql
-- job_type_items (ชิ้นงานย่อย Master - ตั้งค่าใน CMS)
CREATE TABLE IF NOT EXISTS job_type_items (
    id SERIAL PRIMARY KEY,
    job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,        -- เช่น "FB Post", "IG Story", "Billboard"
    default_size VARCHAR(100),         -- เช่น "1080x1080px"
    is_required BOOLEAN DEFAULT false
);

-- design_job_items (ชิ้นงานย่อย Transaction - เก็บต่อ DJ)
CREATE TABLE IF NOT EXISTS design_job_items (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    job_type_item_id INTEGER REFERENCES job_type_items(id),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT
);
```

#### Database Changes (เพิ่มเติม)
```sql
-- เพิ่ม column สำหรับเก็บ total ใน jobs table (สำหรับ quick query)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_artwork_count INTEGER DEFAULT 0;

-- Index สำหรับ query
CREATE INDEX IF NOT EXISTS idx_design_job_items_job_id ON design_job_items(job_id);
```

#### Frontend Changes

**ไฟล์: `CreateDJ.jsx`**
```jsx
// === States สำหรับ Artwork ===
// โหลดจาก job_type_items ตาม job_type_id ที่เลือก (จาก CMS)
const [jobTypeItems, setJobTypeItems] = useState([]); // ชิ้นงานย่อยจาก CMS
const [selectedArtworks, setSelectedArtworks] = useState([
    // Default: มีอย่างน้อย 1 รายการ
    { jobTypeItemId: '', quantity: 1, notes: '' }
]);
const [artworkError, setArtworkError] = useState('');

// โหลดชิ้นงานย่อยจาก job_type_items ตาม job_type_id ที่เลือก (จาก CMS)
useEffect(() => {
    const loadJobTypeItems = async () => {
        if (!selectedJobTypeId) {
            setJobTypeItems([]);
            return;
        }
        // ใช้ API ที่มีอยู่แล้ว
        const data = await api.getJobTypeItems(selectedJobTypeId);
        setJobTypeItems(data || []);
    };
    loadJobTypeItems();
}, [selectedJobTypeId]); // โหลดใหม่เมื่อเปลี่ยน Job Type

// เพิ่มรายการชิ้นงาน
const handleAddArtwork = () => {
    setSelectedArtworks([
        ...selectedArtworks, 
        { jobTypeItemId: '', quantity: 1, notes: '' }
    ]);
};

// ลบรายการชิ้นงาน (ต้องเหลืออย่างน้อย 1)
const handleRemoveArtwork = (index) => {
    if (selectedArtworks.length <= 1) {
        setArtworkError('ต้องมีอย่างน้อย 1 ชิ้นงาน');
        return;
    }
    setSelectedArtworks(selectedArtworks.filter((_, i) => i !== index));
};

// อัพเดทรายการชิ้นงาน
const handleArtworkChange = (index, field, value) => {
    const updated = [...selectedArtworks];
    updated[index][field] = value;
    setSelectedArtworks(updated);
    setArtworkError(''); // Clear error
};

// คำนวณจำนวนรวม
const totalArtworkCount = selectedArtworks.reduce(
    (sum, item) => sum + (parseInt(item.quantity) || 0), 
    0
);

// Validation ก่อน Submit
const validateArtworks = () => {
    for (let i = 0; i < selectedArtworks.length; i++) {
        const item = selectedArtworks[i];
        if (!item.jobTypeItemId) {
            setArtworkError(`กรุณาเลือกประเภทชิ้นงานในรายการที่ ${i + 1}`);
            return false;
        }
        if (!item.quantity || item.quantity < 1) {
            setArtworkError(`กรุณาระบุจำนวนชิ้นงานในรายการที่ ${i + 1}`);
            return false;
        }
    }
    return true;
};

// === UI Component ===
<div className="form-section">
    <h3>ชิ้นงานย่อย (Artworks) *</h3>
    <p className="section-hint">เลือกชิ้นงานจากรายการที่ตั้งค่าใน CMS แล้วระบุจำนวน</p>
    
    {jobTypeItems.length === 0 ? (
        <p className="warning-text">⚠️ กรุณาเลือกประเภทงาน (Job Type) ก่อน</p>
    ) : (
        selectedArtworks.map((artwork, index) => (
            <div key={index} className="artwork-row">
                <div className="artwork-fields">
                    {/* เลือกชิ้นงานย่อยจาก CMS (job_type_items) */}
                    <select 
                        value={artwork.jobTypeItemId}
                        onChange={(e) => handleArtworkChange(index, 'jobTypeItemId', e.target.value)}
                        className={!artwork.jobTypeItemId ? 'invalid' : ''}
                        required
                    >
                        <option value="">-- เลือกชิ้นงาน --</option>
                        {jobTypeItems.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name} {item.defaultSize ? `(${item.defaultSize})` : ''}
                            </option>
                        ))}
                    </select>
                    
                    {/* จำนวนชิ้นงาน (บังคับใส่) */}
                    <input 
                        type="number"
                        min="1"
                        value={artwork.quantity}
                        onChange={(e) => handleArtworkChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="จำนวน"
                        className="quantity-input"
                        required
                    />
                    <span className="unit-label">ชิ้น</span>
                
                {/* หมายเหตุ (optional) */}
                <input 
                    type="text"
                    value={artwork.notes}
                    onChange={(e) => handleArtworkChange(index, 'notes', e.target.value)}
                    placeholder="หมายเหตุ (ถ้ามี)"
                    className="notes-input"
                />
                
                {/* ปุ่มลบ */}
                <button 
                    type="button"
                    onClick={() => handleRemoveArtwork(index)}
                    className="btn-remove"
                    disabled={selectedArtworks.length <= 1}
                >
                    ✕
                </button>
            </div>
        </div>
    ))}
    
    {/* Error message */}
    {artworkError && (
        <p className="error-text">{artworkError}</p>
    )}
    
    {/* ปุ่มเพิ่มชิ้นงาน */}
    <button type="button" onClick={handleAddArtwork} className="btn-add-artwork">
        + เพิ่มชิ้นงาน
    </button>
    
    {/* แสดงจำนวนรวม */}
    <div className="total-artworks">
        <strong>รวมทั้งหมด: {totalArtworkCount} ชิ้นงาน</strong>
    </div>
</div>
```

**ไฟล์: `CreateDJ.jsx` - CSS Styles**
```css
/* Artwork Section Styles */
.artwork-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
}

.artwork-fields {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.artwork-fields select {
    min-width: 180px;
}

.quantity-input {
    width: 80px;
    text-align: center;
}

.unit-label {
    color: #666;
    font-size: 14px;
}

.notes-input {
    flex: 1;
    min-width: 150px;
}

.btn-remove {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    cursor: pointer;
}

.btn-remove:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.btn-add-artwork {
    margin-top: 8px;
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.total-artworks {
    margin-top: 16px;
    padding: 12px;
    background: #e7f3ff;
    border-radius: 8px;
    text-align: right;
}

.error-text {
    color: #dc3545;
    font-size: 14px;
    margin-top: 8px;
}

select.invalid {
    border-color: #dc3545;
}
```

**ไฟล์: `apiService.js` - Save Artworks (ใช้ design_job_items)**
```javascript
// บันทึก DJ พร้อม Artworks (ใช้ table ที่มีอยู่แล้ว)
async createJob(jobData, artworks) {
    // 1. คำนวณ total artwork count
    const totalArtworkCount = artworks.reduce(
        (sum, item) => sum + (parseInt(item.quantity) || 0), 
        0
    );
    
    // 2. Insert job
    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
            ...jobData,
            total_artwork_count: totalArtworkCount
        })
        .select()
        .single();
    
    if (jobError) throw jobError;
    
    // 3. Insert artworks ไปที่ design_job_items (table ที่มีอยู่แล้ว)
    const artworkRecords = artworks.map(item => {
        // หา name จาก jobTypeItems
        const itemInfo = jobTypeItems.find(i => i.id == item.jobTypeItemId);
        return {
            job_id: job.id,
            job_type_item_id: parseInt(item.jobTypeItemId),
            name: itemInfo?.name || 'Unknown',
            quantity: parseInt(item.quantity),
            status: 'pending'
        };
    });
    
    const { error: artworkError } = await supabase
        .from('design_job_items')
        .insert(artworkRecords);
    
    if (artworkError) throw artworkError;
    
    return job;
}

// ดึงข้อมูล Artworks ของ Job (จาก design_job_items)
async getJobArtworks(jobId) {
    const { data } = await supabase
        .from('design_job_items')
        .select(`
            *,
            job_type_item:job_type_items(id, name, default_size)
        `)
        .eq('job_id', jobId);
    
    return data || [];
}
```

**ไฟล์: `JobDetail.jsx` - แสดงรายการชิ้นงาน**
```jsx
// แสดงรายการชิ้นงานย่อย (จาก design_job_items + job_type_items)
<div className="artworks-section">
    <h4>ชิ้นงานย่อย ({job.total_artwork_count} ชิ้น)</h4>
    <table className="artworks-table">
        <thead>
            <tr>
                <th>ชิ้นงาน</th>
                <th>ขนาด</th>
                <th>จำนวน</th>
                <th>สถานะ</th>
            </tr>
        </thead>
        <tbody>
            {artworks.map(item => (
                <tr key={item.id}>
                    <td>{item.name || item.job_type_item?.name}</td>
                    <td>{item.job_type_item?.default_size || '-'}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td>
                        <Badge variant={item.status === 'completed' ? 'success' : 'default'}>
                            {item.status}
                        </Badge>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
</div>
```

---

### 4.4 ❌ Graphic Cancel/Reject Job

#### Business Rules (จาก Meeting)
```
- Graphic สามารถ Cancel งานได้ถ้า Marketing ไม่ส่งข้อมูลตามเวลา
- ต้องใส่เหตุผลการ Cancel
- Notify กลับไป Marketing + เก็บ Log
- ใช้สำหรับ Track ว่า Marketing มีปัญหาบ่อยแค่ไหน
```

#### Database Changes
```sql
-- เพิ่ม columns ใน jobs table
ALTER TABLE jobs ADD COLUMN cancelled_by INTEGER REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN cancel_reason TEXT;
ALTER TABLE jobs ADD COLUMN cancelled_at TIMESTAMP;

-- สร้าง cancel_reasons lookup table
CREATE TABLE cancel_reasons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Insert default reasons
INSERT INTO cancel_reasons (code, description) VALUES
('no_info', 'Marketing ไม่ส่งข้อมูลตามเวลาที่กำหนด'),
('brief_incomplete', 'Brief ไม่ครบถ้วน'),
('no_feedback', 'ไม่ได้รับ Feedback จาก Marketing'),
('project_cancelled', 'โครงการถูกยกเลิก'),
('other', 'เหตุผลอื่นๆ');
```

#### Frontend Changes

**ไฟล์: `JobDetail.jsx`**
```jsx
// เพิ่ม Cancel button และ Modal
const [showCancelModal, setShowCancelModal] = useState(false);
const [cancelReason, setCancelReason] = useState('');
const [cancelReasonCode, setCancelReasonCode] = useState('');

// Cancel Modal
<Modal show={showCancelModal} onClose={() => setShowCancelModal(false)}>
    <h3>ยกเลิกงาน (Cancel Job)</h3>
    <div className="form-group">
        <label>สาเหตุการยกเลิก *</label>
        <select value={cancelReasonCode} onChange={(e) => setCancelReasonCode(e.target.value)}>
            <option value="">-- เลือกสาเหตุ --</option>
            <option value="no_info">Marketing ไม่ส่งข้อมูลตามเวลา</option>
            <option value="brief_incomplete">Brief ไม่ครบถ้วน</option>
            <option value="no_feedback">ไม่ได้รับ Feedback</option>
            <option value="other">อื่นๆ</option>
        </select>
    </div>
    <div className="form-group">
        <label>รายละเอียดเพิ่มเติม</label>
        <textarea 
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="อธิบายรายละเอียด..."
        />
    </div>
    <div className="modal-actions">
        <Button variant="secondary" onClick={() => setShowCancelModal(false)}>ยกเลิก</Button>
        <Button variant="danger" onClick={handleCancelJob}>ยืนยันการยกเลิกงาน</Button>
    </div>
</Modal>
```

**ไฟล์: `apiService.js`**
```javascript
// เพิ่ม function cancelJob
async cancelJob(jobId, cancelReasonCode, cancelReasonDetail, userId) {
    // 1. Update job status
    const { data: job } = await supabase.from('jobs').update({
        status: 'cancelled',
        cancelled_by: userId,
        cancel_reason: `${cancelReasonCode}: ${cancelReasonDetail}`,
        cancelled_at: new Date().toISOString()
    }).eq('id', jobId).select().single();
    
    // 2. Notify job owner
    await this.createNotification({
        user_id: job.requester_id,
        type: 'job_cancelled',
        title: 'งานถูกยกเลิก',
        message: `DJ-${jobId} ถูกยกเลิกเนื่องจาก: ${cancelReasonDetail}`,
        job_id: jobId
    });
    
    return job;
}
```

---

### 4.5 📅 Work Day Calculation Enhancement

#### Business Rules (จาก Meeting)
```
- นับเฉพาะ Work Day (จันทร์-ศุกร์)
- ข้าม Weekend และ Holiday อัตโนมัติ
- Submit หลัง 18:00 → นับวันถัดไป
- Submit วันเสาร์ → นับวันจันทร์
```

#### Frontend Changes

**ไฟล์: `utils/slaCalculator.js`** (แก้ไขเพิ่มเติม)
```javascript
import { supabase } from '@/services/supabaseClient';

// ดึงวันหยุดจาก DB
let cachedHolidays = null;
async function getHolidays(year) {
    if (cachedHolidays && cachedHolidays.year === year) {
        return cachedHolidays.dates;
    }
    
    const { data } = await supabase
        .from('holidays')
        .select('date')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`);
    
    cachedHolidays = {
        year,
        dates: data?.map(h => h.date) || []
    };
    
    return cachedHolidays.dates;
}

// ตรวจสอบว่าเป็น Work Day หรือไม่
function isWorkDay(date, holidays = []) {
    const day = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    
    // Weekend check
    if (day === 0 || day === 6) return false;
    
    // Holiday check
    if (holidays.includes(dateStr)) return false;
    
    return true;
}

// ตรวจสอบ Cutoff Time (18:00)
function isAfterCutoff(date) {
    return date.getHours() >= 18;
}

// คำนวณ Due Date
export async function calculateDueDate(startDate, slaDays) {
    const holidays = await getHolidays(startDate.getFullYear());
    let currentDate = new Date(startDate);
    
    // ถ้า submit หลัง 18:00 หรือเป็น weekend → เริ่มนับวันถัดไป
    if (isAfterCutoff(currentDate) || !isWorkDay(currentDate, holidays)) {
        currentDate.setDate(currentDate.getDate() + 1);
        // ข้ามไปหาวัน Work Day ถัดไป
        while (!isWorkDay(currentDate, holidays)) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    // นับ Work Days
    let workDaysAdded = 0;
    while (workDaysAdded < slaDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (isWorkDay(currentDate, holidays)) {
            workDaysAdded++;
        }
    }
    
    return currentDate;
}

// เพิ่ม Work Days (สำหรับ Urgent shift)
export async function addWorkDays(fromDate, days) {
    const holidays = await getHolidays(fromDate.getFullYear());
    let currentDate = new Date(fromDate);
    let workDaysAdded = 0;
    
    while (workDaysAdded < days) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (isWorkDay(currentDate, holidays)) {
            workDaysAdded++;
        }
    }
    
    return currentDate;
}
```

---

### 4.6 📈 Reports Dashboard

> **อ้างอิง UI:** `HTML Original/dj-system/09-reports.html`

#### Business Rules (จาก Meeting)
```
- แสดงภาพรวม + Drill Down ได้
- Metrics: Total DJ, Completed, On-Time Rate, Avg. Turnaround, Revision Rate
- แยกตาม: Status, Job Type, Project, Assignee
- Period: This Month, Last Month, This Quarter, This Year, Custom Range
- แสดงทั้ง DJ count และ Artwork count
- Export Report ได้ (PDF/Excel)
```

#### 📊 UI Components (ตาม HTML)

**1. KPI Cards (5 ตัว)**
```
┌────────────────┬────────────────┬────────────────┬────────────────┬────────────────┐
│   Total DJ     │   Completed    │ On-Time Rate   │ Avg. Turnaround│ Revision Rate  │
│      156       │      128       │      89%       │     2.8 days   │      1.4       │
│  +12% vs last  │  82% rate      │  +5% vs last   │                │  avg revisions │
└────────────────┴────────────────┴────────────────┴────────────────┴────────────────┘
```

**2. Charts (3 แบบ)**

**A. DJ by Status (Progress Bar)**
```
Delivered         128 ████████████████████████████████████ 82%
In Progress        15 █████                                 10%
Pending Approval    8 ███                                    5%
Revision            3 █                                      2%
Cancelled           2 █                                      1%
```

**B. DJ by Job Type (Icon Cards)**
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Social Media    │  │ Banner Web      │  │ Print Ad        │
│       45        │  │       32        │  │       28        │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ EDM             │  │ Video Clip      │
│       18        │  │       15        │
└─────────────────┘  └─────────────────┘
```

**C. DJ by Project (Progress Bar with %)**
```
SENA Park Grand     52  ███████████████████████████████  33%
SENA Ville          38  ████████████████████             24%
SENA Grand Home     35  ██████████████████               22%
SENA Ecotown        31  ████████████████                 21%
```

**3. Tables**

**A. Assignee Performance**
```
┌──────────────────┬───────────┬────────────┬───────────┐
│ Assignee         │ Completed │ On-Time %  │ Avg. Days │
├──────────────────┼───────────┼────────────┼───────────┤
│ สมศักดิ์ กราฟิก   │    48     │    95%     │    2.3    │
│ นารี เว็บดี       │    42     │    92%     │    2.5    │
│ ปรีชา มโหรี       │    38     │    85%     │    3.2    │
└──────────────────┴───────────┴────────────┴───────────┘
```

**B. Monthly Trend (Bar Chart)**
```
    ┌─ 100%
    │   ▄
    │  ▄█▄▄█
    │ ▄█████▄█▄
    └─────────────── 0%
     ม.ค. - ธ.ค. (2568)
```

**4. SLA Performance by Job Type (Circular Progress)**
```
   Social Media    Banner Web     Print Ad       EDM         Video Clip    Key Visual
      ⭕90%         ⭕88%          ⭕92%         ⭕94%         ⭕82%          ⭕84%
    SLA: 3 days   SLA: 3 days   SLA: 5 days  SLA: 2 days  SLA: 7 days   SLA: 5 days
```

---

#### Frontend Changes

**สร้างไฟล์ใหม่: `pages/admin/Reports.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { api } from '@/services/apiService';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

export default function Reports() {
    // === States ===
    const [period, setPeriod] = useState('this_month'); // 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom'
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(false);
    
    // KPI Data
    const [kpi, setKpi] = useState({
        totalDJ: 0,
        totalDJChange: 0, // % vs last period
        completed: 0,
        completionRate: 0,
        onTimeRate: 0,
        onTimeRateChange: 0,
        avgTurnaround: 0,
        revisionRate: 0
    });
    
    // Chart Data
    const [djByStatus, setDjByStatus] = useState([]);
    const [djByJobType, setDjByJobType] = useState([]);
    const [djByProject, setDjByProject] = useState([]);
    const [assigneePerformance, setAssigneePerformance] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [slaPerformance, setSlaPerformance] = useState([]);
    
    // === Load Data ===
    useEffect(() => {
        loadReportData();
    }, [period, customRange]);
    
    const loadReportData = async () => {
        setLoading(true);
        try {
            const params = { period };
            if (period === 'custom') {
                params.startDate = customRange.start;
                params.endDate = customRange.end;
            }
            
            // Fetch all report data
            const data = await api.getReportData(params);
            
            setKpi(data.kpi);
            setDjByStatus(data.byStatus);
            setDjByJobType(data.byJobType);
            setDjByProject(data.byProject);
            setAssigneePerformance(data.assigneePerformance);
            setMonthlyTrend(data.monthlyTrend);
            setSlaPerformance(data.slaPerformance);
        } catch (error) {
            console.error('Failed to load report data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Export Report
    const handleExport = async (format) => {
        try {
            const params = { period, format }; // 'pdf' | 'excel'
            if (period === 'custom') {
                params.startDate = customRange.start;
                params.endDate = customRange.end;
            }
            
            const blob = await api.exportReport(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${period}_${Date.now()}.${format}`;
            a.click();
        } catch (error) {
            console.error('Failed to export report:', error);
        }
    };
    
    return (
        <div className="reports-page p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Reports Dashboard</h1>
                    <p className="text-sm text-gray-500">ภาพรวมและสถิติการทำงาน DJ System</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Period Filter */}
                    <select 
                        value={period} 
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="this_quarter">This Quarter</option>
                        <option value="this_year">This Year</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    
                    {/* Export Button */}
                    <button 
                        onClick={() => handleExport('pdf')}
                        className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                    >
                        📥 Export Report
                    </button>
                </div>
            </div>
            
            {/* Custom Date Range */}
            {period === 'custom' && (
                <div className="flex gap-4 mb-6">
                    <input 
                        type="date" 
                        value={customRange.start}
                        onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="self-center">to</span>
                    <input 
                        type="date" 
                        value={customRange.end}
                        onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                </div>
            )}
            
            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                <KPICard 
                    title="Total DJ"
                    value={kpi.totalDJ}
                    change={kpi.totalDJChange}
                    icon="📋"
                    color="rose"
                />
                <KPICard 
                    title="Completed"
                    value={kpi.completed}
                    subtitle={`${kpi.completionRate}% completion rate`}
                    icon="✅"
                    color="green"
                />
                <KPICard 
                    title="On-Time Rate"
                    value={`${kpi.onTimeRate}%`}
                    change={kpi.onTimeRateChange}
                    icon="⏰"
                    color="blue"
                />
                <KPICard 
                    title="Avg. Turnaround"
                    value={kpi.avgTurnaround}
                    subtitle="Working days"
                    icon="⚡"
                    color="purple"
                />
                <KPICard 
                    title="Revision Rate"
                    value={kpi.revisionRate}
                    subtitle="Avg. revisions per DJ"
                    icon="🔄"
                    color="yellow"
                />
            </div>
            
            {/* Charts Row 1 */}
            <div className="grid grid-cols-3 gap-6 mb-6">
                {/* DJ by Status */}
                <Card title="DJ by Status">
                    <div className="space-y-3">
                        {djByStatus.map(item => (
                            <ProgressBar 
                                key={item.status}
                                label={item.label}
                                value={item.count}
                                max={kpi.totalDJ}
                                color={item.color}
                            />
                        ))}
                    </div>
                </Card>
                
                {/* DJ by Job Type */}
                <Card title="DJ by Job Type">
                    <div className="space-y-3">
                        {djByJobType.map(item => (
                            <JobTypeCard 
                                key={item.id}
                                icon={item.icon}
                                name={item.name}
                                count={item.count}
                                color={item.color}
                            />
                        ))}
                    </div>
                </Card>
                
                {/* DJ by Project */}
                <Card title="DJ by Project">
                    <div className="space-y-4">
                        {djByProject.map(item => (
                            <ProjectBar 
                                key={item.id}
                                name={item.name}
                                count={item.count}
                                percentage={item.percentage}
                                color={item.color}
                            />
                        ))}
                    </div>
                </Card>
            </div>
            
            {/* Charts Row 2 */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Assignee Performance */}
                <Card title="Assignee Performance">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Assignee</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Completed</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">On-Time %</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Avg. Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assigneePerformance.map(item => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                                                <span className="text-rose-600 text-xs font-medium">
                                                    {item.initials}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.title}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-medium">{item.completed}</td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge variant={item.onTimeRate >= 90 ? 'success' : 'warning'}>
                                            {item.onTimeRate}%
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">{item.avgDays}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
                
                {/* Monthly Trend */}
                <Card title="Monthly Trend (2568)">
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {monthlyTrend.map((item, index) => (
                            <div key={index} className="flex flex-col items-center gap-2 flex-1">
                                <div 
                                    className={`w-full rounded-t ${item.isProjected ? 'bg-gray-300 border-2 border-dashed border-rose-400' : 'bg-rose-500'}`}
                                    style={{ height: `${item.percentage}%` }}
                                ></div>
                                <span className="text-xs text-gray-500">{item.month}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-rose-500 rounded"></div>
                            <span className="text-gray-600">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-300 border-2 border-dashed border-rose-400 rounded"></div>
                            <span className="text-gray-600">Projected</span>
                        </div>
                    </div>
                </Card>
            </div>
            
            {/* SLA Performance */}
            <Card title="SLA Performance by Job Type" subtitle="Target: 90% On-Time">
                <div className="grid grid-cols-6 gap-4">
                    {slaPerformance.map(item => (
                        <CircularProgress 
                            key={item.id}
                            label={item.name}
                            percentage={item.onTimeRate}
                            sla={`SLA: ${item.slaDays} days`}
                        />
                    ))}
                </div>
            </Card>
        </div>
    );
}

// === Sub-Components ===

function KPICard({ title, value, subtitle, change, icon, color }) {
    const colorClasses = {
        rose: 'bg-rose-100 text-rose-600',
        green: 'bg-green-100 text-green-600',
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        yellow: 'bg-yellow-100 text-yellow-600'
    };
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{title}</span>
                <div className={`w-8 h-8 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
                    <span className="text-xl">{icon}</span>
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
                <p className={`text-xs flex items-center gap-1 mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last {period}
                </p>
            )}
            {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
        </div>
    );
}

function ProgressBar({ label, value, max, color }) {
    const percentage = max > 0 ? (value / max * 100).toFixed(0) : 0;
    
    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className={`bg-${color}-500 h-2 rounded-full`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

function JobTypeCard({ icon, name, count, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-100',
        purple: 'bg-purple-50 border-purple-100',
        orange: 'bg-orange-50 border-orange-100',
        teal: 'bg-teal-50 border-teal-100',
        red: 'bg-red-50 border-red-100'
    };
    
    return (
        <div className={`flex items-center justify-between p-3 ${colorClasses[color]} border rounded-lg`}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <span className="text-sm font-medium text-gray-900">{name}</span>
            </div>
            <span className={`text-lg font-bold text-${color}-600`}>{count}</span>
        </div>
    );
}

function ProjectBar({ name, count, percentage, color }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-${color}-500 rounded-full`}></div>
                    <span className="text-sm text-gray-600">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500">({percentage}%)</span>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                    className={`bg-${color}-500 h-3 rounded-full`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

function CircularProgress({ label, percentage, sla }) {
    const strokeDashoffset = 220 - (220 * percentage / 100);
    const color = percentage >= 90 ? '#22C55E' : percentage >= 80 ? '#EAB308' : '#EF4444';
    
    return (
        <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="35" stroke="#E5E7EB" strokeWidth="6" fill="none"/>
                    <circle 
                        cx="40" cy="40" r="35" 
                        stroke={color} 
                        strokeWidth="6" 
                        fill="none" 
                        strokeDasharray="220" 
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">
                    {percentage}%
                </span>
            </div>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-500">{sla}</p>
        </div>
    );
}
```

---

#### API Changes

**ไฟล์: `apiService.js`**
```javascript
// ===== Reports API =====

// ดึงข้อมูลรายงานทั้งหมด
async getReportData(params) {
    const { period, startDate, endDate } = params;
    
    // Build date filter
    let dateFilter = {};
    if (period === 'custom') {
        dateFilter = {
            created_at: { gte: startDate, lte: endDate }
        };
    } else {
        const { start, end } = this.getPeriodDates(period);
        dateFilter = {
            created_at: { gte: start, lte: end }
        };
    }
    
    // Fetch data
    const { data: jobs } = await supabase
        .from('jobs')
        .select(`
            *,
            job_types(name, icon),
            projects(name),
            users!assignee_id(id, display_name, avatar_url)
        `)
        .match(dateFilter);
    
    // Calculate KPIs
    const kpi = this.calculateKPI(jobs, period);
    
    // Group by different dimensions
    const byStatus = this.groupByStatus(jobs);
    const byJobType = this.groupByJobType(jobs);
    const byProject = this.groupByProject(jobs);
    const assigneePerformance = this.calculateAssigneePerformance(jobs);
    const monthlyTrend = this.calculateMonthlyTrend(jobs);
    const slaPerformance = this.calculateSLAPerformance(jobs);
    
    return {
        kpi,
        byStatus,
        byJobType,
        byProject,
        assigneePerformance,
        monthlyTrend,
        slaPerformance
    };
},

// คำนวณ KPI
calculateKPI(jobs, period) {
    const totalDJ = jobs.length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const completionRate = totalDJ > 0 ? ((completed / totalDJ) * 100).toFixed(1) : 0;
    
    // On-Time Rate
    const onTime = jobs.filter(j => j.status === 'completed' && j.completed_at <= j.due_date).length;
    const onTimeRate = completed > 0 ? ((onTime / completed) * 100).toFixed(0) : 0;
    
    // Avg Turnaround
    const turnarounds = jobs
        .filter(j => j.status === 'completed' && j.started_at && j.completed_at)
        .map(j => this.calculateWorkDays(j.started_at, j.completed_at));
    const avgTurnaround = turnarounds.length > 0 
        ? (turnarounds.reduce((sum, t) => sum + t, 0) / turnarounds.length).toFixed(1)
        : 0;
    
    // Revision Rate
    const totalRevisions = jobs.reduce((sum, j) => sum + (j.revision_count || 0), 0);
    const revisionRate = totalDJ > 0 ? (totalRevisions / totalDJ).toFixed(1) : 0;
    
    // Compare with last period
    // TODO: Fetch last period data for comparison
    const totalDJChange = 12; // Mock data
    const onTimeRateChange = 5; // Mock data
    
    return {
        totalDJ,
        totalDJChange,
        completed,
        completionRate,
        onTimeRate,
        onTimeRateChange,
        avgTurnaround,
        revisionRate
    };
},

// จัดกลุ่มตามสถานะ
groupByStatus(jobs) {
    const statusMap = {
        'completed': { label: 'Delivered', color: 'green' },
        'in_progress': { label: 'In Progress', color: 'blue' },
        'pending_approval': { label: 'Pending Approval', color: 'yellow' },
        'rework': { label: 'Revision', color: 'orange' },
        'cancelled': { label: 'Cancelled', color: 'red' }
    };
    
    const result = [];
    for (const [status, config] of Object.entries(statusMap)) {
        const count = jobs.filter(j => j.status === status).length;
        result.push({
            status,
            label: config.label,
            count,
            color: config.color
        });
    }
    
    return result;
},

// Export Report
async exportReport(params) {
    const { format, ...reportParams } = params;
    
    const response = await fetch(`${this.baseURL}/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, ...reportParams })
    });
    
    return await response.blob();
},

// Helper: Get period dates
getPeriodDates(period) {
    const now = new Date();
    let start, end;
    
    switch (period) {
        case 'this_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'this_quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
            break;
        case 'this_year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;
    }
    
    return { start, end };
}
```

---

### 4.7 💬 Notification System (Configurable)

> **แนวทาง:** ให้ Admin ตั้งค่าได้ว่า Job Type ไหน Notify ใคร + เพิ่มอีเมลเพิ่มเติมได้

#### Business Rules (จาก Meeting)
```
Events ที่ต้อง Notify:
- Job Created (สร้างงาน)
- Job Approved/Rejected (อนุมัติ/ปฏิเสธ)
- Job Assigned (มอบหมายงาน)
- Job Completed (เสร็จสิ้น)
- Job Cancelled (ยกเลิก)
- Urgent Job Impact (งานด่วนกระทบงานอื่น)
- Deadline Approaching (D-1)
- Chat Message ใหม่

Configurable Settings:
- Admin กำหนดได้ว่า Job Type ไหน Notify ใครบ้าง
- เพิ่มอีเมลผู้รับเพิ่มเติมได้ (Custom Recipients)
- เลือก Event ที่ต้องการส่ง
```

#### Database Changes

```sql
-- ===================================================
-- 1. notifications table (In-App Notifications)
-- ===================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'job_created', 'job_approved', 'job_rejected', 'job_completed', 'job_cancelled', 'urgent_impact', 'deadline_approaching', 'chat_message'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    link VARCHAR(500), -- URL ที่จะพาไปเมื่อคลิก
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Meta
    metadata JSONB -- เก็บข้อมูลเพิ่มเติม เช่น sender, old_due_date, new_due_date
);

-- Index
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'การแจ้งเตือนภายในระบบ (In-App)';

-- ===================================================
-- 2. notification_settings table (Configurable)
-- ===================================================

CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE,
    
    -- Default Recipients (Role-based)
    notify_requester BOOLEAN DEFAULT true,     -- แจ้ง Marketing (เจ้าของงาน)
    notify_approvers BOOLEAN DEFAULT true,     -- แจ้ง CC Team (ผู้อนุมัติ)
    notify_assignee BOOLEAN DEFAULT true,      -- แจ้ง Graphic (ผู้รับงาน)
    
    -- Custom Recipients (Email List)
    custom_emails JSONB DEFAULT '[]',          -- ['user1@company.com', 'user2@company.com']
    custom_user_ids JSONB DEFAULT '[]',        -- [5, 10, 15] - User IDs เพิ่มเติม
    
    -- Events to Notify
    events JSONB DEFAULT '["job_created", "job_approved", "job_completed"]',
    
    -- Notification Channels
    in_app_enabled BOOLEAN DEFAULT true,       -- In-App Notification
    email_enabled BOOLEAN DEFAULT true,        -- Email Notification
    
    -- Meta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique: 1 Job Type = 1 Setting
    UNIQUE(job_type_id)
);

-- Index
CREATE INDEX idx_notification_settings_job_type ON notification_settings(job_type_id);

COMMENT ON TABLE notification_settings IS 'การตั้งค่า Notification แยกตาม Job Type (กำหนดได้ว่าแจ้งใคร + Event ไหน)';

-- ===================================================
-- 3. notification_logs table (Email Tracking)
-- ===================================================

CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    recipient_type VARCHAR(50) NOT NULL, -- 'user', 'custom_email'
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Email Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP,
    error_message TEXT,
    
    -- Content
    subject VARCHAR(255),
    body TEXT,
    
    -- Meta
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_notification_logs_job_id ON notification_logs(job_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at DESC);

COMMENT ON TABLE notification_logs IS 'Log การส่ง Email Notification (สำหรับ Tracking + Debug)';

-- ===================================================
-- 4. Insert Default Settings
-- ===================================================

-- ตัวอย่าง: ตั้งค่าเริ่มต้นสำหรับทุก Job Type
INSERT INTO notification_settings (job_type_id, custom_emails, events)
SELECT 
    id,
    '[]'::jsonb,
    '["job_created", "job_approved", "job_rejected", "job_completed", "job_cancelled"]'::jsonb
FROM job_types
ON CONFLICT (job_type_id) DO NOTHING;
```

#### ตัวอย่างการตั้งค่า Notification

```sql
-- ===================================================
-- Example 1: Job Type "Web Design" → Notify พี่เอก (CMS Team)
-- ===================================================

UPDATE notification_settings
SET 
    custom_emails = '["cms-team@company.com"]'::jsonb,
    custom_user_ids = '[15]'::jsonb, -- User ID ของพี่เอก
    events = '["job_created", "job_approved", "job_completed"]'::jsonb
WHERE job_type_id = (SELECT id FROM job_types WHERE name = 'Web Design');

-- ===================================================
-- Example 2: Job Type "Print Ad" → Notify ทีม Production
-- ===================================================

UPDATE notification_settings
SET 
    custom_emails = '["production@company.com", "print-team@company.com"]'::jsonb,
    events = '["job_approved", "job_completed"]'::jsonb -- เฉพาะ Approved + Completed
WHERE job_type_id = (SELECT id FROM job_types WHERE name = 'Print Ad');

-- ===================================================
-- Example 3: Job Type "Video Clip" → Notify ทีม Encoding
-- ===================================================

UPDATE notification_settings
SET 
    custom_emails = '["encoding-team@company.com"]'::jsonb,
    events = '["job_completed"]'::jsonb -- เฉพาะตอนเสร็จเท่านั้น
WHERE job_type_id = (SELECT id FROM job_types WHERE name = 'Video Clip');
```

#### Frontend Changes

**ไฟล์: `store/notificationStore.js`** (แก้ไขเพิ่มเติม)
```javascript
import { create } from 'zustand';
import { supabase } from '@/services/supabaseClient';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    
    // โหลด notifications
    loadNotifications: async (userId) => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
        
        const unread = data?.filter(n => !n.is_read).length || 0;
        set({ notifications: data || [], unreadCount: unread });
    },
    
    // Mark as read
    markAsRead: async (notificationId) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
        
        set(state => ({
            notifications: state.notifications.map(n => 
                n.id === notificationId ? { ...n, is_read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
        }));
    },
    
    // Subscribe to realtime
    subscribe: (userId) => {
        const channel = supabase
            .channel('notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                set(state => ({
                    notifications: [payload.new, ...state.notifications],
                    unreadCount: state.unreadCount + 1
                }));
            })
            .subscribe();
        
        return () => channel.unsubscribe();
    }
}));
```

**ไฟล์: `components/layout/Header.jsx`** (เพิ่ม Notification Bell)
```jsx
import { useNotificationStore } from '@/store/notificationStore';

// ใน Header component
const { notifications, unreadCount, loadNotifications } = useNotificationStore();
const [showNotifications, setShowNotifications] = useState(false);

// Notification Bell
<div className="notification-bell" onClick={() => setShowNotifications(!showNotifications)}>
    <BellIcon />
    {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
    )}
</div>

{showNotifications && (
    <div className="notification-dropdown">
        <h4>การแจ้งเตือน</h4>
        {notifications.length === 0 ? (
            <p className="empty">ไม่มีการแจ้งเตือน</p>
        ) : (
            notifications.map(n => (
                <NotificationItem 
                    key={n.id} 
                    notification={n}
                    onClick={() => handleNotificationClick(n)}
                />
            ))
        )}
    </div>
)}
```

---

## 5. Database Changes Summary

### 5.0 👤 User Management & Authentication Architecture

> ⚠️ **แนวทาง:** ออกแบบให้พร้อมสำหรับ **SSO (Single Sign-On)** ในอนาคต โดย **Auth กลาง + Profile ที่ตัวเอง**

#### 🎯 Concept: Separation of Concerns

```
┌─────────────────────────────────────────┐
│  SSO / Identity Provider (อนาคต)        │
│  - Google Workspace                     │
│  - Microsoft AD / Azure AD              │
│  - Custom SSO                           │
└────────────┬────────────────────────────┘
             │ Token (JWT)
             ↓
┌─────────────────────────────────────────┐
│  DJ-System (ปัจจุบัน)                    │
│  ✅ Authentication: Supabase Auth        │
│  ✅ Profile: Local Database              │
└─────────────────────────────────────────┘
```

#### 📊 Database Structure (Current + Future Ready)

```sql
-- ===================================================
-- users table (Local Profile - มีอยู่แล้ว)
-- ===================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) NOT NULL,  -- 'admin', 'requester', 'approver', 'assignee'
    
    -- Profile Data (เก็บที่ Local)
    bu_id INTEGER REFERENCES business_units(id),
    department_id INTEGER REFERENCES departments(id),
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- SSO Integration (สำหรับอนาคต)
    sso_provider VARCHAR(50),     -- 'google', 'azure', 'local'
    sso_user_id VARCHAR(255),     -- External User ID จาก SSO
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_sso ON users(sso_provider, sso_user_id);
CREATE INDEX idx_users_role ON users(role);

-- Comment
COMMENT ON TABLE users IS 'Local user profiles - เก็บข้อมูล Profile + สิทธิ์การใช้งาน (พร้อม SSO Integration)';
COMMENT ON COLUMN users.sso_provider IS 'Identity Provider: google, azure, local (null = ยังไม่ได้เชื่อม SSO)';
COMMENT ON COLUMN users.sso_user_id IS 'External User ID จาก SSO (ใช้สำหรับ Link กับ External Identity)';
```

#### 🔄 Authentication Flow

**ปัจจุบัน (Supabase Auth):**
```
1. User Login → Supabase Auth
2. Supabase Return JWT Token
3. Frontend ดึง Profile จาก users table
4. แสดง UI ตามสิทธิ์ (Role)
```

**อนาคต (SSO Integration):**
```
1. User Login via SSO (Google/Azure)
2. SSO Return Token (JWT)
3. Backend Verify Token กับ SSO Provider
4. ตรวจสอบ users table:
   - ถ้ามี (email match) → ใช้ Profile เดิม
   - ถ้าไม่มี → Auto-create Profile (Default: Requester)
5. Return DJ-System Token + Profile
6. Frontend แสดง UI ตามสิทธิ์
```

#### 🔑 User Creation Flow (4 Options)

| Option | สถานะ | Use Case |
|--------|-------|----------|
| **A. Admin Create (Manual)** | ✅ ปัจจุบัน | Admin สร้าง User ผ่านหน้า Admin Panel |
| **B. Self-Service Registration** | 🔜 แนะนำ | User สมัครเอง → Admin อนุมัติ + Set สิทธิ์ |
| **C. SSO Auto-Create** | 🔜 อนาคต | User Login ด้วย Email บริษัท → Auto-create Profile |
| **D. Invite Link** | 🔜 อนาคต | Admin ส่ง Link เชิญ → User สมัครเอง |

#### 🔐 Role & Permission System

**Role Mapping:**
```javascript
// roles.js
export const ROLES = {
    ADMIN: 'admin',
    REQUESTER: 'requester',
    APPROVER: 'approver',
    ASSIGNEE: 'assignee'
};

export const PERMISSIONS = {
    // Admin
    [ROLES.ADMIN]: {
        canCreateDJ: true,
        canApproveDJ: true,
        canAssignDJ: true,
        canAccessAdmin: true,
        canManageUsers: true,
        canViewAllReports: true
    },
    
    // Requester (Marketing)
    [ROLES.REQUESTER]: {
        canCreateDJ: true,
        canApproveDJ: false,
        canAssignDJ: false,
        canAccessAdmin: false,
        canViewOwnReports: true
    },
    
    // Approver (Head BU / CC Team)
    [ROLES.APPROVER]: {
        canCreateDJ: true,      // ✅ สร้างได้ + Auto-approve
        canApproveDJ: true,
        canAssignDJ: false,
        canAccessAdmin: false,  // เข้า Reports ได้บางส่วน
        canViewTeamReports: true
    },
    
    // Assignee (Graphic)
    [ROLES.ASSIGNEE]: {
        canCreateDJ: false,
        canApproveDJ: false,
        canAssignDJ: false,
        canAccessAdmin: false,
        canWorkOnJob: true,
        canCancelJob: true
    }
};
```

#### 🚀 Migration Strategy (ย้ายไป SSO อนาคต)

**Phase 1: ปัจจุบัน (Supabase Auth)**
```sql
-- users table มี sso_provider = NULL
```

**Phase 2: Hybrid (รองรับทั้ง Local + SSO)**
```javascript
// Login.jsx
const handleLogin = async (email, password, provider) => {
    if (provider === 'sso') {
        // SSO Flow
        const { token, user } = await loginWithSSO(provider);
        // ดึง Profile จาก users table (match โดย email)
        const profile = await api.getUserProfile(user.email);
        
        // ถ้าไม่มี → Auto-create
        if (!profile) {
            await api.createUserFromSSO({
                email: user.email,
                display_name: user.name,
                role: 'requester', // Default
                sso_provider: 'google',
                sso_user_id: user.id
            });
        }
    } else {
        // Local Auth (Supabase)
        const { token } = await supabase.auth.signInWithPassword({ email, password });
    }
};
```

**Phase 3: Full SSO (ปิด Local Auth)**
```sql
-- Disable Local Auth, ใช้ SSO เท่านั้น
UPDATE users SET sso_provider = 'google' WHERE sso_provider IS NULL;
```

#### 📋 API Functions

**ไฟล์: `apiService.js` - User Management**
```javascript
// ดึง Profile ตาม Email (สำหรับ SSO)
async getUserProfileByEmail(email) {
    const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    return data;
},

// สร้าง User จาก SSO
async createUserFromSSO(ssoData) {
    const { data, error } = await supabase
        .from('users')
        .insert({
            email: ssoData.email,
            display_name: ssoData.display_name,
            role: ssoData.role || 'requester',
            sso_provider: ssoData.sso_provider,
            sso_user_id: ssoData.sso_user_id,
            is_active: true
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
},

// Update Last Login
async updateLastLogin(userId) {
    await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
}
```

#### 🎨 Frontend Components

**ไฟล์: `Login.jsx` - รองรับ Multi-Provider**
```jsx
import { useState } from 'react';
import { supabase } from '@/services/supabaseClient';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Local Auth (ปัจจุบัน)
    const handleLocalLogin = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            alert('Login failed: ' + error.message);
            return;
        }
        
        // ดึง Profile
        const profile = await api.getUserProfileByEmail(email);
        
        // เช็คว่าต้องเปลี่ยน Password หรือไม่
        if (profile.must_change_password) {
            // Redirect ไปหน้าเปลี่ยน Password
            window.location.href = '/change-password';
            return;
        }
        
        localStorage.setItem('user', JSON.stringify(profile));
        
        // Redirect
        window.location.href = '/dashboard';
    };
    
    // SSO Auth (อนาคต)
    const handleSSOLogin = async (provider) => {
        // เชื่อมต่อ Google/Azure
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider // 'google' | 'azure'
        });
        
        // หลัง Callback → ตรวจสอบ + สร้าง Profile
        // ... (ดูตัวอย่างใน Phase 2 ด้านบน)
    };
    
    return (
        <div className="login-page">
            <div className="login-container">
                <h1>DJ-System Login</h1>
                
                {/* Local Login */}
                <div className="login-form">
                    <input 
                        type="email" 
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input 
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={handleLocalLogin}>
                        เข้าสู่ระบบ
                    </button>
                    
                    {/* Links */}
                    <div className="login-links">
                        <a href="/register">สมัครใช้งาน</a>
                        <a href="/forgot-password">ลืมรหัสผ่าน?</a>
                    </div>
                </div>
                
                {/* SSO Login (Hidden สำหรับอนาคต) */}
                {/* <div className="sso-options">
                    <button onClick={() => handleSSOLogin('google')}>
                        <GoogleIcon /> Login with Google
                    </button>
                    <button onClick={() => handleSSOLogin('azure')}>
                        <MicrosoftIcon /> Login with Microsoft
                    </button>
                </div> */}
            </div>
        </div>
    );
}
```

---

#### 🆕 Self-Service Registration Flow (แนะนำ)

> ⚠️ **แนวทาง:** User สมัครเอง → Admin อนุมัติ + Set สิทธิ์ → Auto Gen Password → บังคับเปลี่ยน Password ครั้งแรก

##### 📊 Registration Flow Diagram

```
┌─────────────────────────────────────────┐
│  1. User สมัครใช้งาน (Register Page)     │
│     - กรอกฟอร์ม: คำนำหน้า ชื่อ นามสกุล   │
│     - Email, เบอร์โทร                    │
└────────────┬────────────────────────────┘
             │ Submit
             ↓
┌─────────────────────────────────────────┐
│  2. บันทึกใน user_registration_requests │
│     - status: pending                   │
│     - created_at: now()                 │
└────────────┬────────────────────────────┘
             │
             ├─→ 📧 Email to Admin: "มีคนสมัครใหม่"
             └─→ 📧 Email to User: "รอการตรวจสอบ"
             ↓
┌─────────────────────────────────────────┐
│  3. Admin อนุมัติ (User Management)      │
│     - ตรวจสอบข้อมูล                      │
│     - Set Role (requester/approver/etc) │
│     - Set BU/Department                 │
│     - กด "อนุมัติและสร้างบัญชี"          │
└────────────┬────────────────────────────┘
             │ Approve
             ↓
┌─────────────────────────────────────────┐
│  4. ระบบสร้าง User + Gen Password        │
│     - Insert ลง users table             │
│     - Gen Password 10 ตัวอักษร          │
│     - Flag: must_change_password = true │
└────────────┬────────────────────────────┘
             │
             └─→ 📧 Email to User: "บัญชีพร้อมใช้งาน + Username & Password"
             ↓
┌─────────────────────────────────────────┐
│  5. User Login ครั้งแรก                  │
│     - Username: email                   │
│     - Password: จากอีเมล                │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  6. บังคับเปลี่ยน Password               │
│     - หน้า Change Password              │
│     - ต้องใส่ Password เดิม + ใหม่       │
│     - Update must_change_password=false │
└────────────┬────────────────────────────┘
             │
             ↓
        ✅ เข้าใช้งานได้
```

##### 🗄️ Database Changes

```sql
-- ===================================================
-- 1. user_registration_requests (คำขอสมัครใช้งาน)
-- ===================================================

CREATE TABLE user_registration_requests (
    id SERIAL PRIMARY KEY,
    
    -- ข้อมูลที่ User กรอก
    title VARCHAR(50),          -- 'นาย', 'นาง', 'นางสาว', 'อื่นๆ'
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    
    -- สถานะ
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    
    -- Admin Actions
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    reject_reason TEXT,
    
    -- Approved Data (Admin กรอกตอนอนุมัติ)
    approved_role VARCHAR(50),
    approved_bu_id INTEGER REFERENCES business_units(id),
    approved_department_id INTEGER REFERENCES departments(id),
    
    -- Meta
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Security
    ip_address VARCHAR(50),
    user_agent TEXT
);

-- Index
CREATE INDEX idx_user_reg_status ON user_registration_requests(status);
CREATE INDEX idx_user_reg_email ON user_registration_requests(email);

-- Comment
COMMENT ON TABLE user_registration_requests IS 'คำขอสมัครใช้งานจาก User (รอ Admin อนุมัติ)';

-- ===================================================
-- 2. เพิ่ม columns ใน users table
-- ===================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_request_id INTEGER REFERENCES user_registration_requests(id);

COMMENT ON COLUMN users.must_change_password IS 'บังคับเปลี่ยน Password ครั้งแรกหรือไม่';
COMMENT ON COLUMN users.registration_request_id IS 'Link กลับไปหา Request ที่สมัครมา';

-- ===================================================
-- 3. password_reset_tokens (OTP สำหรับรีเซ็ตพาส)
-- ===================================================

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    
    -- Token/OTP
    token VARCHAR(255) UNIQUE NOT NULL,  -- OTP 6 หลัก หรือ Random Token
    token_type VARCHAR(20) DEFAULT 'otp', -- 'otp' | 'link'
    
    -- Expire
    expires_at TIMESTAMP NOT NULL,
    
    -- Usage
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    
    -- Meta
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Security
    ip_address VARCHAR(50),
    user_agent TEXT
);

-- Index
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_email ON password_reset_tokens(email);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Comment
COMMENT ON TABLE password_reset_tokens IS 'OTP/Token สำหรับรีเซ็ตรหัสผ่าน (Expire ใน 10 นาที)';

-- ===================================================
-- 4. email_templates (Email Templates)
-- ===================================================

CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    variables JSONB,  -- ['{{name}}', '{{email}}', '{{password}}']
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert Templates
INSERT INTO email_templates (code, subject, body, variables) VALUES
('admin_new_registration', 
 'มีคำขอสมัครใช้งานใหม่', 
 'มีผู้ใช้งานใหม่สมัครเข้ามา<br>ชื่อ: {{name}}<br>Email: {{email}}<br>เบอร์โทร: {{phone}}<br><br>กรุณาเข้าไปตรวจสอบและอนุมัติที่: {{admin_url}}',
 '["{{name}}", "{{email}}", "{{phone}}", "{{admin_url}}"]'),

('user_registration_submitted',
 'ขอบคุณที่สมัครใช้งาน DJ-System',
 'สวัสดีคุณ {{name}}<br><br>เราได้รับคำขอสมัครใช้งานของคุณแล้ว<br>กรุณารอการตรวจสอบจากผู้ดูแลระบบ<br><br>คุณจะได้รับอีเมลยืนยันเมื่อบัญชีของคุณพร้อมใช้งาน',
 '["{{name}}"]'),

('user_account_approved',
 'บัญชี DJ-System ของคุณพร้อมใช้งานแล้ว',
 'สวัสดีคุณ {{name}}<br><br>บัญชีของคุณได้รับการอนุมัติแล้ว!<br><br><strong>ข้อมูลเข้าสู่ระบบ:</strong><br>Username: {{email}}<br>Password: {{password}}<br><br>⚠️ กรุณาเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบครั้งแรก<br><br>เข้าสู่ระบบ: {{login_url}}',
 '["{{name}}", "{{email}}", "{{password}}", "{{login_url}}"]'),

('password_reset_otp',
 'รหัส OTP สำหรับรีเซ็ตรหัสผ่าน',
 'สวัสดีคุณ {{name}}<br><br>รหัส OTP ของคุณคือ: <strong>{{otp}}</strong><br><br>รหัสนี้จะหมดอายุใน {{expiry_minutes}} นาที<br><br>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้',
 '["{{name}}", "{{otp}}", "{{expiry_minutes}}"]');

COMMENT ON TABLE email_templates IS 'Email Templates สำหรับส่งอีเมลอัตโนมัติ';
```

##### 🎨 Frontend Components

**1. ไฟล์ใหม่: `pages/Register.jsx` - หน้าสมัครใช้งาน**
```jsx
import { useState } from 'react';
import { api } from '@/services/apiService';

export default function Register() {
    const [formData, setFormData] = useState({
        title: 'นาย',
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            await api.submitRegistration(formData);
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };
    
    if (success) {
        return (
            <div className="register-page">
                <div className="success-message">
                    <h2>✅ สมัครสำเร็จ!</h2>
                    <p>เราได้รับคำขอสมัครใช้งานของคุณแล้ว</p>
                    <p>กรุณารอการตรวจสอบจากผู้ดูแลระบบ</p>
                    <p>คุณจะได้รับอีเมลยืนยันเมื่อบัญชีของคุณพร้อมใช้งาน</p>
                    <a href="/login" className="btn-primary">กลับสู่หน้าเข้าสู่ระบบ</a>
                </div>
            </div>
        );
    }
    
    return (
        <div className="register-page">
            <div className="register-container">
                <h1>สมัครใช้งาน DJ-System</h1>
                
                <form onSubmit={handleSubmit}>
                    {/* คำนำหน้า */}
                    <div className="form-group">
                        <label>คำนำหน้า *</label>
                        <select 
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                        >
                            <option value="นาย">นาย</option>
                            <option value="นาง">นาง</option>
                            <option value="นางสาว">นางสาว</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                    
                    {/* ชื่อ */}
                    <div className="form-group">
                        <label>ชื่อ *</label>
                        <input 
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            placeholder="ชื่อ"
                            required
                        />
                    </div>
                    
                    {/* นามสกุล */}
                    <div className="form-group">
                        <label>นามสกุล *</label>
                        <input 
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            placeholder="นามสกุล"
                            required
                        />
                    </div>
                    
                    {/* Email */}
                    <div className="form-group">
                        <label>อีเมล *</label>
                        <input 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="example@company.com"
                            required
                        />
                    </div>
                    
                    {/* เบอร์โทร */}
                    <div className="form-group">
                        <label>เบอร์โทรศัพท์ *</label>
                        <input 
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="08X-XXX-XXXX"
                            required
                        />
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                        <div className="error-message">{error}</div>
                    )}
                    
                    {/* Submit Button */}
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'กำลังส่งคำขอ...' : 'สมัครใช้งาน'}
                    </button>
                    
                    {/* Back to Login */}
                    <div className="text-center mt-4">
                        <a href="/login">กลับสู่หน้าเข้าสู่ระบบ</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

**2. ไฟล์ใหม่: `pages/ChangePassword.jsx` - บังคับเปลี่ยนรหัสผ่านครั้งแรก**
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/apiService';

export default function ChangePassword() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const validatePassword = () => {
        if (formData.newPassword.length < 8) {
            setError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
            return false;
        }
        
        if (formData.newPassword !== formData.confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return false;
        }
        
        if (formData.newPassword === formData.currentPassword) {
            setError('รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม');
            return false;
        }
        
        return true;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validatePassword()) return;
        
        setLoading(true);
        
        try {
            await api.changePassword(formData.currentPassword, formData.newPassword);
            alert('เปลี่ยนรหัสผ่านสำเร็จ!');
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="change-password-page">
            <div className="change-password-container">
                <div className="warning-box">
                    ⚠️ <strong>จำเป็นต้องเปลี่ยนรหัสผ่าน</strong>
                    <p>กรุณาเปลี่ยนรหัสผ่านชั่วคราวเป็นรหัสผ่านใหม่ของคุณ</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {/* รหัสผ่านปัจจุบัน */}
                    <div className="form-group">
                        <label>รหัสผ่านปัจจุบัน *</label>
                        <input 
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                            placeholder="รหัสผ่านที่ได้รับทางอีเมล"
                            required
                        />
                    </div>
                    
                    {/* รหัสผ่านใหม่ */}
                    <div className="form-group">
                        <label>รหัสผ่านใหม่ *</label>
                        <input 
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                            required
                        />
                        <small>รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร</small>
                    </div>
                    
                    {/* ยืนยันรหัสผ่านใหม่ */}
                    <div className="form-group">
                        <label>ยืนยันรหัสผ่านใหม่ *</label>
                        <input 
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            placeholder="ใส่รหัสผ่านใหม่อีกครั้ง"
                            required
                        />
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                        <div className="error-message">{error}</div>
                    )}
                    
                    {/* Submit Button */}
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
                    </button>
                </form>
            </div>
        </div>
    );
}
```

**3. ไฟล์ใหม่: `pages/ForgotPassword.jsx` - ลืมรหัสผ่าน (OTP)**
```jsx
import { useState } from 'react';
import { api } from '@/services/apiService';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    // Step 1: ส่ง OTP
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            await api.requestPasswordReset(email);
            setStep(2);
        } catch (err) {
            setError(err.message || 'ไม่พบอีเมลนี้ในระบบ');
        } finally {
            setLoading(false);
        }
    };
    
    // Step 2: ยืนยัน OTP + รีเซ็ตพาส
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        
        if (newPassword.length < 8) {
            setError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }
        
        setLoading(true);
        
        try {
            await api.resetPasswordWithOTP(email, otp, newPassword);
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'OTP ไม่ถูกต้องหรือหมดอายุ');
        } finally {
            setLoading(false);
        }
    };
    
    if (success) {
        return (
            <div className="forgot-password-page">
                <div className="success-message">
                    <h2>✅ รีเซ็ตรหัสผ่านสำเร็จ!</h2>
                    <p>คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
                    <a href="/login" className="btn-primary">เข้าสู่ระบบ</a>
                </div>
            </div>
        );
    }
    
    return (
        <div className="forgot-password-page">
            <div className="forgot-password-container">
                <h1>ลืมรหัสผ่าน</h1>
                
                {step === 1 ? (
                    // Step 1: กรอกอีเมล
                    <form onSubmit={handleSendOTP}>
                        <p className="text-gray-600 mb-4">
                            กรุณากรอกอีเมลที่ใช้สมัครสมาชิก<br/>
                            เราจะส่งรหัส OTP ไปยังอีเมลของคุณ
                        </p>
                        
                        <div className="form-group">
                            <label>อีเมล *</label>
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@company.com"
                                required
                            />
                        </div>
                        
                        {error && (
                            <div className="error-message">{error}</div>
                        )}
                        
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'กำลังส่ง OTP...' : 'ส่งรหัส OTP'}
                        </button>
                        
                        <div className="text-center mt-4">
                            <a href="/login">กลับสู่หน้าเข้าสู่ระบบ</a>
                        </div>
                    </form>
                ) : (
                    // Step 2: กรอก OTP + รหัสผ่านใหม่
                    <form onSubmit={handleResetPassword}>
                        <div className="info-box">
                            📧 เราได้ส่งรหัส OTP 6 หลักไปยัง<br/>
                            <strong>{email}</strong>
                        </div>
                        
                        {/* OTP */}
                        <div className="form-group">
                            <label>รหัส OTP (6 หลัก) *</label>
                            <input 
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                maxLength="6"
                                required
                            />
                            <small>รหัสนี้จะหมดอายุใน 10 นาที</small>
                        </div>
                        
                        {/* รหัสผ่านใหม่ */}
                        <div className="form-group">
                            <label>รหัสผ่านใหม่ *</label>
                            <input 
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                required
                            />
                        </div>
                        
                        {/* ยืนยันรหัสผ่านใหม่ */}
                        <div className="form-group">
                            <label>ยืนยันรหัสผ่านใหม่ *</label>
                            <input 
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="ใส่รหัสผ่านใหม่อีกครั้ง"
                                required
                            />
                        </div>
                        
                        {error && (
                            <div className="error-message">{error}</div>
                        )}
                        
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'กำลังรีเซ็ตรหัสผ่าน...' : 'รีเซ็ตรหัสผ่าน'}
                        </button>
                        
                        <div className="text-center mt-4">
                            <button 
                                type="button" 
                                onClick={() => setStep(1)} 
                                className="btn-link"
                            >
                                ส่ง OTP ใหม่อีกครั้ง
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
```

**4. อัพเดท `pages/admin/Users.jsx` - เพิ่ม Pending Registrations Tab**
```jsx
// เพิ่ม Tab สำหรับ Pending Registrations
const [activeTab, setActiveTab] = useState('users'); // 'users' | 'pending'
const [pendingRegistrations, setPendingRegistrations] = useState([]);

useEffect(() => {
    if (activeTab === 'pending') {
        loadPendingRegistrations();
    }
}, [activeTab]);

const loadPendingRegistrations = async () => {
    const data = await api.getPendingRegistrations();
    setPendingRegistrations(data);
};

// UI
return (
    <div className="users-page">
        <h1>จัดการผู้ใช้งาน</h1>
        
        {/* Tabs */}
        <div className="tabs">
            <button 
                className={activeTab === 'users' ? 'active' : ''}
                onClick={() => setActiveTab('users')}
            >
                ผู้ใช้งานทั้งหมด
            </button>
            <button 
                className={activeTab === 'pending' ? 'active' : ''}
                onClick={() => setActiveTab('pending')}
            >
                คำขอสมัคร ({pendingRegistrations.length})
            </button>
        </div>
        
        {/* Content */}
        {activeTab === 'users' ? (
            // Existing Users List
            <div className="users-list">
                {/* ... existing code ... */}
            </div>
        ) : (
            // Pending Registrations
            <div className="pending-list">
                <table>
                    <thead>
                        <tr>
                            <th>ชื่อ-นามสกุล</th>
                            <th>อีเมล</th>
                            <th>เบอร์โทร</th>
                            <th>วันที่สมัคร</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingRegistrations.map(req => (
                            <tr key={req.id}>
                                <td>{req.title} {req.first_name} {req.last_name}</td>
                                <td>{req.email}</td>
                                <td>{req.phone}</td>
                                <td>{new Date(req.created_at).toLocaleString('th-TH')}</td>
                                <td>
                                    <button 
                                        onClick={() => handleApproveRegistration(req)}
                                        className="btn-success"
                                    >
                                        อนุมัติ
                                    </button>
                                    <button 
                                        onClick={() => handleRejectRegistration(req.id)}
                                        className="btn-danger"
                                    >
                                        ปฏิเสธ
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);
```

##### 🔐 Security Best Practices

1. **Password Policy:**
   - ความยาวอย่างน้อย 8 ตัวอักษร
   - ผสม A-Z, a-z, 0-9, สัญลักษณ์

2. **OTP Expiration:**
   - Expire ใน 10 นาที
   - ใช้ได้ครั้งเดียว (One-time use)

3. **Rate Limiting:**
   - จำกัดการส่ง OTP (ไม่เกิน 3 ครั้ง/ชั่วโมง)
   - จำกัด Login Attempts (5 ครั้ง/15 นาที)

4. **Email Verification:**
   - ต้องยืนยันอีเมลก่อนเข้าใช้งาน
   - ส่ง Verification Link หรือ OTP

---

**ไฟล์: `apiService.js` - Registration & Password Management**
```javascript
// ===================================================
// Self-Service Registration
// ===================================================

// Submit Registration Request
async submitRegistration(registrationData) {
    const { data, error } = await supabase
        .from('user_registration_requests')
        .insert({
            title: registrationData.title,
            first_name: registrationData.firstName,
            last_name: registrationData.lastName,
            email: registrationData.email,
            phone: registrationData.phone,
            status: 'pending',
            ip_address: registrationData.ipAddress,
            user_agent: navigator.userAgent
        })
        .select()
        .single();
    
    if (error) throw error;
    
    // ส่งอีเมลแจ้ง Admin
    await this.sendEmail('admin_new_registration', {
        name: `${registrationData.firstName} ${registrationData.lastName}`,
        email: registrationData.email,
        phone: registrationData.phone,
        admin_url: `${window.location.origin}/admin/users`
    });
    
    // ส่งอีเมลยืนยันกับ User
    await this.sendEmail('user_registration_submitted', {
        name: registrationData.firstName
    }, registrationData.email);
    
    return data;
},

// Get Pending Registrations (สำหรับ Admin)
async getPendingRegistrations() {
    const { data } = await supabase
        .from('user_registration_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    
    return data || [];
},

// Approve Registration (Admin)
async approveRegistration(requestId, approvalData) {
    const currentUser = await this.getCurrentUser();
    
    // 1. Update Request
    const { data: request } = await supabase
        .from('user_registration_requests')
        .update({
            status: 'approved',
            reviewed_by: currentUser.id,
            reviewed_at: new Date().toISOString(),
            approved_role: approvalData.role,
            approved_bu_id: approvalData.buId,
            approved_department_id: approvalData.departmentId
        })
        .eq('id', requestId)
        .select()
        .single();
    
    // 2. Generate Password (10 ตัวอักษร)
    const tempPassword = this.generatePassword(10);
    
    // 3. Create User in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: request.email,
        password: tempPassword,
        email_confirm: true
    });
    
    if (authError) throw authError;
    
    // 4. Create User Profile
    const { data: user } = await supabase
        .from('users')
        .insert({
            email: request.email,
            display_name: `${request.first_name} ${request.last_name}`,
            title: request.title,
            role: approvalData.role,
            bu_id: approvalData.buId,
            department_id: approvalData.departmentId,
            phone: request.phone,
            must_change_password: true,
            registration_request_id: requestId,
            is_active: true
        })
        .select()
        .single();
    
    // 5. Send Email with Credentials
    await this.sendEmail('user_account_approved', {
        name: request.first_name,
        email: request.email,
        password: tempPassword,
        login_url: `${window.location.origin}/login`
    }, request.email);
    
    return user;
},

// Generate Random Password
generatePassword(length = 10) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
},

// ===================================================
// Password Management
// ===================================================

// Change Password (บังคับครั้งแรก)
async changePassword(currentPassword, newPassword) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });
    
    if (error) throw error;
    
    // Update flag
    const user = await this.getCurrentUser();
    await supabase
        .from('users')
        .update({
            must_change_password: false,
            password_changed_at: new Date().toISOString()
        })
        .eq('id', user.id);
},

// Request Password Reset (ส่ง OTP)
async requestPasswordReset(email) {
    // 1. ตรวจสอบ User
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    if (!user) {
        throw new Error('ไม่พบอีเมลนี้ในระบบ');
    }
    
    // 2. Generate OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 3. Save Token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire ใน 10 นาที
    
    await supabase
        .from('password_reset_tokens')
        .insert({
            user_id: user.id,
            email: email,
            token: otp,
            token_type: 'otp',
            expires_at: expiresAt.toISOString(),
            ip_address: await this.getClientIP()
        });
    
    // 4. Send OTP Email
    await this.sendEmail('password_reset_otp', {
        name: user.display_name,
        otp: otp,
        expiry_minutes: '10'
    }, email);
    
    return { success: true, message: 'ส่ง OTP ไปยังอีเมลของคุณแล้ว' };
},

// Verify OTP & Reset Password
async resetPasswordWithOTP(email, otp, newPassword) {
    // 1. ตรวจสอบ OTP
    const { data: token } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', otp)
        .eq('is_used', false)
        .single();
    
    if (!token) {
        throw new Error('OTP ไม่ถูกต้อง');
    }
    
    // 2. เช็ค Expire
    if (new Date(token.expires_at) < new Date()) {
        throw new Error('OTP หมดอายุแล้ว กรุณาขอใหม่');
    }
    
    // 3. Reset Password
    const { error } = await supabase.auth.admin.updateUserById(
        token.user_id,
        { password: newPassword }
    );
    
    if (error) throw error;
    
    // 4. Mark Token as Used
    await supabase
        .from('password_reset_tokens')
        .update({
            is_used: true,
            used_at: new Date().toISOString()
        })
        .eq('id', token.id);
    
    return { success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ' };
},

// Send Email (Helper)
async sendEmail(templateCode, variables, toEmail = null) {
    // Implementation: ดึง Template + Replace Variables + ส่ง Email
    // ใช้ Supabase Edge Functions หรือ External Email Service
    console.log('Sending email:', templateCode, variables, toEmail);
}
```

---

### 5.1 Tables ใหม่ที่ต้องสร้าง
| Table | Purpose |
|-------|---------|
| `sla_shift_logs` | Log การ shift SLA เมื่อมี Urgent |
| `cancel_reasons` | Lookup table สาเหตุการยกเลิกงาน |

### 5.2 Columns ใหม่ที่ต้องเพิ่ม

**Table: `jobs`**
| Column | Type | Description |
|--------|------|-------------|
| `priority` | VARCHAR(20) | 'normal' / 'urgent' |
| `original_due_date` | TIMESTAMP | Due date เดิมก่อน shift |
| `shifted_by_job_id` | INTEGER | FK to urgent job |
| `artwork_count` | INTEGER | จำนวนชิ้นงาน |
| `artwork_details` | TEXT | JSON รายละเอียด |
| `cancelled_by` | INTEGER | FK to users |
| `cancel_reason` | TEXT | สาเหตุการยกเลิก |
| `cancelled_at` | TIMESTAMP | วันที่ยกเลิก |
| `requires_approval` | BOOLEAN | ต้องผ่านการอนุมัติหรือไม่ |

**Table: `job_types`**
| Column | Type | Description |
|--------|------|-------------|
| `requires_approval` | BOOLEAN | ต้องผ่านการอนุมัติหรือไม่ |
| `skip_approval_levels` | INTEGER[] | Levels ที่ข้ามได้ |

---

## 6. Frontend Changes Summary

### 6.1 ไฟล์ที่ต้องแก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|----------------|
| `CreateDJ.jsx` | + Priority selector, + Artwork count input |
| `JobDetail.jsx` | + Cancel button & modal, + Priority badge |
| `DJList.jsx` | + Priority badge, + Shift indicator |
| `JobTypeSLA.jsx` | + Requires approval checkbox |
| `ApprovalsQueue.jsx` | + Handle skip approval jobs |
| `utils/slaCalculator.js` | + Work day calculation enhancement |
| `store/notificationStore.js` | + Realtime subscription |
| `components/layout/Header.jsx` | + Notification bell |
| `services/apiService.js` | + shiftSLAForUrgentJob, + cancelJob, + getReportStats |

### 6.2 ไฟล์ใหม่ที่ต้องสร้าง

| ไฟล์ | Purpose |
|------|---------|
| `pages/admin/Reports.jsx` | หน้า Reports Dashboard |
| `components/common/NotificationItem.jsx` | Notification list item |
| `components/common/StatCard.jsx` | Stats card component |

### 6.3 Routes ที่ต้องเพิ่ม

```jsx
// ใน App.jsx
<Route path="/admin/reports" element={<Reports />} />
```

---

## 7. API Changes Summary

### 7.1 Functions ใหม่ใน `apiService.js`

| Function | Parameters | Description |
|----------|------------|-------------|
| `shiftSLAForUrgentJob` | (urgentJobId, assigneeId, shiftDays) | Shift SLA งานอื่นเมื่อมี Urgent |
| `cancelJob` | (jobId, reasonCode, reasonDetail, userId) | ยกเลิกงานโดย Graphic |
| `getReportStats` | ({ period, groupBy }) | ดึงข้อมูล Report |
| `getCancelReasons` | () | ดึง lookup table สาเหตุการยกเลิก |

### 7.2 Functions ที่ต้องแก้ไข

| Function | การเปลี่ยนแปลง |
|----------|----------------|
| `createJob` | + Check requires_approval, + Set priority, + artwork_count |
| `approveJob` | + Check if job type requires approval |
| `getJobs` | + Include priority, shift info |

---

## 8. Timeline & Priority

### 🔴 Phase 1: Critical (สัปดาห์ที่ 1-2)
- [ ] Database migrations (priority, artwork_count, etc.)
- [ ] Urgent Priority Impact
- [ ] Approval Skip by Job Type
- [ ] Work Day Calculation Fix

### 🟡 Phase 2: Important (สัปดาห์ที่ 3-4)
- [ ] Graphic Cancel/Reject
- [ ] Artwork Count UI
- [ ] Reports Dashboard (Basic)

### 🟢 Phase 3: Nice to have (สัปดาห์ที่ 5+)
- [ ] Notification System Enhancement
- [ ] Reports Drill-down
- [ ] Cloud Storage Integration

---

## 📝 Notes

1. **ก่อนแก้ไขทุกครั้ง** ให้ backup database และทดสอบใน development environment
2. **Urgent feature** ต้องทดสอบ edge cases หลายกรณี
3. **Reports** อาจต้องใช้ View หรือ Materialized View สำหรับ performance
4. **Notification** พิจารณาใช้ Supabase Realtime หรือ Polling

---

**Last Updated:** 22 มกราคม 2569  
**Author:** Development Team
