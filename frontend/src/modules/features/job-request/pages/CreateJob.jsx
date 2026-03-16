/**
 * @file CreateJob.jsx
 * @description หน้าจอสำหรับสร้างใบข่างงาน (Create Job Request)
 * 
 * Features:
 * 1. ฟอร์มกรอกรายละเอียดงาน (Subject, Project, JobType, Brief)
 * 2. คำนวณวันส่งงาน (Due Date) อัตโนมัติด้วย SLA Calculator
 * 3. บันทึกข้อมูลลงตาราง 'jobs'
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@shared/services/supabaseClient';
import httpClient from '@shared/services/httpClient';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { addWorkDays } from '@shared/utils/slaCalculator';
import { assignJobFromMatrix } from '@shared/services/modules/autoAssignService';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { retry } from '@shared/utils/retry';
import AcceptanceDatePicker from '../components/AcceptanceDatePicker';

/** FRONTEND_MODE: 'supabase' (default) | 'api_only' */
const FRONTEND_MODE = import.meta.env.VITE_FRONTEND_MODE || 'supabase';

// Holidays cache configuration
const HOLIDAYS_CACHE_KEY = 'dj_holidays_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load holidays from localStorage cache
 */
const loadHolidaysFromCache = () => {
    try {
        const cached = localStorage.getItem(HOLIDAYS_CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;

        if (isExpired) {
            localStorage.removeItem(HOLIDAYS_CACHE_KEY);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error loading holidays from cache:', error);
        return null;
    }
};

/**
 * Save holidays to localStorage cache
 */
const saveHolidaysToCache = (holidays) => {
    try {
        const cacheData = {
            data: holidays,
            timestamp: Date.now()
        };
        localStorage.setItem(HOLIDAYS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving holidays to cache:', error);
    }
};

const CreateJob = () => {
    const { user } = useAuthStoreV2();
    // --- State for Form Data ---
    const [formData, setFormData] = useState({
        subject: '',
        project_id: '',
        job_type_id: '',
        objective: '',
        description: '',
        headline: '',
        sub_headline: '',
        priority: 'normal',
        acceptanceDate: '' // เพิ่ม acceptance date
    });

    // --- State for Master Data & UI ---
    const [projects, setProjects] = useState([]);
    const [jobTypes, setJobTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [calculatedDueDate, setCalculatedDueDate] = useState(null);
    const [holidays, setHolidays] = useState([]); // เก็บวันหยุดสำหรับคำนวณ SLA

    // --- State for Job Type Items ---
    const [subItems, setSubItems] = useState([]); // Template items from DB
    const [itemValues, setItemValues] = useState({}); // User inputs { item_id: { quantity, note } }

    // --- Fetch Master Data on Mount ---
    useEffect(() => {
        // Only fetch if user is loaded to ensure roles are available
        if (user) {
            fetchMasterData();
        }
    }, [user]);

    /**
     * ดึงข้อมูล Master Data จาก Backend API
     */
    const fetchMasterData = async () => {
        try {
            setLoading(true);
            const { api } = await import('@shared/services/apiService'); // Dynamic import

            // Call Backend API via AdminService (Combined Data)
            // This returns all master data + availableScopes for the current user
            const data = await api.getMasterDataCombined();

            if (data) {
                // 🔍 DEBUG: Log full user object to understand its structure
                console.log('🔍 [CreateJob] User Object:', {
                    fullUser: user,
                    hasRoles: !!user?.roles,
                    hasRoleName: !!user?.roleName,
                    hasRole: !!user?.role,
                    rolesValue: user?.roles,
                    roleNameValue: user?.roleName,
                    roleValue: user?.role
                });

                // Check User Role (Admin can see all, others see only scoped projects)
                // ✅ FIX: Improved role normalization to match JobActionPanel.jsx
                const rawRoles = user?.roles || [];
                const userRoleName = user?.roleName || '';

                const normalizedRoles = (() => {
                    const roles = [];
                    if (userRoleName) roles.push(userRoleName.toLowerCase());

                    if (Array.isArray(rawRoles)) {
                        rawRoles.forEach(r => {
                            if (typeof r === 'string') roles.push(r.toLowerCase());
                            if (typeof r === 'object' && r !== null) {
                                roles.push((r?.roleName || r?.name || '').toLowerCase());
                            }
                        });
                    }
                    return roles.filter(Boolean);
                })();

                const isAdmin = normalizedRoles.some(r => ['admin', 'administrator'].includes(r));

                let visibleProjects = data.projects || [];

                // If not Admin, filter by available scopes
                if (!isAdmin) {
                    // Use availableScopes returned from backend specifically for this user
                    const scopedProjects = data.availableScopes?.projects || [];

                    if (scopedProjects.length > 0) {
                        visibleProjects = scopedProjects;
                    } else {
                        // User has no scoped projects assigned
                        // Fallback: Show empty list or check if user is unrestricted?
                        // For strict compliance: Show empty list (or maybe Public projects if any)
                        visibleProjects = [];
                        console.warn('User has no assigned project scopes');
                    }
                }

                console.log('🔍 [CreateJob] Debug Data:', {
                    userRoles: user?.roles,
                    normalizedRoles,
                    isAdmin,
                    scopedProjectsLength: data.availableScopes?.projects?.length,
                    allProjectsLength: data.projects?.length,
                    visibleProjectsLength: visibleProjects.length
                });

                setProjects(visibleProjects);
                setJobTypes(data.jobTypes || []);

                // Holidays logic
                const holidaysData = data.holidays || [];
                const holidayDates = holidaysData.map(h => h.date);
                setHolidays(holidayDates);
                saveHolidaysToCache(holidayDates);

                console.log('📅 Master Data Loaded:', {
                    totalProjects: data.projects?.length,
                    visibleProjects: visibleProjects.length,
                    jobTypes: data.jobTypes?.length,
                    holidays: holidayDates.length,
                    isAdmin
                });
            }
        } catch (error) {
            console.error('Error fetching master data:', error);
            alert('ไม่สามารถโหลดข้อมูลระบบได้: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Logic: คำนวณ SLA และดึง Sub Items เมื่อเลือก Job Type ---
    useEffect(() => {
        if (formData.job_type_id) {
            const selectedType = jobTypes.find(t => t.id === parseInt(formData.job_type_id));

            if (selectedType) {
                // 1. SLA Logic
                if (selectedType.sla) {
                    const dueDate = addWorkDays(new Date(), selectedType.sla, holidays);
                    setCalculatedDueDate(dueDate);
                } else {
                    setCalculatedDueDate(null);
                }

                // 2. Set Sub Items directly from Master Data (Nested items)
                const items = selectedType.items || [];
                // Sort items by sortOrder (if available) or id
                items.sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id));

                setSubItems(items);

                // Reset values for new items
                const initialValues = {};
                items.forEach(item => {
                    initialValues[item.id] = { quantity: 1, name: item.name };
                });
                setItemValues(initialValues);
            }
        } else {
            setCalculatedDueDate(null);
            setSubItems([]);
            setItemValues({});
        }
    }, [formData.job_type_id, jobTypes, holidays]);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle Sub Item Changes (Qty / Note)
    const handleItemChange = (itemId, field, value) => {
        setItemValues(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation เบื้องต้น
        if (!formData.subject || !formData.project_id || !formData.job_type_id) {
            alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (หัวข้องาน, โครงการ, ประเภทงาน)');
            return;
        }

        try {
            setSubmitting(true);

            // Validate user session
            if (!user) {
                alert('กรุณาเข้าสู่ระบบก่อนสร้างงาน');
                return;
            }

            // 1. Prepare job data
            const jobData = {
                tenant_id: user.tenant_id,
                project_id: parseInt(formData.project_id),
                job_type_id: parseInt(formData.job_type_id),
                subject: formData.subject,
                objective: formData.objective,
                description: formData.description,
                headline: formData.headline,
                sub_headline: formData.sub_headline,
                priority: formData.priority,
                status: 'pending_approval',
                requester_id: user.id,
                due_date: calculatedDueDate?.toISOString(),
                acceptanceDate: formData.acceptanceDate || null, // เพิ่ม acceptance date
            };

            // 2. Prepare items data
            const itemsData = subItems.map(item => ({
                job_type_item_id: item.id,
                name: item.name,
                quantity: itemValues[item.id]?.quantity || 1,
                status: 'pending'
            }));

            // 3. Call PostgreSQL function (Transaction) with retry logic
            console.log('🔄 Creating job with transaction...');
            const result = await retry(async () => {
                // === API_ONLY MODE: ใช้ Backend API ===
                if (FRONTEND_MODE === 'api_only') {
                    const response = await httpClient.post('/jobs', {
                        jobData,
                        itemsData
                    });
                    if (!response.data.success) throw new Error(response.data.message);
                    return response.data.data;
                }

                // === SUPABASE MODE (default) ===
                const { data, error } = await supabase.rpc('create_job_with_items', {
                    p_job_data: jobData,
                    p_items_data: itemsData
                });

                if (error) throw error;
                return data;
            }, {
                maxAttempts: 3,
                delayMs: 1000,
                onRetry: (attempt, error) => {
                    console.log(`🔄 Retry attempt ${attempt}:`, error.message);
                }
            });

            const jobId = result.id;
            const djId = result.dj_id;

            // 4. Auto-Assignment Logic
            console.log('🤖 Triggering Auto-Assignment...');
            const assignResult = await assignJobFromMatrix(
                jobId,
                jobData.project_id,
                jobData.job_type_id
            );

            // 5. Success message
            let successMessage = `✅ สร้างใบงานสำเร็จ! รหัสเอกสาร: ${djId || jobId}`;
            if (assignResult.success && assignResult.assigneeId) {
                successMessage += `\n👤 ระบบได้จ่ายงานให้ User #${assignResult.assigneeId} เรียบร้อยแล้ว`;
            } else {
                successMessage += `\n⚠️ ยังไม่ได้ระบุผู้รับผิดชอบ`;
            }

            alert(successMessage);

            // 6. Reset Form
            setFormData({
                subject: '', project_id: '', job_type_id: '',
                objective: '', description: '', headline: '', sub_headline: '', priority: 'normal'
            });
            setCalculatedDueDate(null);
            setSubItems([]);
            setItemValues({});

        } catch (error) {
            console.error('Error creating job:', error);
            alert('เกิดข้อผิดพลาดในการสร้างใบงาน: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-xl mt-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">📝 สร้างใบข่างงานออกแบบ (Create Job Request)</h2>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: ข้อมูลหลัก */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Job Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน <span className="text-red-500">*</span></label>
                        <select
                            name="job_type_id"
                            value={formData.job_type_id}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500"
                            required
                        >
                            <option value="">-- กรุณาเลือก --</option>
                            {jobTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name} (SLA: {type.sla} วัน)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Project */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">โครงการ <span className="text-red-500">*</span></label>
                        <select
                            name="project_id"
                            value={formData.project_id}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500"
                            required
                        >
                            <option value="">-- กรุณาเลือก --</option>
                            {projects.map(proj => (
                                <option key={proj.id} value={proj.id}>{proj.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Dynamic SLA Preview */}
                {calculatedDueDate && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded animate-pulse">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-700">
                                    <span className="font-bold">📅 กำหนดส่งงาน (SLA):</span> ระบบคำนวณวันส่งงานเป็นวันที่{' '}
                                    <span className="text-lg font-bold underline">
                                        {calculatedDueDate.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </p>
                                <p className="text-xs text-blue-500 mt-1">(คำนวณเฉพาะวันทำการ ไม่นับเสาร์-อาทิตย์ และวันหยุด)</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Acceptance Date Picker */}
                {formData.job_type_id && (
                    <AcceptanceDatePicker
                        jobType={jobTypes.find(t => t.id === parseInt(formData.job_type_id))}
                        selectedDate={formData.acceptanceDate}
                        onChange={(date) => {
                            setFormData(prev => ({ ...prev, acceptanceDate: date }));

                            // คำนวณ Due Date ใหม่จาก Acceptance Date
                            const selectedType = jobTypes.find(t => t.id === parseInt(formData.job_type_id));
                            if (selectedType && selectedType.sla && date) {
                                const dueDate = addWorkDays(new Date(date), selectedType.sla, holidays);
                                setCalculatedDueDate(dueDate);
                            }
                        }}
                        holidays={holidays}
                        disabled={submitting}
                    />
                )}

                {/* Section 2: รายละเอียดชิ้นงาน (Job Items) */}
                {subItems.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-400 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                            📦 ชิ้นงานที่ต้องทำ (Job Items)
                            <span className="ml-2 text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                                {subItems.length} รายการ
                            </span>
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            {subItems.map(item => (
                                <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-900">{item.name}</label>
                                        {item.default_size && <span className="text-xs text-gray-500">ขนาด: {item.default_size}</span>}
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-gray-500 mb-1">จำนวน</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={itemValues[item.id]?.quantity || 0}
                                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                            className="w-full p-1 border border-gray-300 rounded text-center"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 3: รายละเอียดเพิ่มเติม */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-700">รายละเอียดงาน</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้องาน (Subject) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder="Ex. ทำ Banner Facebook โปรโมชั่นเดือน 5"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                            <input
                                type="text"
                                name="headline"
                                value={formData.headline}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Headline</label>
                            <input
                                type="text"
                                name="sub_headline"
                                value={formData.sub_headline}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วัตถุประสงค์ (Objective)</label>
                        <textarea
                            name="objective"
                            value={formData.objective}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Ex. เพื่อกระตุ้นยอดขาย Presale..."
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดเพิ่มเติม (Description)</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => window.history.back()}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`px-8 py-2 rounded-md text-white font-semibold shadow-sm transition-all
              ${submitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-rose-600 hover:bg-rose-700 hover:shadow-md'}`}
                    >
                        {submitting ? '⏳ กำลังบันทึก...' : 'บันทึกใบงาน'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CreateJob;
