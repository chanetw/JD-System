import React, { useState } from 'react';
import Button from '@shared/components/Button';
import Swal from 'sweetalert2';
import httpClient from '@shared/services/httpClient';

/**
 * DraftSubmitModal - Modal สำหรับส่ง Draft ให้ตรวจสอบ
 * ใช้ร่วมกันได้ทั้งใน JobDetail และ Dashboard (My Queue)
 */
const DraftSubmitModal = ({ isOpen, onClose, job, onSuccess }) => {
    const [draftLink, setDraftLink] = useState('');
    const [draftNote, setDraftNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            await httpClient.post(`/jobs/${job.id}/submit-draft`, {
                link: draftLink.trim() || undefined,
                note: draftNote.trim() || undefined
            });

            await Swal.fire({
                icon: 'success',
                title: 'ส่ง Draft สำเร็จ!',
                text: 'ระบบได้แจ้งเตือนไปยัง Requester และ Approver เรียบร้อยแล้ว',
                confirmButtonColor: '#e11d48'
            });

            // Reset form
            setDraftLink('');
            setDraftNote('');
            onClose();
            
            // Callback to parent to reload data
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            await Swal.fire({
                icon: 'error',
                title: 'ส่ง Draft ไม่สำเร็จ',
                text: err.response?.data?.message || err.message,
                confirmButtonColor: '#e11d48'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setDraftLink('');
            setDraftNote('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4 text-blue-600">📝 ส่ง Draft ให้ตรวจ</h3>
                <p className="text-sm text-gray-600 mb-4">
                    ส่ง draft ให้ Requester และ Approver ตรวจสอบก่อนส่งงานจริง
                </p>
                <label className="block mb-2 text-sm font-medium">ลิงก์ Draft (ไม่บังคับ)</label>
                <input
                    type="text"
                    className="w-full border rounded p-2 mb-4"
                    value={draftLink}
                    onChange={e => setDraftLink(e.target.value)}
                    placeholder="https://..."
                    disabled={isSubmitting}
                />
                <label className="block mb-2 text-sm font-medium">หมายเหตุ (ไม่บังคับ)</label>
                <textarea
                    className="w-full border rounded p-2 mb-4"
                    rows={3}
                    value={draftNote}
                    onChange={e => setDraftNote(e.target.value)}
                    placeholder="เช่น กรุณาตรวจสอบ concept และสี..."
                    disabled={isSubmitting}
                />
                <div className="flex gap-2 justify-end">
                    <Button 
                        variant="ghost" 
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        ยกเลิก
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'กำลังส่ง...' : 'ส่ง Draft'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DraftSubmitModal;
