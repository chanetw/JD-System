# V2 Registration Management - Integration Guide for UserManagement.jsx

## Overview

คู่มือนี้จะอธิบายวิธีการเพิ่ม **V2 Registration Approval** เข้าไปใน `UserManagement.jsx` ที่มีอยู่แล้ว โดยไม่ต้องสร้างหน้าใหม่

---

## 🎯 เป้าหมาย

ใช้ Admin Panel เดิม (**UserManagement.jsx**) และเพิ่ม:
1. Tab สำหรับ "V2 Pending Registrations"
2. เชื่อมต่อ v2 API สำหรับ list/approve/reject registration requests
3. ใช้ modal และ UI patterns เดิมที่มีอยู่แล้ว

---

## 📂 ไฟล์ที่ต้องแก้ไข

| File | Action |
|------|--------|
| `UserManagement.jsx` | เพิ่ม tab "V2 Registrations" + handlers |
| `registrationServiceV2.ts` | Service สำหรับเรียก v2 API (สร้างแล้ว ✅) |
| `backend/api-server/src/v2/index.js` | เพิ่ม admin endpoints (สร้างแล้ว ✅) |

---

## 🔧 Step 1: Import V2 Registration Service

เพิ่ม import ที่ด้านบนของ `UserManagement.jsx`:

```javascript
// เพิ่ม import นี้
import { registrationServiceV2 } from '@shared/services/modules/registrationServiceV2';
```

---

## 🔧 Step 2: เพิ่ม State สำหรับ V2 Registrations

เพิ่ม state variables:

```javascript
export default function UserManagementNew() {
    // ... existing state ...

    // ✨ เพิ่มส่วนนี้
    const [v2Registrations, setV2Registrations] = useState([]);
    const [v2RegistrationsLoading, setV2RegistrationsLoading] = useState(false);
    const [v2Statistics, setV2Statistics] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });
```

---

## 🔧 Step 3: สร้าง Function สำหรับโหลด V2 Registrations

เพิ่ม function ใหม่:

```javascript
    /**
     * ✨ Load V2 Registration Requests
     */
    const loadV2Registrations = async () => {
        try {
            setV2RegistrationsLoading(true);

            // เรียก v2 API
            const response = await registrationServiceV2.listRegistrationRequests({
                status: 'PENDING',
                page: 1,
                limit: 50
            });

            if (response.success && response.data) {
                setV2Registrations(response.data);
            } else {
                console.error('Failed to load v2 registrations:', response.error);
                showAlert('error', 'ไม่สามารถโหลดคำขอสมัคร V2 ได้');
            }
        } catch (error) {
            console.error('Error loading v2 registrations:', error);
            showAlert('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setV2RegistrationsLoading(false);
        }
    };

    /**
     * ✨ Load V2 Statistics
     */
    const loadV2Statistics = async () => {
        try {
            const response = await registrationServiceV2.getStatistics();
            if (response.success && response.data) {
                setV2Statistics(response.data);
            }
        } catch (error) {
            console.error('Error loading v2 statistics:', error);
        }
    };
```

---

## 🔧 Step 4: เพิ่มการโหลดข้อมูลใน useEffect

แก้ไข useEffect ที่มีอยู่:

```javascript
    useEffect(() => {
        if (activeTab === 'registrations') {
            loadRegistrations(); // V1 registrations
            loadMasterData();
        } else if (activeTab === 'active') {
            loadUsers();
            loadMasterData();
        } else if (activeTab === 'v2-registrations') {
            // ✨ เพิ่มส่วนนี้
            loadV2Registrations();
            loadV2Statistics();
            loadMasterData();
        }
    }, [activeTab]);
```

---

## 🔧 Step 5: สร้าง Approve/Reject Handlers สำหรับ V2

เพิ่ม handlers:

