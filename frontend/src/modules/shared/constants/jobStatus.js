/**
 * @file jobStatus.js
 * @description Centralized Job Status Constants
 * 
 * Single source of truth สำหรับ:
 * - Label ภาษาไทย (สถานะงาน + สถานะอนุมัติ)
 * - สีของแต่ละสถานะ (Tailwind classes)
 * - กลุ่มสถานะ
 * - Filter options สำหรับ dropdown
 * - Filter group map สำหรับรวมสถานะ
 */

// ========================================
// 1. Work Status Labels (สถานะงาน)
// ========================================
export const WORK_STATUS_LABEL = {
    draft: 'ฉบับร่าง',
    scheduled: 'ตั้งเวลาส่ง',
    submitted: 'ส่งแล้ว',
    pending_approval: 'รออนุมัติ',
    pending_level_1: 'รออนุมัติ',
    pending_level_2: 'รออนุมัติ L2',
    pending_level_3: 'รออนุมัติ L3',
    approved: 'อนุมัติแล้ว',
    assigned: 'ได้รับมอบหมาย',
    in_progress: 'กำลังดำเนินการ',
    pending_dependency: 'รอคิวก่อนหน้า',
    rework: 'แก้ไข/ตรวจสอบ',
    correction: 'แก้ไข/ตรวจสอบ',
    returned: 'แก้ไข/ตรวจสอบ',
    draft_review: 'รอตรวจ Draft',
    pending_rebrief: 'รอ Rebrief',
    rebrief_submitted: 'ส่ง Rebrief แล้ว',
    pending_rejection: 'รอพิจารณาปฏิเสธ',
    assignee_rejected: 'ถูกปฏิเสธ (รอพิจารณา)',
    completed: 'เสร็จสมบูรณ์',
    closed: 'เสร็จสมบูรณ์',
    rejected: 'ถูกปฏิเสธ',
    rejected_by_assignee: 'ถูกปฏิเสธ',
    cancelled: 'ยกเลิก',
    partially_completed: 'เสร็จบางส่วน',
};

// ========================================
// 2. Approval Status Labels (สถานะอนุมัติ)
// ========================================
export const APPROVAL_STATUS_LABEL = {
    draft: 'แบบร่าง',
    pending_approval: 'รออนุมัติ',
    pending_level_1: 'รออนุมัติ',
    pending_level_2: 'รออนุมัติ L2',
    pending_level_3: 'รออนุมัติ L3',
    approved: 'อนุมัติแล้ว',
    assigned: 'อนุมัติแล้ว',
    in_progress: 'อนุมัติแล้ว',
    completed: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ',
    rejected_by_assignee: 'อนุมัติแล้ว',
    cancelled: 'ยกเลิก',
};

// ========================================
// 3. Status Colors (Tailwind classes)
// ========================================
export const STATUS_COLOR = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-violet-100 text-violet-700',
    submitted: 'bg-blue-100 text-blue-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    pending_level_1: 'bg-amber-100 text-amber-700',
    pending_level_2: 'bg-orange-100 text-orange-700',
    pending_level_3: 'bg-orange-100 text-orange-700',
    pending_dependency: 'bg-purple-100 text-purple-700',
    assignee_rejected: 'bg-orange-100 text-orange-700',
    returned: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-amber-100 text-amber-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    rework: 'bg-yellow-100 text-yellow-700',
    correction: 'bg-orange-100 text-orange-700',
    draft_review: 'bg-purple-100 text-purple-700',
    pending_rebrief: 'bg-yellow-100 text-yellow-700',
    rebrief_submitted: 'bg-indigo-100 text-indigo-700',
    pending_rejection: 'bg-orange-100 text-orange-700',
    rejected: 'bg-red-100 text-red-700',
    rejected_by_assignee: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    closed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-200 text-gray-700',
    partially_completed: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    normal: 'bg-gray-100 text-gray-700',
    error: 'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
};

// ========================================
// 4. Approval Status Colors
// ========================================
export const APPROVAL_STATUS_COLOR = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    pending_level_1: 'bg-amber-100 text-amber-700',
    pending_level_2: 'bg-orange-100 text-orange-700',
    pending_level_3: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    assigned: 'bg-green-100 text-green-700',
    in_progress: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    rejected_by_assignee: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-200 text-gray-700',
};

// ========================================
// 5. Filter Options สำหรับ Dropdown
// ========================================

