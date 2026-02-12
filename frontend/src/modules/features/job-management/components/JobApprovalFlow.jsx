import React from 'react';
import { CheckIcon, ClockIcon } from '@heroicons/react/24/outline';

/**
 * JobApprovalFlow Component
 * แสดง approval flow พร้อมสถานะ ใต้ JobBriefInfo
 *
 * @param {Object} job - The job object with flowSnapshot, currentLevel, approvals, and status
 */
const JobApprovalFlow = ({ job }) => {
  // Early return ถ้าไม่มีข้อมูล
  if (!job) return null;

  const { flowSnapshot, currentLevel, approvals = [], status } = job;

  // Auto-approve case (ไม่มี flow หรือ skip approval)
  if (!flowSnapshot || !flowSnapshot.levels || flowSnapshot.levels.length === 0) {
    return (
      <div className="bg-white px-4 py-5 sm:px-6 shadow sm:rounded-lg">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          เส้นทางการอนุมัติ (Approval Flow)
        </h3>
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-400 border-dashed">
          <p className="text-sm text-gray-500">ไม่ต้องผ่านการอนุมัติ</p>
          <p className="text-lg font-bold text-green-600 mt-1">✨ อนุมัติ(Auto)</p>
        </div>
      </div>
    );
  }

  // Check if all approvals completed
  const allApproved = currentLevel === 999 || status === 'approved';

  return (
    <div className="bg-white px-4 py-5 sm:px-6 shadow sm:rounded-lg">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        เส้นทางการอนุมัติ (Approval Flow)
      </h3>

      {/* Timeline */}
      <div className="relative pl-4 space-y-6">
        {/* Vertical line */}
        <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-gray-200"></div>

        {/* Map each level */}
        {flowSnapshot.levels.map((level, idx) => {
          const isPassed = currentLevel > level.level;
          const isCurrent = currentLevel === level.level;
          const approval = approvals.find(a => a.stepNumber === level.level);

          return (
            <div key={idx} className="relative flex items-start gap-4">
              {/* Status Dot */}
              <div
                className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ring-1 z-10
                  ${isPassed ? 'bg-green-500 ring-green-500' :       // ✅ ผ่านแล้ว
                    isCurrent ? 'bg-rose-500 ring-rose-500 animate-pulse' :  // 🔴 กำลังรอ
                    'bg-gray-200 ring-gray-300'}`}                   // ⚪ ยังไม่ถึง
              ></div>

              <div className="flex-1 min-w-0">
                {/* Level header */}
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  ลำดับที่ {level.level}: {level.role}
                </p>

                {/* Logic badge (ALL/ANY) */}
                {level.approvers?.length > 1 && (
                  <span
                    className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-bold ml-2
                      ${level.logic === 'all'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'}`}
                  >
                    {level.logic === 'all' ? 'ครบทุกคน (ALL)' : 'ใครก็ได้ (ANY)'}
                  </span>
                )}

                {/* Approvers list */}
                <div className="mt-2 space-y-1">
                  {level.approvers?.map((approver, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {approver.name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{approver.name}</p>
                      {approver.role && (
                        <span className="text-xs text-gray-500">({approver.role})</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status badge */}
                <div className="mt-2">
                  {isPassed && approval && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                      <CheckIcon className="w-3 h-3" />
                      อนุมัติ{level.level} ({approval.approver?.displayName || 'ผู้อนุมัติ'})
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium border border-rose-100 animate-pulse">
                      <ClockIcon className="w-3 h-3" />
                      รออนุมัติ{level.level} ({level.approvers?.map(a => a.name).join(', ')})
                    </span>
                  )}
                  {!isPassed && !isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium border border-gray-200">
                      รออนุมัติ{level.level} ({level.approvers?.map(a => a.name).join(', ')})
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* End Node - All Approved */}
        <div className="relative flex items-start gap-4">
          <div
            className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ring-1 z-10
              ${allApproved ? 'bg-green-600 ring-green-600' : 'bg-gray-200 ring-gray-300'}`}
          ></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              ปลายทาง
            </p>
            <p className="text-sm font-medium text-gray-900">
              {allApproved ? '✅ อนุมัติครบแล้ว' : 'เริ่มทำงาน'}
            </p>
            {flowSnapshot.defaultAssignee?.name && (
              <p className="text-xs text-gray-500 mt-1">
                ผู้รับผิดชอบ: {flowSnapshot.defaultAssignee.name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobApprovalFlow;
