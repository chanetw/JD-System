/**
 * AcceptanceDatePicker Component
 * 
 * Component สำหรับเลือกวันรับงาน (Acceptance Date) พร้อม:
 * - แสดง SLA Suggestion
 * - คำนวณ Due Date อัตโนมัติ
 * - แสดงคำเตือนถ้าเลือกเกิน SLA
 * - รองรับ Sequential Child Jobs
 */

import React, { useState, useEffect } from 'react';
import { addWorkDays, formatDate } from '@shared/utils/slaCalculator';

const AcceptanceDatePicker = ({
    jobType,
    selectedDate,
    onChange,
    holidays = [],
    childJobs = [],
    disabled = false
}) => {
    const [suggestedDate, setSuggestedDate] = useState(null);
    const [calculatedDueDate, setCalculatedDueDate] = useState(null);
    const [warning, setWarning] = useState('');
    const [childTimeline, setChildTimeline] = useState([]);

    // คำนวณ Suggested Date และ Due Date
    useEffect(() => {
        if (!jobType || !jobType.slaWorkingDays) return;

        const today = new Date();
        const suggested = addWorkDays(today, 1, holidays); // แนะนำให้เริ่มพรุ่งนี้
        setSuggestedDate(suggested);

        // ถ้ามีการเลือกวันแล้ว คำนวณ Due Date
        if (selectedDate) {
            const dueDate = addWorkDays(new Date(selectedDate), jobType.slaWorkingDays, holidays);
            setCalculatedDueDate(dueDate);

            // ตรวจสอบว่าเลือกเกิน SLA หรือไม่
            const daysDiff = Math.ceil((new Date(selectedDate) - suggested) / (1000 * 60 * 60 * 24));
            if (daysDiff > 7) {
                setWarning(`⚠️ วันที่เลือกห่างจากวันนี้ ${daysDiff} วัน (มากกว่า 1 สัปดาห์)`);
            } else {
                setWarning('');
            }

            // คำนวณ Timeline สำหรับ Child Jobs
            if (childJobs && childJobs.length > 0) {
                calculateChildTimeline(new Date(selectedDate));
            }
        }
    }, [jobType, selectedDate, holidays, childJobs]);

    /**
     * คำนวณ Timeline สำหรับ Child Jobs (Sequential)
     */
    const calculateChildTimeline = (startDate) => {
        let currentStart = startDate;
        const timeline = [];

        for (const child of childJobs) {
            const dueDate = addWorkDays(currentStart, child.slaWorkingDays, holidays);

            timeline.push({
                name: child.name,
                startDate: currentStart,
                dueDate: dueDate,
                slaDays: child.slaWorkingDays
            });

            // งานถัดไปเริ่มหลังจากงานนี้เสร็จ
            currentStart = dueDate;
        }

        setChildTimeline(timeline);
    };

    /**
     * Handle Date Change
     */
    const handleDateChange = (e) => {
        const newDate = e.target.value;
        onChange(newDate);
    };

    /**
     * ใช้วันที่แนะนำ
     */
    const useSuggestedDate = () => {
        if (suggestedDate) {
            onChange(suggestedDate.toISOString().split('T')[0]);
        }
    };

    return (
        <div className="acceptance-date-picker">
            <div className="form-group">
                <label className="form-label">
                    <span className="required">*</span> วันที่ต้องการเริ่มงาน (Acceptance Date)
                </label>

                {/* Date Input */}
                <div className="date-input-wrapper">
                    <input
                        type="date"
                        className="form-control"
                        value={selectedDate || ''}
                        onChange={handleDateChange}
                        disabled={disabled}
                        min={new Date().toISOString().split('T')[0]}
                    />

                    {suggestedDate && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={useSuggestedDate}
                            disabled={disabled}
                        >
                            ใช้วันที่แนะนำ ({formatDate(suggestedDate)})
                        </button>
                    )}
                </div>

                {/* SLA Preview */}
                {selectedDate && calculatedDueDate && (
                    <div className="sla-preview">
                        <div className="preview-card">
                            <div className="preview-header">
                                <span className="icon">📅</span>
                                <span className="title">SLA Preview</span>
                            </div>
                            <div className="preview-body">
                                <div className="preview-row">
                                    <span className="label">วันเริ่มงาน:</span>
                                    <span className="value">{formatDate(new Date(selectedDate))}</span>
                                </div>
                                <div className="preview-row">
                                    <span className="label">SLA:</span>
                                    <span className="value">{jobType.slaWorkingDays} วันทำการ</span>
                                </div>
                                <div className="preview-row highlight">
                                    <span className="label">วันส่งงาน (Due Date):</span>
                                    <span className="value">{formatDate(calculatedDueDate)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        {warning && (
                            <div className="alert alert-warning">
                                {warning}
                            </div>
                        )}

                        {/* Child Jobs Timeline */}
                        {childTimeline.length > 0 && (
                            <div className="child-timeline">
                                <h4>📊 Timeline งานต่อเนื่อง</h4>
                                <div className="timeline-list">
                                    {childTimeline.map((item, index) => (
                                        <div key={index} className="timeline-item">
                                            <div className="timeline-marker">{index + 1}</div>
                                            <div className="timeline-content">
                                                <div className="timeline-title">{item.name}</div>
                                                <div className="timeline-dates">
                                                    <span>เริ่ม: {formatDate(item.startDate)}</span>
                                                    <span className="separator">→</span>
                                                    <span>ส่ง: {formatDate(item.dueDate)}</span>
                                                    <span className="sla-badge">({item.slaDays} วัน)</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="timeline-summary">
                                    <strong>รวมทั้งหมด:</strong> {childTimeline.reduce((sum, item) => sum + item.slaDays, 0)} วันทำการ
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Help Text */}
                <small className="form-text text-muted">
                    💡 ระบบจะคำนวณวันส่งงานอัตโนมัติจาก SLA ของประเภทงาน
                </small>
            </div>

            <style jsx>{`
        .acceptance-date-picker {
          margin-bottom: 1.5rem;
        }

        .date-input-wrapper {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .date-input-wrapper input {
          flex: 1;
        }

        .sla-preview {
          margin-top: 1rem;
        }

        .preview-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.5rem;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
        }

        .preview-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e9ecef;
        }

        .preview-row:last-child {
          border-bottom: none;
        }

        .preview-row.highlight {
          background: #e7f3ff;
          margin: 0 -1rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
        }

        .preview-row .label {
          color: #6c757d;
        }

        .preview-row .value {
          font-weight: 600;
        }

        .alert {
          padding: 0.75rem;
          border-radius: 4px;
          margin-top: 0.5rem;
        }

        .alert-warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
        }

        .child-timeline {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .child-timeline h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .timeline-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .timeline-marker {
          width: 32px;
          height: 32px;
          background: #007bff;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .timeline-dates {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          font-size: 0.875rem;
          color: #6c757d;
        }

        .separator {
          color: #007bff;
        }

        .sla-badge {
          background: #e7f3ff;
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
        }

        .timeline-summary {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid #dee2e6;
          text-align: right;
        }
      `}</style>
        </div>
    );
};

export default AcceptanceDatePicker;
