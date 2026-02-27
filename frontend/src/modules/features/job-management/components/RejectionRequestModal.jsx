/**
 * Rejection Request Modal
 *
 * Modal for Assignee to request job rejection with reason.
 * Creates a rejection_request that requires Approver approval.
 */

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const RejectionRequestModal = ({ isOpen, onClose, job, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('กรุณาระบุเหตุผลในการขอปฏิเสธงาน');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(reason.trim());
      // Reset form
      setReason('');
      onClose();
    } catch (err) {
      setError(err.message || 'ไม่สามารถส่งคำขอได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">
                    ขอปฏิเสธงาน
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {job?.djId} - {job?.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="ml-3 text-gray-400 hover:text-gray-500 disabled:opacity-50"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 sm:p-6 sm:pt-0">
              {/* Warning Message */}
              <div className="mb-4 rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      คำขอปฏิเสธจะถูกส่งไปยัง Approver เพื่อพิจารณา
                    </p>
                    <p className="mt-1 text-xs text-yellow-600">
                      • หาก Approver อนุมัติ → งานจะถูกปฏิเสธ<br />
                      • หาก Approver ไม่อนุมัติ → คุณต้องทำงานต่อ<br />
                      • หาก Approver ไม่ตอบกลับภายใน 24 ชม. → ระบบอนุมัติอัตโนมัติ
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason Input */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  เหตุผลในการขอปฏิเสธงาน <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="ระบุเหตุผลที่ไม่สามารถดำเนินการงานนี้ได้..."
                />
                <p className="mt-2 text-xs text-gray-500">
                  💡 เคล็ดลับ: ระบุเหตุผลอย่างชัดเจนเพื่อช่วยให้ Approver ตัดสินใจได้เร็วขึ้น
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังส่งคำขอ...
                  </>
                ) : (
                  'ส่งคำขอปฏิเสธ'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RejectionRequestModal;