/**
 * Filter options สำหรับ DJ List — แสดงทุกสถานะที่เป็นไปได้
 * value = ค่าที่ใช้ filter, label = ข้อความแสดงใน dropdown
 */
export const DJ_LIST_FILTER_OPTIONS = [
    { value: 'draft', label: 'ฉบับร่าง' },
    { value: 'scheduled', label: 'ตั้งเวลาส่ง' },
    { value: 'pending_approval', label: 'รออนุมัติ' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'assigned', label: 'ได้รับมอบหมาย' },
    { value: 'in_progress', label: 'กำลังดำเนินการ' },
    { value: 'pending_dependency', label: 'รอคิวก่อนหน้า' },
    { value: 'rework', label: 'แก้ไข/ตรวจสอบ' },
    { value: 'draft_review', label: 'รอตรวจ Draft' },
    { value: 'pending_rebrief', label: 'รอ Rebrief' },
    { value: 'rebrief_submitted', label: 'ส่ง Rebrief แล้ว' },
    { value: 'pending_rejection', label: 'รอพิจารณาปฏิเสธ' },
    { value: 'completed', label: 'เสร็จสมบูรณ์' },
    { value: 'rejected', label: 'ถูกปฏิเสธ' },
    { value: 'cancelled', label: 'ยกเลิก' },
];

/**
 * Filter options สำหรับ Analytics — สรุปรวมกลุ่ม
 */
export const ANALYTICS_FILTER_OPTIONS = [
    { value: 'pending_approval', label: 'รออนุมัติ' },
    { value: 'in_progress', label: 'กำลังดำเนินการ' },
    { value: 'rework', label: 'แก้ไข/ตรวจสอบ' },
    { value: 'draft_review', label: 'รอตรวจ' },
    { value: 'completed', label: 'เสร็จสมบูรณ์' },
    { value: 'rejected', label: 'ถูกปฏิเสธ' },
];

// ========================================
// 6. Filter Group Map — รวมสถานะสำหรับ filter
// ========================================

/**
 * เมื่อเลือก filter key → ค้นหางานที่มี status อยู่ใน array
 * เช่น เลือก "แก้ไข/ตรวจสอบ" (rework) → filter ทั้ง correction, rework, returned
 */
export const FILTER_GROUP_MAP = {
    pending_approval: ['pending_approval', 'pending_level_1', 'pending_level_2', 'pending_level_3'],
    rework: ['correction', 'rework', 'returned'],
    draft_review: ['draft_review', 'pending_rebrief', 'rebrief_submitted'],
    completed: ['completed', 'closed'],
    rejected: ['rejected', 'rejected_by_assignee'],
};

// ========================================
// 7. Helper Functions
// ========================================

/**
 * ดึง label ภาษาไทยของสถานะงาน
 * @param {string} status - backend status key
 * @returns {string} label ภาษาไทย
 */
export const getWorkStatusLabel = (status) => {
    if (!status) return '-';
    return WORK_STATUS_LABEL[status] || String(status).replace(/_/g, ' ');
};

/**
 * ดึง label ภาษาไทยของสถานะอนุมัติ
 * @param {string} status - backend status key
 * @returns {string} label ภาษาไทย
 */
export const getApprovalStatusLabel = (status) => {
    if (!status) return '-';
    return APPROVAL_STATUS_LABEL[status] || String(status).replace(/_/g, ' ');
};

/**
 * ดึงสี Tailwind ของสถานะ
 * @param {string} status - backend status key
 * @param {boolean} isApproval - ใช้สีสถานะอนุมัติ
 * @returns {string} Tailwind class string
 */
export const getStatusColor = (status, isApproval = false) => {
    if (!status) return 'bg-gray-100 text-gray-500';
    if (isApproval) return APPROVAL_STATUS_COLOR[status] || 'bg-gray-100 text-gray-700';
    return STATUS_COLOR[status] || 'bg-gray-100 text-gray-700';
};

/**
 * Filter งานตามสถานะ โดยรองรับกลุ่มสถานะ
 * @param {string} jobStatus - สถานะของงาน
 * @param {string} filterValue - ค่าที่เลือกจาก filter dropdown
 * @returns {boolean} ตรงกับ filter หรือไม่
 */
export const matchesStatusFilter = (jobStatus, filterValue) => {
    if (!filterValue) return true;
    const group = FILTER_GROUP_MAP[filterValue];
    if (group) return group.includes(jobStatus);
    return jobStatus === filterValue;
};
