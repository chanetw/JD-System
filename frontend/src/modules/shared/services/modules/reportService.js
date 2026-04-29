
import httpClient from '../httpClient';

export const reportService = {
    /**
     * ดึงข้อมูลรายงานทั้งหมด
     */
    getReportData: async (periodType = 'this_month', customStartDate = null, customEndDate = null, filters = {}) => {
        const { startDate, endDate } = reportService.getPeriodDates(periodType, customStartDate, customEndDate);

        const response = await httpClient.get('/reports/analytics', {
            params: {
                startDate,
                endDate,
                status: filters.status,
                jobTypeId: filters.jobTypeId,
                projectId: filters.projectId,
                assigneeId: filters.assigneeId
            }
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to fetch report data');
        }

        const apiData = response.data.data || {};
        const data = apiData.jobs || [];

        if (!data.length) {
            return apiData;
        }

        // Calculate all metrics based on fetched data
        const kpi = await reportService.calculateKPI(data);
        const byStatus = await reportService.groupByStatus(data);
        const byJobType = await reportService.groupByJobType(data);
        const byProject = await reportService.groupByProject(data);
        const assigneePerformance = await reportService.calculateAssigneePerformance(data);
        const monthlyTrend = await reportService.calculateMonthlyTrend(data);
        const slaPerformance = await reportService.calculateSLAPerformance(data);

        return {
            jobs: data,
            kpi,
            byStatus,
            byJobType,
            byProject,
            assigneePerformance,
            monthlyTrend,
            slaPerformance
        };
    },

    /**
     * คำนวณ KPI ทั้งหมด
     */
    calculateKPI: async (jobs) => {
        const totalJobs = jobs.length;
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        const onTimeJobs = jobs.filter(j => {
            if (j.status !== 'completed' || !j.completed_at || !j.due_date) return false;
            return new Date(j.completed_at) <= new Date(j.due_date);
        }).length;

        // Average Turnaround Time (completed jobs only)
        const completedWithDates = jobs.filter(j => j.status === 'completed' && j.created_at && j.completed_at);
        const avgTurnaround = completedWithDates.length > 0
            ? completedWithDates.reduce((sum, j) => {
                const days = Math.ceil((new Date(j.completed_at) - new Date(j.created_at)) / (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0) / completedWithDates.length
            : 0;

        // Revision Rate (jobs with revision > 0)
        const jobsWithRevision = jobs.filter(j => (j.revision_count || 0) > 0).length;
        const revisionRate = totalJobs > 0 ? (jobsWithRevision / totalJobs * 100) : 0;

        // On-Time Rate
        const onTimeRate = completedJobs > 0 ? (onTimeJobs / completedJobs * 100) : 0;

        return {
            totalDJ: totalJobs,
            totalDJChange: 0, // Mock for now (needs comparison with prev period)
            completed: completedJobs,
            completionRate: totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : '0.0',
            onTimeRate: onTimeRate.toFixed(1),
            onTimeRateChange: 0, // Mock
            avgTurnaround: avgTurnaround.toFixed(1),
            revisionRate: revisionRate.toFixed(1)
        };
    },

    /**
     * จัดกลุ่มตามสถานะ
     */
    groupByStatus: async (jobs) => {
        const statusMap = {};
        jobs.forEach(job => {
            const status = job.status || 'unknown';
            if (!statusMap[status]) statusMap[status] = 0;
            statusMap[status]++;
        });

        // Map status to color/label
        const getColor = (s) => {
            const colors = { completed: 'bg-green-500', in_progress: 'bg-blue-500', pending_approval: 'bg-yellow-500', rejected: 'bg-red-500' };
            return colors[s] || 'bg-gray-400';
        };

        return Object.entries(statusMap).map(([status, count]) => ({
            status,
            label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
            count,
            percentage: ((count / jobs.length) * 100).toFixed(1),
            color: getColor(status)
        }));
    },

    /**
     * จัดกลุ่มตามประเภทงาน
     */
    groupByJobType: async (jobs) => {
        const typeMap = {};
        jobs.forEach(job => {
            const typeName = job.job_type?.name || 'Unknown';
            // Also accumulate icon if available
            if (!typeMap[typeName]) typeMap[typeName] = { count: 0, icon: job.job_type?.icon || '📝' };
            typeMap[typeName].count++;
        });

        return Object.entries(typeMap)
            .map(([name, data]) => ({
                id: name, // use name as ID for display
                name,
                count: data.count,
                icon: data.icon,
                color: 'blue' // Default color
            }))
            .sort((a, b) => b.count - a.count);
    },

    /**
     * จัดกลุ่มตามโปรเจค
     */
    groupByProject: async (jobs) => {
        const projectMap = {};
        jobs.forEach(job => {
            const projectName = job.project?.name || 'No Project';
            if (!projectMap[projectName]) projectMap[projectName] = 0;
            projectMap[projectName]++;
        });

        return Object.entries(projectMap)
            .map(([name, count]) => ({
                id: name,
                name,
                count,
                percentage: ((count / jobs.length) * 100).toFixed(1),
                color: 'indigo'
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    },

    /**
     * คำนวณผลงานของ Assignee
     */
    calculateAssigneePerformance: async (jobs) => {
        const assigneeMap = {};

        jobs.forEach(job => {
            if (!job.assignee) return;

            const assigneeId = job.assignee.id || job.assignee_id;
            const assigneeName = job.assignee.display_name || 'Unknown';

            if (!assigneeMap[assigneeId]) {
                assigneeMap[assigneeId] = {
                    id: assigneeId,
                    name: assigneeName,
                    initials: assigneeName.substring(0, 2).toUpperCase(),
                    title: 'Graphic Designer', // Mock title
                    total: 0,
                    completed: 0,
                    onTime: 0,
                    avgDays: []
                };
            }

            assigneeMap[assigneeId].total++;

            if (job.status === 'completed') {
                assigneeMap[assigneeId].completed++;

                // Check on-time
                if (job.completed_at && job.due_date && new Date(job.completed_at) <= new Date(job.due_date)) {
                    assigneeMap[assigneeId].onTime++;
                }

                // Calculate turnaround
                if (job.created_at && job.completed_at) {
                    const days = Math.ceil((new Date(job.completed_at) - new Date(job.created_at)) / (1000 * 60 * 60 * 24));
                    assigneeMap[assigneeId].avgDays.push(days);
                }
            }
        });

        return Object.values(assigneeMap).map(a => ({
            id: a.id,
            initials: a.initials,
            name: a.name,
            title: a.title,
            completed: a.completed,
            onTimeRate: a.completed > 0 ? ((a.onTime / a.completed) * 100).toFixed(1) : '0.0',
            avgDays: a.avgDays.length > 0
                ? (a.avgDays.reduce((sum, d) => sum + d, 0) / a.avgDays.length).toFixed(1)
                : '0.0'
        })).sort((a, b) => b.completed - a.completed);
    },

    /**
     * คำนวณแนวโน้มรายเดือน (6 เดือนล่าสุด)
     */
    calculateMonthlyTrend: async (jobs) => {
        const monthMap = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString('default', { month: 'short' });
            monthMap[key] = { name: key, jobs: 0, completed: 0 };
        }

        jobs.forEach(job => {
            const date = new Date(job.created_at);
            // Check if within last 6 months range approximately
            const key = date.toLocaleString('default', { month: 'short' });

            if (monthMap[key]) {
                monthMap[key].jobs++;
                if (job.status === 'completed') monthMap[key].completed++;
            }
        });

        return Object.values(monthMap);
    },

    /**
     * คำนวณประสิทธิภาพ SLA
     */
    calculateSLAPerformance: async (jobs) => {
        const completedJobs = jobs.filter(j => j.status === 'completed' && j.completed_at && j.due_date);

        const onTimeJobs = completedJobs.filter(j => new Date(j.completed_at) <= new Date(j.due_date));
        const lateJobs = completedJobs.filter(j => new Date(j.completed_at) > new Date(j.due_date));

        const avgDelay = lateJobs.length > 0
            ? lateJobs.reduce((sum, j) => {
                const delay = Math.ceil((new Date(j.completed_at) - new Date(j.due_date)) / (1000 * 60 * 60 * 24));
                return sum + delay;
            }, 0) / lateJobs.length
            : 0;

        return {
            total: completedJobs.length,
            onTime: onTimeJobs.length,
            late: lateJobs.length,
            onTimeRate: completedJobs.length > 0
                ? ((onTimeJobs.length / completedJobs.length) * 100).toFixed(1)
                : '0.0',
            avgDelay: avgDelay.toFixed(1)
        };
    },

    /**
     * Export รายงาน (Prepare data for export)
     */
    exportReport: async (params) => { // Params might contain date range etc.
        // Re-fetch or pass data? Usually re-fetch to ensure freshness or get ALL data without pagination
        const data = await reportService.getReportData(params.period, params.startDate, params.endDate);
        const jobs = data.jobs;

        // Prepare flat data for export
        const exportData = jobs.map(job => ({
            'DJ ID': job.dj_id,
            'Subject': job.subject,
            'Job Type': job.job_type?.name || '-',
            'Project': job.project?.name || '-',
            'Requester': job.requester?.display_name || '-',
            'Assignee': job.assignee?.display_name || '-',
            'Status': job.status,
            'Priority': job.priority,
            'Created Date': new Date(job.created_at).toLocaleDateString('th-TH'),
            'Due Date': job.due_date ? new Date(job.due_date).toLocaleDateString('th-TH') : '-',
            'Completed Date': job.completed_at ? new Date(job.completed_at).toLocaleDateString('th-TH') : '-',
            'Turnaround (Days)': job.completed_at && job.created_at
                ? Math.ceil((new Date(job.completed_at) - new Date(job.created_at)) / (1000 * 60 * 60 * 24))
                : '-',
            'On Time': job.completed_at && job.due_date
                ? (new Date(job.completed_at) <= new Date(job.due_date) ? 'Yes' : 'No')
                : '-'
        }));

        // Convert to CSV/Excel Blob
        // For now, simplify and just return JSON string or Blob
        const csvContent = "data:text/csv;charset=utf-8,"
            + Object.keys(exportData[0]).join(",") + "\n"
            + exportData.map(e => Object.values(e).join(",")).join("\n");

        // Return Blob logic is handled in component usually, or here we return Blob
        return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    },

    /**
     * Export Dashboard เป็น PDF
     * @param {object} data - ข้อมูล Dashboard
     * @param {object} filters - Filters ที่ใช้
     */
    exportDashboardToPDF: async (data, filters = {}) => {
        try {
            // สร้าง HTML content สำหรับ PDF
            const htmlContent = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Sarabun', sans-serif; padding: 20px; }
                        h1 { color: #881337; }
                        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
                        .kpi-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                        .kpi-value { font-size: 24px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f5f5f5; }
                    </style>
                </head>
                <body>
                    <h1>รายงาน Dashboard ภาพรวม</h1>
                    <p>ช่วงเวลา: ${filters.period || 'this_month'}</p>
                    <p>วันที่สร้างรายงาน: ${new Date().toLocaleDateString('th-TH')}</p>
                    
                    <h2>KPI สรุป</h2>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div>งานทั้งหมด</div>
                            <div class="kpi-value">${data?.kpi?.totalDJ || 0}</div>
                        </div>
                        <div class="kpi-card">
                            <div>อัตราส่งตรงเวลา</div>
                            <div class="kpi-value">${data?.kpi?.onTimeRate || 0}%</div>
                        </div>
                        <div class="kpi-card">
                            <div>เวลาเฉลี่ย</div>
                            <div class="kpi-value">${data?.kpi?.avgTurnaround || 0} วัน</div>
                        </div>
                        <div class="kpi-card">
                            <div>อัตราแก้ไข</div>
                            <div class="kpi-value">${data?.kpi?.revisionRate || 0}%</div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // สร้าง Blob และ download
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting PDF:', error);
            throw error;
        }
    },

    /**
     * Export Dashboard เป็น Excel
     * @param {object} data - ข้อมูล Dashboard
     * @param {object} filters - Filters ที่ใช้
     */
    exportDashboardToExcel: async (data, filters = {}) => {
        try {
            const jobs = data?.jobs || [];

            // สร้าง CSV content (Excel compatible)
            const headers = [
                'DJ ID',
                'Subject',
                'Job Type',
                'Project',
                'Requester',
                'Assignee',
                'Status',
                'Priority',
                'Created Date',
                'Due Date',
                'Completed Date',
                'Turnaround (Days)',
                'On Time'
            ];

            const rows = jobs.map(job => [
                job.dj_id || '',
                job.subject || '',
                job.job_type?.name || '-',
                job.project?.name || '-',
                job.requester?.display_name || '-',
                job.assignee?.display_name || '-',
                job.status || '',
                job.priority || '',
                job.created_at ? new Date(job.created_at).toLocaleDateString('th-TH') : '-',
                job.due_date ? new Date(job.due_date).toLocaleDateString('th-TH') : '-',
                job.completed_at ? new Date(job.completed_at).toLocaleDateString('th-TH') : '-',
                job.completed_at && job.created_at
                    ? Math.ceil((new Date(job.completed_at) - new Date(job.created_at)) / (1000 * 60 * 60 * 24))
                    : '-',
                job.completed_at && job.due_date
                    ? (new Date(job.completed_at) <= new Date(job.due_date) ? 'Yes' : 'No')
                    : '-'
            ]);

            // สร้าง CSV content
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // สร้าง Blob และ download
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting Excel:', error);
            throw error;
        }
    },

    /**
     * Helper: คำนวณช่วงวันที่ตาม Period
     */
    getPeriodDates: (periodType, customStartDate, customEndDate) => {
        const now = new Date();
        let startDate, endDate;

        switch (periodType) {
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'this_quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), quarter * 3 + 3, -1);
                break;
            case 'this_year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), 0, 1);
                endDate = customEndDate ? new Date(customEndDate) : now;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    }
};
