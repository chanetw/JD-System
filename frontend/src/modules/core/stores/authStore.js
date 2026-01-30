/**
 * @file authStore.js
 * @description ส่วนจัดการสถานะการยืนยันตัวตน (Authentication State Store)
 * 
 * วัตถุประสงค์หลัก:
 * - จัดเก็บข้อมูลผู้ใช้ที่ลงชื่อเข้าใช้งาน (Logged-in User)
 * - จัดการสถานะการล็อคอินและการออกจากระบบ (Login/Logout)
 * - รองรับระบบสลับบทบาท (Role Switcher) สำหรับการทดสอบ
 * - ใช้ไลบรารี Zustand ในการจัดการ State พร้อมการบันทึกข้อมูลแบบถาวร (Persist) ใน localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@shared/services/apiService';
import { supabase, setSupabaseToken, clearSupabaseToken } from '@shared/services/supabaseClient';

/**
 * useAuthStore: คลังข้อมูลสำหรับการยืนยันตัวตน
 * 
 * @property {Object|null} user - ข้อมูลผู้ใช้ปัจจุบัน (null หากยังไม่ได้เข้าสู่ระบบ)
 * @property {Object|null} session - ข้อมูล session ปัจจุบัน
 * @property {boolean} isAuthenticated - ระบุว่าผู้ใช้ผ่านการตรวจสอบสิทธิ์แล้วหรือไม่
 * @property {boolean} isLoading - สถานะการรอผลการดำเนินการ (เช่น ระหว่างการล็อคอิน)
 * @property {string|null} error - ข้อความแสดงข้อผิดพลาดจากการดำเนินการ
 * 
 * @method initialize - ตรวจสอบ session ที่มีอยู่เมื่อเปิดแอพ
 * @method login - ดำเนินการเข้าสู่ระบบ
 * @method logout - ออกจากระบบและล้างข้อมูล
 * @method switchRole - สลับบทบาทผู้ใช้ (สำหรับการสาธิตเท่านั้น)
 * @method clearError - ล้างข้อความข้อผิดพลาด
 * @method setUser - ตั้งค่า user โดยตรง
 * @method setSession - ตั้งค่า session โดยตรง
 * @method refreshUser - โหลดข้อมูล user ใหม่จาก database
 */

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // ============================================
            // State - ข้อมูลใน Store
            // ============================================

            // ข้อมูลผู้ใช้ที่ login อยู่ (null = ยังไม่ login)
            user: null,

            // ข้อมูล session ปัจจุบัน
            session: null,

            // สถานะว่า login อยู่หรือไม่
            isAuthenticated: false,

            // สถานะกำลังโหลด (ใช้แสดง loading spinner)
            isLoading: false,

            // ข้อความ error (ถ้ามี)
            error: null,

            // ============================================
            // Actions - ฟังก์ชันที่ใช้เปลี่ยน State
            // ============================================

            initialize: async () => {
                console.log('[Auth] Initialize started');
                set({ isLoading: true });

                // Safety timeout
                setTimeout(() => {
                    if (get().isLoading) {
                        console.warn('[Auth] Timeout');
                        set({ isLoading: false });
                    }
                }, 5000);

                try {
                    // 1. ตรวจสอบว่ามี Token ใน localStorage หรือไม่
                    const token = localStorage.getItem('token');

                    if (!token) {
                        set({ user: null, session: null, isAuthenticated: false, isLoading: false });
                        return;
                    }

                    // 2. ดึงข้อมูลผู้ใช้จาก API Server ผ่าน endpoint /me
                    const { userService } = await import('@shared/services/modules/userService');
                    const response = await userService.getMe();

                    if (response.success && response.data) {
                        // Sync with Supabase Client (Critical for RLS)
                        setSupabaseToken(token); // <--- Inject Custom Header
                        await supabase.auth.setSession({
                            access_token: token,
                            refresh_token: token // Use access token as dummy refresh if needed, or null
                        });

                        // รูปแบบข้อมูลจาก /me ผ่านการ map roles มาเรียบร้อยแล้ว
                        set({
                            user: { ...response.data, token }, // Keep token in user object
                            isAuthenticated: true,
                            isLoading: false
                        });
                        console.log('[Auth] Initialized user:', response.data.email);
                    } else {
                        // ถ้า Token หมดอายุหรือ Session หาย
                        localStorage.removeItem('token');
                        await supabase.auth.signOut();
                        set({ user: null, session: null, isAuthenticated: false, isLoading: false });
                    }
                } catch (error) {
                    console.error('Auth initialization error:', error);
                    localStorage.removeItem('token');
                    set({
                        user: null,
                        session: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: error.message
                    });
                }
            },

            /**
             * @method setUser
             * @description ตั้งค่า user โดยตรง
             */
            setUser: (user) => set({
                user,
                isAuthenticated: !!user
            }),

            /**
             * @method setSession
             * @description ตั้งค่า session โดยตรง
             */
            setSession: (session) => set({ session }),

            /**
             * @method refreshUser
             * @description โหลดข้อมูล user ใหม่จาก database
             */
            refreshUser: async () => {
                const { user } = get();
                if (!user) return;

                try {
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (!error && data) {
                        set({ user: data });
                    }
                } catch (error) {
                    console.error('Error refreshing user:', error);
                }
            },

            /**
             * @method login
             * @description เข้าสู่ระบบด้วย email หรือข้อมูลผู้ใช้
             * 
             * @param {string|Object} emailOrUser - อีเมลของผู้ใช้ หรือ Object ข้อมูลผู้ใช้
             */
            login: async (emailOrUser) => {
                set({ isLoading: true, error: null });

                try {
                    let user;

                    if (typeof emailOrUser === 'object') {
                        // Check if it is a User Object (Mock) or Credentials (Real)
                        // User Object has 'id', Credentials has 'password'
                        if (emailOrUser.id && !emailOrUser.password) {
                            user = emailOrUser;
                        } else {
                            // Assume credentials object
                            user = await api.login(emailOrUser);
                        }
                    } else {
                        // Legacy string (email) support -> Assume Mock/Test login via API
                        user = await api.login(emailOrUser);
                    }

                    // บันทึก token แยกใน localStorage (สำหรับ API calls)
                    if (user?.token) {
                        localStorage.setItem('token', user.token);
                        // Sync Supabase Session
                        setSupabaseToken(user.token); // <--- Inject Custom Header
                        await supabase.auth.setSession({
                            access_token: user.token,
                            refresh_token: user.token
                        });
                    }

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                    });

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
             * @method logout
             * @description ออกจากระบบ
             */
            logout: async () => {
                // ลบ token จาก localStorage
                localStorage.removeItem('token');

                // ออกจากระบบใน Supabase
                await supabase.auth.signOut();
                clearSupabaseToken(); // <--- Clear Custom Header

                set({
                    user: null,
                    session: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            /**
             * @method switchRole
             * @description เปลี่ยนบทบาทผู้ใช้ (Admin Impersonation - Real Data)
             * 
             * @param {string} role - บทบาทใหม่ ('requester', 'approver', 'assignee', 'admin')
             * 
             * Security: ต้องเป็น Admin เท่านั้นถึงจะใช้ได้ (Backend จะตรวจสอบ)
             */
            switchRole: async (role) => {
                set({ isLoading: true, error: null });

                try {
                    // เรียก API impersonate เพื่อสลับไปเป็น User จริงตาม Role
                    const { userService } = await import('@shared/services/modules/userService');
                    const result = await userService.impersonate(role);

                    if (result.user && result.token) {
                        // บันทึก Token ใหม่
                        localStorage.setItem('token', result.token);
                        // Sync Supabase Session
                        setSupabaseToken(result.token); // <--- Inject Custom Header
                        await supabase.auth.setSession({
                            access_token: result.token,
                            refresh_token: result.token
                        });

                        // อัปเดต State
                        set({
                            user: {
                                ...result.user,
                                impersonatedBy: result.impersonatedBy,
                                isImpersonating: !!result.impersonatedBy,
                                token: result.token // Persist token in state too
                            },
                            isAuthenticated: true,
                            isLoading: false,
                        });

                        console.log(`[Auth] สลับเป็น ${result.user.displayName || result.user.email} (Role: ${role}) สำเร็จ`);
                        return result.user;
                    }

                    throw new Error('ไม่ได้รับข้อมูลผู้ใช้จาก API');
                } catch (error) {
                    console.error('[Auth] Switch role error:', error);
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
            partialize: (state) => ({
                user: state.user,
                session: state.session,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);

/**
 * Helper hook - สำหรับใช้งานง่ายใน components
 */
export const useAuth = () => {
    const user = useAuthStore((state) => state.user);
    const session = useAuthStore((state) => state.session);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);
    const error = useAuthStore((state) => state.error);
    const initialize = useAuthStore((state) => state.initialize);
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const switchRole = useAuthStore((state) => state.switchRole);
    const clearError = useAuthStore((state) => state.clearError);

    return {
        user,
        session,
        isAuthenticated,
        isLoading,
        error,
        initialize,
        login,
        logout,
        refreshUser,
        switchRole,
        clearError
    };
};

export default useAuthStore;
