/**
 * @file AnalyticsDashboard.jsx
 * @description หน้า Dashboard แสดงข้อมูลเชิงลึก (Insights)
 * 
 * วัตถุประสงค์:
 * - แสดงภาพรวมของงานและประสิทธิภาพ
 * - แสดงกราฟและตารางรายงาน
 * - รองรับการกรองข้อมูล
 * - รองรับการ Export ข้อมูล
 * - รองรับการอัปเดตแบบ Real-time
 */

import { useState } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { useRealtimeAnalyticsWithRefetch } from '../hooks/useRealtimeAnalytics';
import { reportService } from '@shared/services/modules/reportService';
import SummaryWidget from '../components/SummaryWidget';
import PerformanceChart from '../components/PerformanceChart';
import SLAReportTable from '../components/SLAReportTable';
import FilterPanel from '../components/FilterPanel';
import ExportButton from '../components/ExportButton';

/**
 * @component AnalyticsDashboard
 * @description หน้า Dashboard แสดงข้อมูลเชิงลึก
 */
export default function AnalyticsDashboard() {
    const { user } = useAuthStoreV2();
    const [filters, setFilters] = useState({
        period: 'this_month',
        startDate: null,
        endDate: null,
        status: null,
        projectId: null,
        assigneeId: null
    });
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(null);

    // ดึงข้อมูล Analytics
    const { data, isLoading, error, refetch } = useAnalyticsData(filters);

    // ดึงข้อมูล Trend Comparison
    const { data: trendData, isLoading: trendLoading } = useAnalyticsData({
        ...filters,
        period: filters.period === 'this_month' ? 'last_month' :
            filters.period === 'this_quarter' ? 'last_quarter' :
                filters.period === 'this_year' ? 'last_year' : 'custom'
    });

    // Real-time updates
    useRealtimeAnalyticsWithRefetch(refetch, 2000);

    /**
     * จัดการเมื่อ Filters เปลี่ยน
     */
    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters);
    };

    /**
     * Export PDF
     */
    const handleExportPDF = async () => {
        setIsExporting(true);
        setExportError(null);
        try {
            await reportService.exportDashboardToPDF(data, filters);
        } catch (err) {
            console.error('Export PDF failed:', err);
            setExportError('ไม่สามารถ Export PDF ได้');
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Export Excel
     */
    const handleExportExcel = async () => {
        setIsExporting(true);
        setExportError(null);
        try {
            await reportService.exportDashboardToExcel(data, filters);
        } catch (err) {
            console.error('Export Excel failed:', err);
            setExportError('ไม่สามารถ Export Excel ได้');
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Export CSV
     */
    const handleExportCSV = async () => {
        setIsExporting(true);
        setExportError(null);
        try {
            await reportService.exportDashboardToExcel(data, filters); // ใช้ function เดียวกัน (CSV format)
        } catch (err) {
            console.error('Export CSV failed:', err);
            setExportError('ไม่สามารถ Export CSV ได้');
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * เตรียมข้อมูลสำหรับกราฟ
     * แก้ไข: ใช้ data structure ที่ถูกต้องจาก reportService
     */
    const prepareChartData = () => {
        if (!data) return { barChartData: [], pieChartData: [], lineChartData: [] };

        // กราฟแท่ง: เปรียบเทียบงานที่สร้าง vs งานที่เสร็จ
        // monthlyTrend จาก reportService มี structure: { name, jobs, completed }
        const barChartData = data.monthlyTrend?.map(item => ({
            name: item.name,
            created: item.jobs,
            completed: item.completed
        })) || [];

        // กราฟวงกลม: สัดส่วนสถานะงาน
        // byStatus จาก reportService มี structure: { status, label, count, percentage, color }
        const pieChartData = data.byStatus?.map(item => ({
            name: item.label || item.status,
            value: item.count
        })) || [];

        // กราฟเส้น: แนวโน้มตามช่วงเวลา
        const lineChartData = data.monthlyTrend?.map(item => ({
            name: item.name,
            onTimeRate: item.completed > 0 ? ((item.completed / item.jobs) * 100).toFixed(1) : 0,
            avgTurnaround: 0 // ต้องคำนวณเพิ่มเติมถ้าต้องการ
        })) || [];

        return { barChartData, pieChartData, lineChartData };
    };

    /**
     * เตรียมข้อมูล Trend
     */
    const prepareTrendData = () => {
        if (!data || !trendData) return null;

        return {
            totalJobsChange: calculatePercentageChange(data.kpi?.totalDJ, trendData.kpi?.totalDJ),
            onTimeRateChange: calculatePercentageChange(
                parseFloat(data.kpi?.onTimeRate) || 0,
                parseFloat(trendData.kpi?.onTimeRate) || 0
            ),
            avgTurnaroundChange: calculatePercentageChange(
                parseFloat(data.kpi?.avgTurnaround) || 0,
                parseFloat(trendData.kpi?.avgTurnaround) || 0
            ),
            revisionRateChange: calculatePercentageChange(
                parseFloat(data.kpi?.revisionRate) || 0,
                parseFloat(trendData.kpi?.revisionRate) || 0
            )
        };
    };

    /**
     * คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
     */
    const calculatePercentageChange = (current, previous) => {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    };

    /**
     * เตรียมข้อมูลสำหรับ SLA Report Table
     * แก้ไข: ใช้ jobs array แทน slaReport
     */
    const prepareSLAReportData = () => {
        if (!data?.jobs) return [];

        // กรองเฉพาะงานที่เสร็จแล้ว
        return data.jobs
            .filter(job => job.status === 'completed')
            .map(job => ({
                id: job.id,
                djNumber: job.dj_id,
                assignee: {
                    displayName: job.assignee?.display_name,
                    firstName: job.assignee?.display_name?.split(' ')[0]
                },
                deadline: job.due_date,
                completedAt: job.completed_at
            }));
    };

    const { barChartData, pieChartData, lineChartData } = prepareChartData();
    const trend = prepareTrendData();
    const slaReportData = prepareSLAReportData();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard ภาพรวม</h1>
                        <p className="text-gray-600 mt-1">
                            ข้อมูลเชิงลึกเกี่ยวกับงานและประสิทธิภาพ
                        </p>
                    </div>
                    <ExportButton
                        onExportPDF={handleExportPDF}
                        onExportExcel={handleExportExcel}
                        onExportCSV={handleExportCSV}
                        isExporting={isExporting}
                    />
                </div>

                {/* Export Error Message */}
                {exportError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {exportError}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="mb-6">
                <FilterPanel
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    projects={data?.byProject || []}
                    users={data?.assigneePerformance || []}
                />
            </div>

            {/* Summary Widget */}
            <div className="mb-6">
                <SummaryWidget
                    kpi={data?.kpi}
                    trend={trend}
                    isLoading={isLoading || trendLoading}
                    error={error}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <PerformanceChart
                    data={barChartData}
                    chartType="bar"
                    isLoading={isLoading}
                    error={error}
                    title="งานที่สร้าง vs งานที่เสร็จ"
                />
                <PerformanceChart
                    data={pieChartData}
                    chartType="pie"
                    isLoading={isLoading}
                    error={error}
                    title="สัดส่วนสถานะงาน"
                />
            </div>

            <div className="mb-6">
                <PerformanceChart
                    data={lineChartData}
                    chartType="line"
                    isLoading={isLoading}
                    error={error}
                    title="แนวโน้มตามช่วงเวลา"
                />
            </div>

            {/* SLA Report Table */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">รายงาน SLA</h2>
                <SLAReportTable
                    data={slaReportData}
                    isLoading={isLoading}
                    error={error}
                />
            </div>
        </div>
    );
}
