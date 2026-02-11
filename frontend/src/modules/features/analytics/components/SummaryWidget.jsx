/**
 * @file SummaryWidget.jsx
 * @description Component สำหรับแสดงการ์ดสรุปตัวเลข KPI
 * 
 * วัตถุประสงค์:
 * - แสดง KPI หลัก 4 ตัว (Total Jobs, On-time Rate, Avg Turnaround, Revision Rate)
 * - แสดงแนวโน้ม (Trend) เปรียบเทียบกับช่วงเวลาก่อนหน้า
 * - รองรับ Loading และ Error states
 */

import TrendIndicator from './TrendIndicator';

/**
 * @component SummaryWidget
 * @description การ์ดสรุปตัวเลข KPI
 * @param {object} props
 * @param {object} props.kpi - ข้อมูล KPI
 * @param {object} props.trend - ข้อมูลแนวโน้ม
 * @param {boolean} props.isLoading - สถานะ Loading
 * @param {string} props.error - ข้อความ Error
 */
export default function SummaryWidget({ kpi, trend, isLoading, error }) {
    // แสดง Loading state
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-gray-400 shadow-sm animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gray-200"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // แสดง Error state
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                <p className="font-medium">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    // แสดง KPI Cards
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
                title="งานทั้งหมด"
                value={kpi?.totalDJ || 0}
                icon={<TotalJobsIcon />}
                color="blue"
                trend={trend?.totalJobsChange}
            />
            <KPICard
                title="อัตราส่งตรงเวลา"
                value={`${kpi?.onTimeRate || 0}%`}
                icon={<OnTimeIcon />}
                color="green"
                trend={trend?.onTimeRateChange}
                isPercentage
            />
            <KPICard
                title="เวลาเฉลี่ย (วัน)"
                value={kpi?.avgTurnaround || 0}
                icon={<TimeIcon />}
                color="amber"
                trend={trend?.avgTurnaroundChange}
                decimals={1}
            />
            <KPICard
                title="อัตราแก้ไข"
                value={`${kpi?.revisionRate || 0}%`}
                icon={<RevisionIcon />}
                color="red"
                trend={trend?.revisionRateChange}
                isPercentage
            />
        </div>
    );
}

/**
 * @component KPICard
 * @description การ์ดแสดง KPI แต่ละตัว
 * @param {object} props
 * @param {string} props.title - ชื่อ KPI
 * @param {number|string} props.value - ค่า KPI
 * @param {React.ReactNode} props.icon - ไอคอน
 * @param {string} props.color - สี (blue, green, amber, red)
 * @param {number} props.trend - ค่าแนวโน้ม
 * @param {boolean} props.isPercentage - แสดงเป็นเปอร์เซ็นต์หรือไม่
 * @param {number} props.decimals - จำนวนทศนิยม
 */
function KPICard({ title, value, icon, color, trend, isPercentage = false, decimals = 0 }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        amber: 'bg-amber-50 text-amber-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl p-4 border border-gray-400 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {typeof value === 'number'
                            ? value.toFixed(decimals)
                            : value}
                    </p>
                </div>
            </div>

            {/* แสดงแนวโน้ม */}
            {trend !== undefined && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <TrendIndicator value={trend} />
                </div>
            )}
        </div>
    );
}

// ============================================
// Icons
// ============================================

function TotalJobsIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
    );
}

function OnTimeIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function TimeIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function RevisionIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}
