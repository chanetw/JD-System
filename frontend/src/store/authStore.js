/**
 * @file authStore.js
 * @description Zustand Store สำหรับจัดการ Authentication State
 * 
 * Senior Programmer Notes:
 * - Zustand = State Management Library ที่เบาและใช้ง่าย
 * - Store = ที่เก็บ state ที่ใช้ร่วมกันทั้งแอป
 * - ใช้ persist เพื่อเก็บ state ใน localStorage (จะยังอยู่หลัง refresh)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/apiService';

/**
 * @constant useAuthStore
 * @description Store สำหรับ Authentication
 * 
 * @property {Object|null} user - ข้อมูลผู้ใช้ที่ login อยู่
 * @property {boolean} isAuthenticated - สถานะ login
 * @property {boolean} isLoading - สถานะกำลังโหลด
 * 
 * @method login - เข้าสู่ระบบ
 * @method logout - ออกจากระบบ
 * @method switchRole - เปลี่ยนบทบาท (สำหรับ Demo)
 */
export const useAuthStore = create(
    // persist = middleware ที่เก็บ state ใน localStorage
    persist(
        // set = function ที่ใช้อัปเดต state
        // get = function ที่ใช้ดึง state ปัจจุบัน
        (set, get) => ({
            // ============================================
            // State - ข้อมูลใน Store
            // ============================================

            // ข้อมูลผู้ใช้ที่ login อยู่ (null = ยังไม่ login)
            user: null,

            // สถานะว่า login อยู่หรือไม่
            isAuthenticated: false,

            // สถานะกำลังโหลด (ใช้แสดง loading spinner)
            isLoading: false,

            // ข้อความ error (ถ้ามี)
            error: null,

            // ============================================
            // Actions - ฟังก์ชันที่ใช้เปลี่ยน State
            // ============================================

            /**
             * @method login
             * @description เข้าสู่ระบบด้วย email
             * 
             * @param {string} email - อีเมลของผู้ใช้
             */
            login: async (emailOrUser) => {
                // ตั้งสถานะ loading เป็น true
                set({ isLoading: true, error: null });

                try {
                    let user;

                    // ถ้าส่ง object มาโดยตรง (Mock Login)
                    if (typeof emailOrUser === 'object') {
                        user = emailOrUser;
                    } else {
                        // เรียก API เพื่อ login ด้วย email
                        user = await api.login(emailOrUser);
                    }

                    // ถ้าสำเร็จ ให้อัปเดต state
                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                    });

                    return user;
                } catch (error) {
                    // ถ้าเกิด error ให้เก็บ error message
                    set({
                        error: error.message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            /**
             * @method logout
             * @description ออกจากระบบ
             */
            logout: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            /**
             * @method switchRole
             * @description เปลี่ยนบทบาทผู้ใช้ (สำหรับ Demo)
             * 
             * @param {string} role - บทบาทใหม่ ('marketing', 'approver', 'assignee', 'admin')
             */
            switchRole: async (role) => {
                set({ isLoading: true });

                try {
                    // ดึงผู้ใช้ที่มี role ที่ต้องการ
                    const user = await api.getUserByRole(role);

                    if (user) {
                        set({
                            user,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                    }

                    return user;
                } catch (error) {
                    set({
                        error: error.message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            /**
             * @method clearError
             * @description ล้าง error message
             */
            clearError: () => {
                set({ error: null });
            },
        }),
        {
            // ชื่อ key ที่จะเก็บใน localStorage
            name: 'dj-auth-storage',
        }
    )
);

export default useAuthStore;
