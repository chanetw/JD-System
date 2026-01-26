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
import { addWorkDays } from '@/utils/slaCalculator';
import { assignJobFromMatrix } from '../../../../shared/services/modules/autoAssignService'; // Use relative path to avoid alias issues

const CreateJob = () => {
    // --- State for Form Data ---
    const [formData, setFormData] = useState({
        subject: '',
        project_id: '',
        job_type_id: '',
        objective: '',
        description: '',
        headline: '',
        sub_headline: '',
        priority: 'normal'
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
        fetchMasterData();
    }, []);

    /**
     * ดึงข้อมูล Master Data (Projects, JobTypes) และวันหยุด
     */
    const fetchMasterData = async () => {
        try {
            setLoading(true);

            // 1. ดึง Projects
            const { data: projData } = await supabase.from('projects').select('id, name').eq('is_active', true);
            setProjects(projData || []);

            // 2. ดึง Job Types
            const { data: typeData } = await supabase.from('job_types').select('id, name, sla_days').eq('is_active', true);
            setJobTypes(typeData || []);

            // 3. ดึง Holidays
            const mockHolidays = ['2026-05-01', '2026-05-04'];
            setHolidays(mockHolidays);

        } catch (error) {
            console.error('Error fetching master data:', error);
            alert('ไม่สามารถโหลดข้อมูลระบบได้ กรุณาลองใหม่');
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
                if (selectedType.sla_days) {
                    const dueDate = addWorkDays(new Date(), selectedType.sla_days, holidays);
                    setCalculatedDueDate(dueDate);
                } else {
                    setCalculatedDueDate(null);
                }

                // 2. Fetch Job Type Items (Sub-tasks template)
                fetchJobTypeItems(formData.job_type_id);
            }
        } else {
            setCalculatedDueDate(null);
            setSubItems([]);
            setItemValues({});
        }
    }, [formData.job_type_id, jobTypes, holidays]);

    /**
     * ดึงรายการงานย่อย (Job Type Items) ตามประเภทงาน
     */
    const fetchJobTypeItems = async (jobTypeId) => {
        try {
            const { data, error } = await supabase
                .from('job_type_items')
                .select('*')
                .eq('job_type_id', parseInt(jobTypeId))
                .order('id');

            if (error) throw error;
            setSubItems(data || []);

            // Reset values
            const initialValues = {};
            (data || []).forEach(item => {
                initialValues[item.id] = { quantity: 1, name: item.name }; // Default qty = 1
            });
            setItemValues(initialValues);

        } catch (error) {
            console.error('Error fetching job items:', error);
        }
    };

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

            // 1. Insert Job
            const payload = {
                tenant_id: 1,
                project_id: parseInt(formData.project_id),
                job_type_id: parseInt(formData.job_type_id),
                subject: formData.subject,
                objective: formData.objective,
                description: formData.description,
                headline: formData.headline,
                sub_headline: formData.sub_headline,
                priority: formData.priority,
                status: 'pending_approval',
                requester_id: 1,
                due_date: calculatedDueDate?.toISOString(),
            };

            const { data, error } = await supabase
                .from('jobs')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            const jobId = data.id;

            // 2. Insert Design Job Items (Transaction)
            if (subItems.length > 0) {
                const itemsPayload = subItems.map(item => ({
                    job_id: jobId,
                    job_type_item_id: item.id,
                    name: item.name, // Snapshot name
                    quantity: itemValues[item.id]?.quantity || 1,
                    status: 'pending'
                }));

                const { error: itemsError } = await supabase
                    .from('design_job_items')
                    .insert(itemsPayload);

                if (itemsError) console.error('Error saving items:', itemsError);
            }

            // --- Auto-Assignment Logic ---
            console.log('🤖 Triggering Auto-Assignment...');
            const assignResult = await assignJobFromMatrix(data.id, payload.project_id, payload.job_type_id);

            let successMessage = `✅ สร้างใบงานสำเร็จ! รหัสเอกสาร: ${data.dj_id || jobId}`;
            if (assignResult.success && assignResult.assigneeId) {
                successMessage += `\n👤 ระบบได้จ่ายงานให้ User #${assignResult.assigneeId} เรียบร้อยแล้ว`;
            } else {
                successMessage += `\n⚠️ ยังไม่ได้ระบุผู้รับผิดชอบ (Pending Assignment)`;
            }

            alert(successMessage);

            // Reset Form
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
                                    {type.name} (SLA: {type.sla_days} วัน)
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

                {/* Section 2: รายละเอียดชิ้นงาน (Job Items) */}
                {subItems.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
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