```javascript
    /**
     * ✨ Handle V2 Approve Click
     */
    const handleV2ApproveClick = (registrationId) => {
        const registration = v2Registrations.find(r => r.id === registrationId);
        setApproveModal({
            show: true,
            registrationId,
            registrationData: {
                ...registration,
                // Map v2 structure to existing modal format
                email: registration.email,
                first_name: registration.firstName,
                last_name: registration.lastName,
                organization_name: registration.organization.name
            }
        });

        // Reset approval data
        setApprovalSelectedRoles(['Member']); // Default role
        setApprovalRoleConfigs({});
    };

    /**
     * ✨ Handle V2 Approve Submit
     */
    const handleV2ApproveSubmit = async () => {
        try {
            setIsSubmitting(true);

            const registrationId = approveModal.registrationId;

            // Get selected role ID (default to Member role = 4)
            const roleId = approvalSelectedRoles.length > 0
                ? getRoleIdByName(approvalSelectedRoles[0])
                : 4;

            // Call v2 API
            const response = await registrationServiceV2.approveRegistration(
                registrationId,
                { roleId }
            );

            if (response.success) {
                showAlert('success', '✅ อนุมัติสำเร็จ! ผู้ใช้ได้รับสร้างบัญชีแล้ว');

                // Reload registrations
                loadV2Registrations();
                loadV2Statistics();

                // Close modal
                setApproveModal({ show: false, registrationId: null, registrationData: null });
            } else {
                showAlert('error', response.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
            }
        } catch (error) {
            console.error('Error approving v2 registration:', error);
            showAlert('error', 'เกิดข้อผิดพลาดในการอนุมัติ');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * ✨ Handle V2 Reject Submit
     */
    const handleV2RejectSubmit = async () => {
        try {
            setIsSubmitting(true);

            if (!rejectReason.trim()) {
                showAlert('error', 'กรุณาระบุเหตุผลในการปฏิเสธ');
                return;
            }

            const response = await registrationServiceV2.rejectRegistration(
                rejectModal.registrationId,
                { reason: rejectReason }
            );

            if (response.success) {
                showAlert('success', '✅ ปฏิเสธคำขอสมัครสำเร็จ');

                // Reload registrations
                loadV2Registrations();
                loadV2Statistics();

                // Close modal
                setRejectModal({ show: false, registrationId: null, registrationEmail: null });
                setRejectReason('');
            } else {
                showAlert('error', response.message || 'เกิดข้อผิดพลาดในการปฏิเสธ');
            }
        } catch (error) {
            console.error('Error rejecting v2 registration:', error);
            showAlert('error', 'เกิดข้อผิดพลาดในการปฏิเสธ');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Helper: Get role ID by name
     */
    const getRoleIdByName = (roleName) => {
        const roleMap = {
            'SuperAdmin': 1,
            'OrgAdmin': 2,
            'TeamLead': 3,
            'Member': 4
        };
        return roleMap[roleName] || 4;
    };
```

---

## 🔧 Step 6: เพิ่ม Tab "V2 Registrations" ใน UI

แก้ไข Tab navigation:

```jsx
    {/* Tabs */}
    <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
            <button
                onClick={() => setActiveTab('active')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'active'
                        ? 'border-rose-500 text-rose-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <UserIcon className="w-5 h-5 inline-block mr-2" />
                ผู้ใช้งานระบบ
            </button>

            <button
                onClick={() => setActiveTab('registrations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'registrations'
                        ? 'border-rose-500 text-rose-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                คำขอสมัครใช้งาน (V1)
                {registrations.length > 0 && (
                    <span className="ml-2 bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {registrations.length}
                    </span>
                )}
            </button>

            {/* ✨ เพิ่ม Tab นี้ */}
            <button
                onClick={() => setActiveTab('v2-registrations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'v2-registrations'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <EnvelopeIcon className="w-5 h-5 inline-block mr-2" />
                คำขอสมัครใช้งาน (V2)
                {v2Statistics.pending > 0 && (
                    <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {v2Statistics.pending}
                    </span>
                )}
            </button>
        </nav>
    </div>
```

---

## 🔧 Step 7: สร้าง V2 Registrations Table

เพิ่ม section สำหรับแสดง V2 registrations:

