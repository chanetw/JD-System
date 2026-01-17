/**
 * @file index.js
 * @description ไฟล์ index สำหรับ export ข้อมูล Mock ทั้งหมด
 * ใช้สำหรับ import ข้อมูล Mock ในระหว่างพัฒนา Frontend
 * 
 * @example
 * import { users, jobs, notifications } from '@/mock-data';
 * 
 * @rule *** ข้อมูล Mock ทั้งหมดต้องเก็บในโฟลเดอร์ mock-data เท่านั้น ***
 */

// Users & Roles
export { default as usersData } from './users/users.json';

// Projects, BUDs & Tenants
export { default as projectsData } from './projects/projects.json';

// Design Jobs
export { default as jobsData } from './jobs/jobs.json';

// Admin: Job Types, Holidays, Approval Flows
export { default as adminData } from './admin/admin.json';

// Notifications
export { default as notificationsData } from './notifications/notifications.json';

// Approvals, Activities & Comments
export { default as approvalsData } from './approvals/approvals.json';

// Media Portal
export { default as mediaData } from './media/media.json';

/**
 * @description รวมข้อมูล Mock ทั้งหมดเป็น Object เดียว
 * สะดวกสำหรับการใช้งานใน API Mock
 */
export const allMockData = {
  users: () => import('./users/users.json'),
  projects: () => import('./projects/projects.json'),
  jobs: () => import('./jobs/jobs.json'),
  admin: () => import('./admin/admin.json'),
  notifications: () => import('./notifications/notifications.json'),
  approvals: () => import('./approvals/approvals.json'),
  media: () => import('./media/media.json')
};
