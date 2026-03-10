/**
 * @file DraftReadStatus.jsx
 * @description Component แสดงสถานะการอ่าน Draft Submission โดย Requester
 * 
 * Features:
 * - แสดงว่า Requester อ่าน Draft แล้วหรือยัง
 * - แสดงเวลาที่อ่าน
 * - แสดง IP Address (สำหรับ Admin/Assignee)
 */

import React, { useState, useEffect } from 'react';
import { draftReadLogService } from '@shared/services/modules/draftReadLogService';
import { formatDateToThai } from '@shared/utils/dateUtils';
import { CheckCircleIcon, ClockIcon, EyeIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

export default function DraftReadStatus({ jobId, isRequester, showDetails = false }) {
  const [readStatus, setReadStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    
    loadReadStatus();
  }, [jobId]);

  const loadReadStatus = async () => {
    try {
      setLoading(true);
      const result = await draftReadLogService.checkReadStatus(jobId);
      
      if (result.success) {
        setReadStatus(result.data);
      }
    } catch (error) {
      console.error('[DraftReadStatus] Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <ClockIcon className="w-4 h-4 animate-spin" />
        <span>กำลังตรวจสอบ...</span>
      </div>
    );
  }

  if (!readStatus) return null;

  const { hasRead, readAt, ipAddress } = readStatus;

  // สำหรับ Requester - แสดงแค่สถานะว่าอ่านแล้ว
  if (isRequester) {
    return (
      <div className={`flex items-center gap-2 text-sm ${hasRead ? 'text-green-600' : 'text-orange-600'}`}>
        {hasRead ? (
          <>
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">คุณได้อ่าน Draft แล้ว</span>
            {readAt && (
              <span className="text-gray-500 text-xs">
                ({formatDateToThai(readAt, true)})
              </span>
            )}
          </>
        ) : (
          <>
            <EyeIcon className="w-5 h-5" />
            <span className="font-medium">คุณยังไม่ได้อ่าน Draft</span>
          </>
        )}
      </div>
    );
  }

  // สำหรับ Admin/Assignee - แสดงรายละเอียดเพิ่มเติม
  if (showDetails) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          {hasRead ? (
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <EyeIcon className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1">
            <div className={`font-medium ${hasRead ? 'text-green-700' : 'text-orange-700'}`}>
              {hasRead ? '✅ Requester อ่าน Draft แล้ว' : '⏳ Requester ยังไม่ได้อ่าน Draft'}
            </div>
            
            {hasRead && readAt && (
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  <span>อ่านเมื่อ: {formatDateToThai(readAt, true)}</span>
                </div>
                
                {ipAddress && (
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4" />
                    <span>IP Address: {ipAddress}</span>
                  </div>
                )}
              </div>
            )}

            {!hasRead && (
              <p className="mt-1 text-sm text-gray-500">
                ระบบจะบันทึกอัตโนมัติเมื่อ Requester เปิดดูหน้างานนี้
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // แสดงแบบสั้น (สำหรับ Badge หรือ Inline)
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      hasRead 
        ? 'bg-green-100 text-green-700' 
        : 'bg-orange-100 text-orange-700'
    }`}>
      {hasRead ? (
        <>
          <CheckCircleIcon className="w-3.5 h-3.5" />
          <span>อ่านแล้ว</span>
        </>
      ) : (
        <>
          <EyeIcon className="w-3.5 h-3.5" />
          <span>ยังไม่อ่าน</span>
        </>
      )}
    </div>
  );
}
