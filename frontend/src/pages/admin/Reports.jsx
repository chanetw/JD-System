/**
 * @file Reports.jsx
 * @description หน้า Reports Dashboard แสดง KPI, Charts, และ Tables วิเคราะห์ข้อมูลงาน DJ
 * ใช้ Tailwind CSS สำหรับ Styling + Recharts สำหรับ Charts
 */

import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import apiDatabase from '../../services/apiDatabase';

// Color palette
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];
const STATUS_COLORS = {
    'pending': '#F59E0B',
    'approved': '#10B981',
    'assigned': '#06B6D4',
    'completed': '#10B981',
    'rejected': '#EF4444',
    'rework': '#EAB308'
};

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [periodType, setPeriodType] = useState('this_month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [error, setError] = useState(null);
    const [reportData, setReportData] = useState({
        jobs: [],
        kpi: {},
        byStatus: [],
        byJobType: [],
        byProject: [],
        assigneePerformance: [],
        monthlyTrend: [],
        slaPerformance: {}
    });

    // Fetch report data
    const fetchReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get all jobs
            const jobs = await apiDatabase.getReportData(periodType, customStartDate, customEndDate);

            // 2. Calculate all metrics
            const [kpi, byStatus, byJobType, byProject, assigneePerformance, monthlyTrend, slaPerformance] = await Promise.all([
                apiDatabase.calculateKPI(jobs),
                apiDatabase.groupByStatus(jobs),
                apiDatabase.groupByJobType(jobs),
                apiDatabase.groupByProject(jobs),
                apiDatabase.calculateAssigneePerformance(jobs),
                apiDatabase.calculateMonthlyTrend(jobs),
                apiDatabase.calculateSLAPerformance(jobs)
            ]);

            setReportData({
                jobs,
                kpi,
                byStatus,
                byJobType,
                byProject,
                assigneePerformance,
                monthlyTrend,
                slaPerformance
            });
        } catch (err) {
            console.error('Error fetching report data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [periodType, customStartDate, customEndDate]);

    // Handle export
    const handleExport = async (format) => {
        try {
            const exportData = await apiDatabase.exportReport(reportData.jobs, reportData.kpi, format);
            
            if (format === 'csv') {
                // Convert to CSV
                const headers = Object.keys(exportData.data[0] || {});
                const csv = [
                    headers.join(','),
                    ...exportData.data.map(row => headers.map(h => `"${row[h]}"`).join(','))
                ].join('\n');

                // Download
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = exportData.filename;
                link.click();
            } else if (format === 'json') {
                // Download JSON
                const json = JSON.stringify(exportData, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = exportData.filename.replace('.csv', '.json');
                link.click();
            }
        } catch (err) {
            console.error('Error exporting report:', err);
        }
    };

    // KPI Card Component
    const KPICard = ({ title, value, subtitle, icon: IconName, color }) => {
        const iconMap = {
            'assignment': '📋',
            'completed': '✅',
            'ontime': '⏱️',
            'timer': '⚡',
            'warning': '⚠️'
        };
        
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 h-full hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
                        <h3 className="text-4xl font-bold mb-2" style={{ color }}>
                            {value}
                        </h3>
                        {subtitle && (
                            <p className="text-gray-500 text-sm">{subtitle}</p>
                        )}
                    </div>
                    <div 
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${color}20` }}
                    >
                        {iconMap[IconName] || '📊'}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                        📊 Reports & Analytics
                    </h1>
                    <p className="text-gray-600">
                        วิเคราะห์ข้อมูลงาน Design Job และประสิทธิภาพของทีม
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">❌ เกิดข้อผิดพลาด: {error}</p>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Period Select */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ช่วงเวลา
                            </label>
                            <select
                                value={periodType}
                                onChange={(e) => setPeriodType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="this_month">เดือนนี้</option>
                                <option value="last_month">เดือนที่แล้ว</option>
                                <option value="this_quarter">ไตรมาสนี้</option>
                                <option value="this_year">ปีนี้</option>
                                <option value="custom">กำหนดเอง</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {periodType === 'custom' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        วันที่เริ่มต้น
                                    </label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        วันที่สิ้นสุด
                                    </label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 items-end">
                            <button
                                onClick={fetchReportData}
                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                                🔄 รีเฟรช
                            </button>
                            <button
                                onClick={() => handleExport('csv')}
                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                            >
                                📥 CSV
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                            >
                                📥 JSON
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <KPICard
                        title="Total DJ"
                        value={reportData.kpi.totalJobs || 0}
                        subtitle="งานทั้งหมด"
                        icon="assignment"
                        color="#0088FE"
                    />
                    <KPICard
                        title="Completed"
                        value={reportData.kpi.completedJobs || 0}
                        subtitle="งานที่เสร็จสิ้น"
                        icon="completed"
                        color="#00C49F"
                    />
                    <KPICard
                        title="On-Time Rate"
                        value={`${reportData.kpi.onTimeRate || 0}%`}
                        subtitle="ส่งตรงเวลา"
                        icon="ontime"
                        color="#10B981"
                    />
                    <KPICard
                        title="Avg Turnaround"
                        value={`${reportData.kpi.avgTurnaround || 0}`}
                        subtitle="วัน (เฉลี่ย)"
                        icon="timer"
                        color="#F59E0B"
                    />
                    <KPICard
                        title="Revision Rate"
                        value={`${reportData.kpi.revisionRate || 0}%`}
                        subtitle="งานแก้ไข"
                        icon="warning"
                        color="#EF4444"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* DJ by Status */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">DJ by Status</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={reportData.byStatus}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={(entry) => `${entry.status}: ${entry.count}`}
                                >
                                    {reportData.byStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* DJ by Job Type */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">DJ by Job Type</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.byJobType.slice(0, 5)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#0088FE">
                                    {reportData.byJobType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* DJ by Project */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">DJ by Project (Top 5)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.byProject.slice(0, 5)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#00C49F">
                                    {reportData.byProject.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Trend Chart */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Monthly Trend (Last 6 Months)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={reportData.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#0088FE" strokeWidth={2} name="Total Jobs" />
                            <Line type="monotone" dataKey="completed" stroke="#00C49F" strokeWidth={2} name="Completed" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Tables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Assignee Performance */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Assignee Performance</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Assignee</th>
                                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Total</th>
                                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Completed</th>
                                        <th className="px-4 py-2 text-center font-semibold text-gray-700">On-Time</th>
                                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Avg Days</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.assigneePerformance.length > 0 ? (
                                        reportData.assigneePerformance.map((assignee) => (
                                            <tr key={assignee.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-900 font-medium">{assignee.name}</td>
                                                <td className="px-4 py-3 text-center text-gray-700">{assignee.totalJobs}</td>
                                                <td className="px-4 py-3 text-center text-gray-700">{assignee.completedJobs}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                        parseFloat(assignee.onTimeRate) >= 80
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {assignee.onTimeRate}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-700">{assignee.avgTurnaround}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                                ไม่มีข้อมูล
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SLA Performance */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">⏱️ SLA Performance</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 rounded-lg p-4 text-center border-l-4 border-green-500">
                                    <p className="text-3xl font-bold text-green-700">
                                        {reportData.slaPerformance.onTime || 0}
                                    </p>
                                    <p className="text-sm text-green-600 font-medium mt-1">On-Time Jobs</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4 text-center border-l-4 border-red-500">
                                    <p className="text-3xl font-bold text-red-700">
                                        {reportData.slaPerformance.late || 0}
                                    </p>
                                    <p className="text-sm text-red-600 font-medium mt-1">Late Jobs</p>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 pt-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">On-Time Rate:</span>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                                        parseFloat(reportData.slaPerformance.onTimeRate || 0) >= 80
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {reportData.slaPerformance.onTimeRate || 0}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">Avg Delay (Late Jobs):</span>
                                    <span className="text-gray-900 font-semibold">
                                        {reportData.slaPerformance.avgDelay || 0} days
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">Total Completed:</span>
                                    <span className="text-gray-900 font-semibold">
                                        {reportData.slaPerformance.total || 0} jobs
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
