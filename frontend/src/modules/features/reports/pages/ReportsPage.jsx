/**
 * @file ReportsPage.jsx
 * @description หน้ารายงานผลงานรายบุคคล - แสดง Cards Grid ของทีม
 */

import { useState, useMemo } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { useTeamComparison } from '../hooks/useUserPerformance';
import UserPerformanceCard from '../components/UserPerformanceCard';
import UserDetailSidePanel from '../components/UserDetailSidePanel';
import { Search, Filter, SortAsc, Calendar } from 'lucide-react';
import { isAdmin as checkIsAdmin } from '@shared/utils/permission.utils';

/**
 * @component ReportsPage
 * @description หน้าหลักแสดงรายงานผลงานรายบุคคล
 */
export default function ReportsPage() {
  const { user } = useAuthStoreV2();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('onTimeRate'); // default: On-Time Rate
  const [dateRange, setDateRange] = useState('this_month');

  // คำนวณ date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (dateRange) {
      case 'this_week':
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        end = new Date();
        break;
      case 'last_7_days':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        end = new Date();
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_30_days':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        end = new Date();
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [dateRange]);

  // ดึงข้อมูลทีม
  const { data, isLoading, error } = useTeamComparison(startDate, endDate);

  // ตรวจสอบสิทธิ์
  const isAdmin = checkIsAdmin(user);

  // Filter และ Sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!data?.users) return [];

    let users = [...data.users];

    // Permission: ถ้าไม่ใช่ Admin ให้เห็นแค่ตัวเอง
    if (!isAdmin) {
      users = users.filter(u => u.userId === user?.userId);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(u => 
        u.userName.toLowerCase().includes(query) ||
        u.userEmail.toLowerCase().includes(query)
      );
    }

    // Sort
    users.sort((a, b) => {
      switch (sortBy) {
        case 'onTimeRate':
          return b.onTimeRate - a.onTimeRate;
        case 'completedJobs':
          return b.completedJobs - a.completedJobs;
        case 'avgTurnaroundDays':
          return a.avgTurnaroundDays - b.avgTurnaroundDays; // เร็วกว่า = ดีกว่า
        case 'name':
          return a.userName.localeCompare(b.userName);
        default:
          return 0;
      }
    });

    return users;
  }, [data, searchQuery, sortBy, isAdmin, user]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">รายงานผลงานรายบุคคล</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin ? 'ดูผลงานของทีมทั้งหมด' : 'ดูผลงานของคุณ'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="this_week">สัปดาห์นี้</option>
              <option value="last_7_days">7 วันที่แล้ว</option>
              <option value="this_month">เดือนนี้</option>
              <option value="last_30_days">30 วันที่แล้ว</option>
              <option value="this_quarter">ไตรมาสนี้</option>
              <option value="this_year">ปีนี้</option>
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <SortAsc className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="onTimeRate">อัตราส่งตรงเวลา (สูง → ต่ำ)</option>
              <option value="completedJobs">งานที่เสร็จ (มาก → น้อย)</option>
              <option value="avgTurnaroundDays">ความเร็ว (เร็ว → ช้า)</option>
              <option value="name">ชื่อ (A → Z)</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-600">
              {filteredAndSortedUsers.length} คน
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
            <p className="mt-3 text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Cards Grid */}
      {!isLoading && !error && filteredAndSortedUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedUsers.map((user) => (
            <UserPerformanceCard
              key={user.userId}
              user={user}
              onClick={() => setSelectedUserId(user.userId)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredAndSortedUsers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-3">
            <Filter className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่พบข้อมูล</h3>
          <p className="text-gray-600 text-sm">
            {searchQuery ? 'ลองค้นหาด้วยคำอื่น หรือปรับเปลี่ยนตัวกรอง' : 'ยังไม่มีข้อมูลผลงาน'}
          </p>
        </div>
      )}

      {/* Side Panel */}
      <UserDetailSidePanel
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
