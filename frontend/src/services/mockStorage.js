/**
 * @file mockStorage.js
 * @description ฟังก์ชันจัดการ localStorage สำหรับเก็บข้อมูล Mock
 * ใช้เป็น Temporary Storage ในระหว่าง Demo
 * 
 * Senior Programmer Notes:
 * - ใช้ localStorage เก็บข้อมูลบน Browser (จะหายเมื่อล้าง Browser Data)
 * - มี Prefix "dj_system_" เพื่อแยกข้อมูลจากเว็บอื่น
 * - สามารถ Reset กลับเป็น Mock เริ่มต้นได้
 */

// ============================================
// Constants - ค่าคงที่
// ============================================

// Prefix สำหรับ localStorage keys
// (ใช้แยกข้อมูลของระบบ DJ จากข้อมูลอื่นๆ)
const STORAGE_PREFIX = 'dj_system_';

// ============================================
// Import Mock Data - นำเข้าข้อมูล Mock
// ============================================

// นำเข้าข้อมูล Mock จากโฟลเดอร์ mock-data
// (ข้อมูลเริ่มต้นที่จะใช้เมื่อยังไม่มีข้อมูลใน localStorage)
import usersData from '@mock-data/users/users.json';
import projectsData from '@mock-data/projects/projects.json';
import jobsData from '@mock-data/jobs/jobs.json';
import adminData from '@mock-data/admin/admin.json';
import notificationsData from '@mock-data/notifications/notifications.json';
import approvalsData from '@mock-data/approvals/approvals.json';
import mediaData from '@mock-data/media/media.json';

// ============================================
// รวม Mock Data ทั้งหมดไว้ในที่เดียว
// ============================================

/**
 * @constant MOCK_DATA_MAP
 * @description Map ของ key ไปยังข้อมูล Mock เริ่มต้น
 */
const MOCK_DATA_MAP = {
    users: usersData.users,
    roles: usersData.roles,
    tenants: projectsData.tenants,
    buds: projectsData.buds,
    projects: projectsData.projects,
    jobs: jobsData.designJobs,
    jobTypes: adminData.jobTypes,
    holidays: adminData.holidays,
    approvalFlows: adminData.approvalFlows,
    approvals: approvalsData.approvals,
    activities: approvalsData.activities,
    comments: approvalsData.comments,
    notifications: notificationsData.notifications,
    mediaFiles: mediaData.mediaFiles,
    portalStats: mediaData.portalStats,
};

// ============================================
// Functions - ฟังก์ชันหลัก
// ============================================

/**
 * @function loadMockData
 * @description โหลดข้อมูลจาก localStorage หรือถ้าไม่มีให้ใช้ Mock เริ่มต้น
 * 
 * @param {string} key - ชื่อข้อมูลที่ต้องการโหลด (เช่น 'users', 'jobs')
 * @returns {Array|Object} - ข้อมูลที่โหลดได้
 * 
 * @example
 * // โหลดรายการงานทั้งหมด
 * const jobs = loadMockData('jobs');
 */
export const loadMockData = (key) => {
    // สร้าง key เต็มสำหรับ localStorage
    // (เช่น 'dj_system_jobs')
    const storageKey = STORAGE_PREFIX + key;

    // ดึงข้อมูลจาก localStorage
    const stored = localStorage.getItem(storageKey);

    // ถ้ามีข้อมูลใน localStorage ให้ใช้ข้อมูลนั้น
    // (JSON.parse = แปลงจาก string เป็น Object/Array)
    if (stored) {
        return JSON.parse(stored);
    }

    // ถ้าไม่มีใน localStorage ให้ใช้ข้อมูล Mock เริ่มต้น
    // และบันทึกลง localStorage ด้วย
    const mockData = MOCK_DATA_MAP[key] || [];
    saveMockData(key, mockData);

    return mockData;
};

/**
 * @function saveMockData
 * @description บันทึกข้อมูลลง localStorage
 * 
 * @param {string} key - ชื่อข้อมูล
 * @param {Array|Object} data - ข้อมูลที่ต้องการบันทึก
 * 
 * @example
 * // บันทึกรายการงานใหม่
 * saveMockData('jobs', updatedJobs);
 */
export const saveMockData = (key, data) => {
    const storageKey = STORAGE_PREFIX + key;
    // JSON.stringify = แปลงจาก Object/Array เป็น string
    // (localStorage เก็บได้เฉพาะ string)
    localStorage.setItem(storageKey, JSON.stringify(data));
};

/**
 * @function resetMockData
 * @description ล้างข้อมูลทั้งหมดและโหลด Mock เริ่มต้นใหม่
 * ใช้เมื่อต้องการ Reset Demo
 * 
 * @example
 * // Reset Demo กลับเป็นข้อมูลเริ่มต้น
 * resetMockData();
 */
export const resetMockData = () => {
    // ดึง keys ทั้งหมดใน localStorage
    // แล้วกรองเฉพาะที่ขึ้นต้นด้วย prefix ของเรา
    Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .forEach(key => localStorage.removeItem(key));

    // โหลด Mock Data ใหม่ทั้งหมด
    Object.keys(MOCK_DATA_MAP).forEach(key => {
        saveMockData(key, MOCK_DATA_MAP[key]);
    });

    console.log('✅ Reset Mock Data สำเร็จ');
};

/**
 * @function initMockData
 * @description เริ่มต้นโหลด Mock Data ทั้งหมด (เรียกครั้งแรกเมื่อเปิดแอป)
 */
export const initMockData = () => {
    Object.keys(MOCK_DATA_MAP).forEach(key => {
        loadMockData(key);
    });
    console.log('✅ Init Mock Data สำเร็จ');
};