```jsx
    {/* ✨ V2 Registrations Tab Content */}
    {activeTab === 'v2-registrations' && (
        <div className="bg-white shadow rounded-lg">
            {/* Header with Statistics */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                        คำขอสมัครใช้งาน (V2 Auth System)
                    </h3>
                    <div className="flex gap-4 text-sm">
                        <span className="text-yellow-600">
                            รอดำเนินการ: <strong>{v2Statistics.pending}</strong>
                        </span>
                        <span className="text-green-600">
                            อนุมัติแล้ว: <strong>{v2Statistics.approved}</strong>
                        </span>
                        <span className="text-red-600">
                            ปฏิเสธ: <strong>{v2Statistics.rejected}</strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            {v2RegistrationsLoading ? (
                <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">กำลังโหลด...</p>
                </div>
            ) : v2Registrations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    ไม่มีคำขอสมัครที่รอดำเนินการ
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    ชื่อ-นามสกุล
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    อีเมล
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    องค์กร
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    วันที่สมัคร
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    สถานะ
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {v2Registrations.map((reg) => (
                                <tr key={reg.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {reg.firstName} {reg.lastName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{reg.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {reg.organization.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {new Date(reg.createdAt).toLocaleDateString('th-TH')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            reg.status === 'PENDING'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : reg.status === 'APPROVED'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {reg.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleV2ApproveClick(reg.id)}
                                            className="text-green-600 hover:text-green-900 mr-3"
                                        >
                                            <CheckIcon className="w-5 h-5 inline" /> อนุมัติ
                                        </button>
                                        <button
                                            onClick={() =>
                                                setRejectModal({
                                                    show: true,
                                                    registrationId: reg.id,
                                                    registrationEmail: reg.email,
                                                })
                                            }
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <XMarkIcon className="w-5 h-5 inline" /> ปฏิเสธ
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )}
```

---

## 🔧 Step 8: อัปเดต Approve Modal Handler

แก้ไข approve modal submit handler เพื่อรองรับทั้ง v1 และ v2:

```javascript
    const handleApproveSubmit = async () => {
        // ตรวจสอบว่าเป็น v2 registration หรือไม่
        const isV2 = activeTab === 'v2-registrations';

        if (isV2) {
            await handleV2ApproveSubmit();
        } else {
            // ... existing v1 approve logic ...
        }
    };
```

---

## ✅ Checklist สำหรับการ Integration

- [ ] Import `registrationServiceV2` เข้าไปใน UserManagement.jsx
- [ ] เพิ่ม state variables สำหรับ v2 registrations
- [ ] เพิ่ม `loadV2Registrations()` และ `loadV2Statistics()`
- [ ] อัปเดต `useEffect` ให้โหลดข้อมูล v2
- [ ] เพิ่ม handlers: `handleV2ApproveClick()`, `handleV2ApproveSubmit()`, `handleV2RejectSubmit()`
- [ ] เพิ่ม Tab "V2 Registrations" ใน UI
- [ ] สร้าง V2 registrations table
- [ ] อัปเดต approve modal handler
- [ ] ทดสอบ approve/reject flow
- [ ] ทดสอบ email notifications

---

## 🎨 สีและ UI Guidelines

| Element | Color | Usage |
|---------|-------|-------|
| V2 Tab (active) | `indigo-500` | แตกต่างจาก V1 (rose-500) |
| Pending Badge | `yellow-100/yellow-800` | สถานะรอดำเนินการ |
| Approved Badge | `green-100/green-800` | อนุมัติแล้ว |
| Rejected Badge | `red-100/red-800` | ปฏิเสธแล้ว |
| Statistics Text | Matching badge colors | แสดง pending/approved/rejected |

---

## 🔍 Testing

### Test Case 1: Load V2 Registrations
```
1. เข้าสู่ User Management
2. Click tab "คำขอสมัครใช้งาน (V2)"
3. ✅ แสดงรายการ pending registrations จาก v2 API
4. ✅ แสดง statistics (pending/approved/rejected)
```

### Test Case 2: Approve Registration
```
1. Click [อนุมัติ] บน registration request
2. เลือก role (default: Member)
3. Click confirm
4. ✅ User ถูกสร้างใน v2_users table
5. ✅ Registration status → APPROVED
6. ✅ ส่ง welcome email ให้ user
7. ✅ รายการหายจาก pending list
```

### Test Case 3: Reject Registration
```
1. Click [ปฏิเสธ] บน registration request
2. ระบุเหตุผล
3. Click confirm
4. ✅ Registration status → REJECTED
5. ✅ ส่ง rejection email ให้ user
6. ✅ รายการหายจาก pending list
```

---

## 📝 Notes

- Modal เดิมที่ใช้สำหรับ v1 สามารถนำมาใช้กับ v2 ได้ โดยปรับ data mapping
- ใช้สีที่ต่างกันเพื่อแยก v1 และ v2 ให้ชัดเจน (rose vs indigo)
- v2 ใช้ role-based permission แทน scope-based ทำให้ approve modal เรียบง่ายกว่า
- Email notifications ถูกส่งจาก backend อัตโนมัติ

---

## 🚀 Next Steps

1. Run database migration: `011_create_v2_registration_requests.sql`
2. Update UserManagement.jsx ตามคู่มือนี้
3. Test registration flow end-to-end
4. Configure email templates
5. Deploy to production

