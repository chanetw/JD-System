/**
 * @file UserDetailSidePanel.jsx
 * @description Popup Modal แสดงรายละเอียดผลงานรายบุคคล
 */

import { useEffect } from 'react';
import { useUserPerformance } from '../hooks/useUserPerformance';
import { X, Download, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * @component UserDetailSidePanel
 * @description Popup Modal แสดงรายละเอียดผลงานของ user คนหนึ่ง
 */
export default function UserDetailSidePanel({ userId, isOpen, onClose, startDate = null, endDate = null }) {
  const { data, isLoading, error } = useUserPerformance(userId, startDate, endDate);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Popup Modal - Centered */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[100vh] overflow-hidden pointer-events-auto transform transition-all duration-300 ease-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">รายงานผลงานรายบุคคล</h2>
            {data && (
              <p className="text-sm text-gray-600 mt-1">
                {data.userName} • {data.userRole}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
                <p className="mt-3 text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {data && !isLoading && !data.summary && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-sm">
              ไม่พบข้อมูลสรุปผลงาน (summary data missing)
            </div>
          )}

          {data && !isLoading && data.summary && (
            <>
              {/* KPI Cards - เน้น On-Time Rate และ Completed */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {/* On-Time Rate - Priority #1 */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">อัตราส่งตรงเวลา</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-900">{data.summary.onTimeRate}%</div>
                  <div className="text-xs text-green-600 mt-1">
                    {data.summary.onTimeJobs} / {data.summary.completedJobs} งาน
                  </div>
                </div>

                {/* Completed Count - Priority #2 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">งานที่เสร็จ</span>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-900">{data.summary.completedJobs}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    จากทั้งหมด {data.summary.totalJobs} งาน
                  </div>
                </div>

                {/* Avg Turnaround */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">เวลาเฉลี่ย</span>
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{data.summary.avgTurnaroundDays}</div>
                  <div className="text-xs text-gray-500 mt-1">วัน/งาน</div>
                </div>

                {/* Delayed Jobs */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">งานดีเลย์</span>
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{data.summary.delayedJobs}</div>
                  <div className="text-xs text-gray-500 mt-1">งาน</div>
                </div>
              </div>

              {/* Monthly Trend Chart - Compact */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">แนวโน้มรายเดือน</h3>
                <div className="space-y-1.5">
                  {data.monthlyTrend.map((month, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-12">{month.month}</span>
                      <div className="flex-1 flex gap-1">
                        <div 
                          className="bg-green-500 h-6 rounded flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${month.onTime > 0 ? (month.onTime / (month.completed || 1)) * 100 : 0}%`, minWidth: month.onTime > 0 ? '24px' : '0' }}
                        >
                          {month.onTime > 0 && month.onTime}
                        </div>
                        <div 
                          className="bg-orange-500 h-6 rounded flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${month.delayed > 0 ? (month.delayed / (month.completed || 1)) * 100 : 0}%`, minWidth: month.delayed > 0 ? '24px' : '0' }}
                        >
                          {month.delayed > 0 && month.delayed}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">{month.completed} งาน</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600">ตรงเวลา</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-gray-600">ดีเลย์</span>
                  </div>
                </div>
              </div>

              {/* Delayed Jobs Table */}
              {data.delayedJobs.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">งานที่ดีเลย์</h3>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                      {data.delayedJobs.length} งาน
                    </span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.delayedJobs.map((job) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{job.djId}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-1">{job.subject}</div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-sm font-bold text-orange-600">+{job.daysLate} วัน</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(job.completedAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Jobs */}
              {data.recentJobs.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">งานล่าสุด</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {data.recentJobs.map((job) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{job.djId}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-1">{job.subject}</div>
                          </div>
                          <div className="text-right ml-3">
                            <StatusBadge status={job.status} />
                            {job.isOnTime !== null && job.status === 'completed' && (
                              <div className={`text-xs mt-1 ${job.isOnTime ? 'text-green-600' : 'text-orange-600'}`}>
                                {job.isOnTime ? '✓ ตรงเวลา' : '⚠ ดีเลย์'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Export Buttons */}
        {data && !isLoading && data.summary && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={() => exportToPDF(data)}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() => exportToExcel(data)}
              className="px-5 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// Helper: Status Badge
function StatusBadge({ status }) {
  const statusConfig = {
    completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700' },
    in_progress: { label: 'กำลังทำ', color: 'bg-blue-100 text-blue-700' },
    pending: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700' },
    pending_approval: { label: 'รออนุมัติ', color: 'bg-purple-100 text-purple-700' },
    rejected: { label: 'ปฏิเสธ', color: 'bg-red-100 text-red-700' }
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// Export functions (placeholder - will implement in Step 6)
function exportToPDF(data) {
  console.log('[Export] PDF export not yet implemented', data);
  alert('Export PDF feature coming soon!');
}

function exportToExcel(data) {
  console.log('[Export] Excel export not yet implemented', data);
  alert('Export Excel feature coming soon!');
}
