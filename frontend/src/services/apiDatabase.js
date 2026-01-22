
/**
 * @file apiDatabase.js
 * @description Real Database API Service integrating with Supabase.
 * REFACTORED: Now acts as a facade aggregating specific service modules.
 */

import { userService } from './modules/userService';
import { adminService } from './modules/adminService';
import { jobService } from './modules/jobService';
import { reportService } from './modules/reportService';
import { notificationService } from './modules/notificationService';

const apiDatabase = {
    // --- Initialization ---
    init: async () => {
        console.log("Database Service Initialized (Modular Architecture)");
    },

    // --- User & Auth Services ---
    ...userService,

    // --- Admin & Master Data Services ---
    ...adminService,

    // --- Job Transaction Services ---
    ...jobService,

    // --- Report & Analytics Services ---
    ...reportService,

    // --- Notification Services ---
    ...notificationService
};

export default apiDatabase;
