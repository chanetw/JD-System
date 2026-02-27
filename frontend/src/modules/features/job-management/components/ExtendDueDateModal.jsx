/**
 * ExtendDueDateModal Component
 * 
 * Modal สำหรับ Assignee ขอ Extend งาน
 * - เลือกจำนวนวันที่ต้องการ extend
 * - ระบุเหตุผล (required)
 * - แสดง Due Date ใหม่
 * - เรียก API POST /api/jobs/:id/extend
 */

import React, { useState } from 'react';
import { api } from '@shared/services/apiService';
import httpClient from '@shared/services/httpClient';
import { formatDate, addWorkDays } from '@shared/utils/slaCalculator';

const ExtendDueDateModal = ({
    job,
    isOpen,
    onClose,
    onSuccess,
    holidays = []
}) => {
    const [extensionDays, setExtensionDays] = useState(1);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // คำนวณ Due Date ใหม่
    const calculateNewDueDate = () => {
        if (!job || !job.dueDate) return null;
        return addWorkDays(new Date(job.dueDate), extensionDays, holidays);
    };

    /**
     * Handle Submit
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!reason.trim()) {
            setError('กรุณาระบุเหตุผลการ extend');
            return;
        }

        if (extensionDays < 1 || extensionDays > 30) {
            setError('จำนวนวันต้องอยู่ระหว่าง 1-30 วัน');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const response = await httpClient.post(`/jobs/${job.id}/extend`, {
                extensionDays: parseInt(extensionDays),
                reason: reason.trim()
            });

            if (response.data.success) {
                // Success callback
                if (onSuccess) {
                    onSuccess(response.data.data);
                }

                // Close modal
                handleClose();
            } else {
                setError(response.data.message || 'ไม่สามารถ extend งานได้');
            }
        } catch (err) {
            console.error('Extend job error:', err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการ extend งาน');
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Handle Close
     */
    const handleClose = () => {
        setExtensionDays(1);
        setReason('');
        setError('');
        onClose();
    };

    if (!isOpen || !job) return null;

    const newDueDate = calculateNewDueDate();

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>🔄 ขอ Extend งาน</h3>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Job Info */}
                        <div className="job-info">
                            <div className="info-row">
                                <span className="label">งาน:</span>
                                <span className="value">{job.djId} - {job.subject}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Due Date ปัจจุบัน:</span>
                                <span className="value current-due">{formatDate(new Date(job.dueDate))}</span>
                            </div>
                            {job.extensionCount > 0 && (
                                <div className="info-row">
                                    <span className="label">Extend แล้ว:</span>
                                    <span className="value">{job.extensionCount} ครั้ง</span>
                                </div>
                            )}
                        </div>

                        {/* Extension Days */}
                        <div className="form-group">
                            <label className="form-label">
                                <span className="required">*</span> จำนวนวันที่ต้องการ Extend
                            </label>
                            <div className="days-input-wrapper">
                                <input
                                    type="number"
                                    className="form-control"
                                    min="1"
                                    max="30"
                                    value={extensionDays}
                                    onChange={(e) => setExtensionDays(e.target.value)}
                                    disabled={submitting}
                                    required
                                />
                                <span className="unit">วันทำการ</span>
                            </div>
                            <small className="form-text text-muted">
                                สูงสุด 30 วันทำการ
                            </small>
                        </div>

                        {/* New Due Date Preview */}
                        {newDueDate && (
                            <div className="new-due-preview">
                                <div className="preview-icon">📅</div>
                                <div className="preview-content">
                                    <div className="preview-label">Due Date ใหม่</div>
                                    <div className="preview-date">{formatDate(newDueDate)}</div>
                                </div>
                            </div>
                        )}

                        {/* Reason */}
                        <div className="form-group">
                            <label className="form-label">
                                <span className="required">*</span> เหตุผลการ Extend
                            </label>
                            <textarea
                                className="form-control"
                                rows="4"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น มีงานด่วนอื่นเข้ามา, รอข้อมูลจากลูกค้า, ขอบเขตงานเพิ่มขึ้น"
                                disabled={submitting}
                                required
                            />
                            <small className="form-text text-muted">
                                💡 เหตุผลจะถูกบันทึกใน Activity Log
                            </small>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="alert alert-danger">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'กำลังบันทึก...' : 'ยืนยัน Extend'}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #dee2e6;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          color: #6c757d;
        }

        .close-btn:hover {
          color: #000;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .job-info {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e9ecef;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-row .label {
          color: #6c757d;
          font-weight: 500;
        }

        .info-row .value {
          font-weight: 600;
        }

        .current-due {
          color: #dc3545;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .required {
          color: #dc3545;
          margin-right: 0.25rem;
        }

        .days-input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .days-input-wrapper input {
          flex: 1;
        }

        .unit {
          color: #6c757d;
          font-weight: 500;
        }

        .form-control {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-control:focus {
          outline: none;
          border-color: #80bdff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        .form-text {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.875rem;
        }

        .text-muted {
          color: #6c757d;
        }

        .new-due-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #e7f3ff;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .preview-icon {
          font-size: 2rem;
        }

        .preview-content {
          flex: 1;
        }

        .preview-label {
          font-size: 0.875rem;
          color: #6c757d;
          margin-bottom: 0.25rem;
        }

        .preview-date {
          font-size: 1.25rem;
          font-weight: 600;
          color: #007bff;
        }

        .alert {
          padding: 0.75rem 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .alert-danger {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #dee2e6;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }
      `}</style>
        </div>
    );
};

export default ExtendDueDateModal;
