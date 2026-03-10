/**
 * @file UserPerformanceCard.jsx
 * @description Card แสดงสรุปผลงานของ user (ใช้ใน Grid)
 */

import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * @component UserPerformanceCard
 * @description Card แสดงสรุปผลงานของ user คนหนึ่ง
 */
export default function UserPerformanceCard({ user, onClick }) {
  const getInitials = (name) => {
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOnTimeRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-blue-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getOnTimeRateBg = (rate) => {
    if (rate >= 90) return 'bg-green-50 border-green-200';
    if (rate >= 70) return 'bg-blue-50 border-blue-200';
    if (rate >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-orange-50 border-orange-200';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-rose-300 transition-all cursor-pointer group"
    >
      {/* Header - User Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
          {getInitials(user.userName)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-rose-600 transition-colors">
            {user.userName}
          </h3>
          <p className="text-xs text-gray-500 truncate">{user.userRole}</p>
        </div>
      </div>

      {/* Priority Metrics - On-Time Rate (#1) และ Completed (#2) */}
      <div className="space-y-3 mb-4">
        {/* On-Time Rate - Priority #1 - เน้นมาก */}
        <div className={`border-2 rounded-lg p-3 ${getOnTimeRateBg(user.onTimeRate)}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">อัตราส่งตรงเวลา</span>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div className={`text-2xl font-bold ${getOnTimeRateColor(user.onTimeRate)}`}>
            {user.onTimeRate}%
          </div>
        </div>

        {/* Completed Count - Priority #2 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">งานที่เสร็จ</span>
          </div>
          <span className="text-lg font-bold text-blue-900">{user.completedJobs}</span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-600">เวลาเฉลี่ย</span>
          </div>
          <div className="text-sm font-semibold text-gray-900">{user.avgTurnaroundDays} วัน</div>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-600">ดีเลย์</span>
          </div>
          <div className="text-sm font-semibold text-gray-900">{user.delayedJobs} งาน</div>
        </div>
      </div>

      {/* Hover indicator */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-center">
        <span className="text-xs text-gray-500 group-hover:text-rose-600 transition-colors">
          คลิกเพื่อดูรายละเอียด →
        </span>
      </div>
    </div>
  );
}
