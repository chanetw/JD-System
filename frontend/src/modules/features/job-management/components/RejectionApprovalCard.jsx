/**
 * Rejection Approval Card
 *
 * Card component for displaying pending rejection requests to Approvers.
 * Allows approvers to approve or deny the rejection request.
 */

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const RejectionApprovalCard = ({ rejectionRequest, onApprove, onDeny }) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);

  if (!rejectionRequest) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      await onApprove(rejectionRequest.id, comment.trim() || null);
    } catch (err) {
      setError(err.message || 'ไม่สามารถอนุมัติคำขอได้');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    if (!denyReason.trim()) {
      setError('กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ');
      return;
    }

    setIsDenying(true);
    setError(null);

    try {
      await onDeny(rejectionRequest.id, denyReason.trim());
      setShowDenyModal(false);
      setDenyReason('');
    } catch (err) {
      setError(err.message || 'ไม่สามารถปฏิเสธคำขอได้');
    } finally {
      setIsDenying(false);
    }
  };

  // Calculate time remaining for auto-close
  const getTimeRemaining = () => {
    if (!rejectionRequest.autoCloseAt) return null;

    const now = new Date();
    const closeAt = new Date(rejectionRequest.autoCloseAt);
    const diffMs = closeAt - now;

    if (diffMs <= 0) return 'หมดเวลาแล้ว';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `เหลือเวลา ${hours} ชม. ${minutes} นาที`;
    }
    return `เหลือเวลา ${minutes} นาที`;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <>
      <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                คำขอปฏิเสธงาน
              </h3>
              <p className="text-sm text-gray-600">
                จาก {rejectionRequest.requester?.name || 'Assignee'}
              </p>
            </div>
          </div>

          {/* Auto-close countdown */}
          {timeRemaining && (
            <div className="flex items-center space-x-2 rounded-md bg-orange-100 px-3 py-1">
              <ClockIcon className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">
                {timeRemaining}
              </span>
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">เหตุผล:</p>
          <div className="rounded-md bg-white p-3 border border-gray-200">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {rejectionRequest.reason}
            </p>
          </div>
        </div>

        {/* Auto-close warning */}
        {rejectionRequest.autoCloseEnabled && (
          <div className="mt-4 rounded-md bg-yellow-50 p-3 border border-yellow-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs text-yellow-700">
                  หากไม่ตอบกลับภายในเวลาที่กำหนด ระบบจะอนุมัติคำขอนี้อัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Optional comment */}
        <div className="mt-4">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            ความเห็นเพิ่มเติม (ถ้ามี)
          </label>
          <textarea
            id="comment"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isApproving || isDenying}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm disabled:bg-gray-50"
            placeholder="ระบุความเห็นเพิ่มเติม..."
          />
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving || isDenying}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isApproving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                กำลังอนุมัติ...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                อนุมัติคำขอปฏิเสธ
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowDenyModal(true)}
            disabled={isApproving || isDenying}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <XCircleIcon className="h-5 w-5 mr-2" />
            ไม่อนุมัติ (สั่งให้ทำงานต่อ)
          </button>
        </div>
      </div>

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
              onClick={() => !isDenying && setShowDenyModal(false)}
            />

            {/* Modal */}
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      ไม่อนุมัติคำขอปฏิเสธ
                    </h3>
                    <div className="mt-4">
                      <label htmlFor="denyReason" className="block text-sm font-medium text-gray-700 mb-2">
                        เหตุผลที่ไม่อนุมัติ <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="denyReason"
                        rows={3}
                        required
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                        disabled={isDenying}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm"
                        placeholder="ระบุเหตุผลที่ไม่อนุมัติคำขอนี้..."
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Assignee จะได้รับแจ้งเหตุผลนี้และต้องทำงานต่อ
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDeny}
                  disabled={isDenying || !denyReason.trim()}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isDenying ? 'กำลังส่ง...' : 'ยืนยันไม่อนุมัติ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDenyModal(false)}
                  disabled={isDenying}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RejectionApprovalCard;
