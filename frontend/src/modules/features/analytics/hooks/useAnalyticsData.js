/**
 * @file useAnalyticsData.js
 * @description Hook สำหรับดึงข้อมูล Analytics Dashboard
 * 
 * วัตถุประสงค์:
 * - ดึงข้อมูล KPI จาก reportService
 * - จัดการ Loading, Error, และ Data states
 * - รองรับการกรองข้อมูลตาม Filters
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { reportService } from '@shared/services/modules/reportService';

/**
 * @function useAnalyticsData
 * @description Hook สำหรับดึงข้อมูล Analytics Dashboard
 * @param {object} filters - Filters สำหรับกรองข้อมูล
 * @returns {object} - { data, isLoading, error, refetch }
 */
export function useAnalyticsData(filters = {}) {
    const { user } = useAuthStoreV2();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * ดึงข้อมูล Analytics
     */
    const fetchData = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            // ดึงข้อมูลรายงานจาก reportService
            const reportData = await reportService.getReportData(
                filters.period || 'this_month',
                filters.startDate,
                filters.endDate,
                {
                    status: filters.status,
                    jobTypeId: filters.jobTypeId,
                    projectId: filters.projectId,
                    assigneeId: filters.assigneeId
                }
            );

            setData(reportData);
        } catch (err) {
            console.error('Error fetching analytics data:', err);
            setError(err.message || 'ไม่สามารถดึงข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    }, [user, filters.period, filters.startDate, filters.endDate, filters.status, filters.jobTypeId, filters.projectId, filters.assigneeId]);

    /**
     * ดึงข้อมูลเมื่อ filters เปลี่ยน
     */
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData
    };
}

/**
 * @function useTrendComparison
 * @description Hook สำหรับดึงข้อมูลเปรียบเทียบแนวโน้ม
 * @param {string} currentPeriod - ช่วงเวลาปัจจุบัน
 * @param {string} previousPeriod - ช่วงเวลาก่อนหน้า
 * @returns {object} - { data, isLoading, error }
 */
export function useTrendComparison(currentPeriod = 'this_month', previousPeriod = 'last_month') {
    const { user } = useAuthStoreV2();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTrendData = async () => {
            if (!user) return;

            setIsLoading(true);
            setError(null);

            try {
                // ดึงข้อมูลช่วงเวลาปัจจุบัน
                const currentData = await reportService.getReportData(currentPeriod);

                // ดึงข้อมูลช่วงเวลาก่อนหน้า
                const previousData = await reportService.getReportData(previousPeriod);

                // คำนวณการเปลี่ยนแปลง
                const comparison = {
                    totalJobsChange: calculatePercentageChange(
                        currentData.kpi?.totalDJ,
                        previousData.kpi?.totalDJ
                    ),
                    onTimeRateChange: calculatePercentageChange(
                        parseFloat(currentData.kpi?.onTimeRate) || 0,
                        parseFloat(previousData.kpi?.onTimeRate) || 0
                    ),
                    avgTurnaroundChange: calculatePercentageChange(
                        parseFloat(currentData.kpi?.avgTurnaround) || 0,
                        parseFloat(previousData.kpi?.avgTurnaround) || 0
                    ),
                    revisionRateChange: calculatePercentageChange(
                        parseFloat(currentData.kpi?.revisionRate) || 0,
                        parseFloat(previousData.kpi?.revisionRate) || 0
                    )
                };

                setData(comparison);
            } catch (err) {
                console.error('Error fetching trend comparison:', err);
                setError(err.message || 'ไม่สามารถดึงข้อมูลแนวโน้มได้');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrendData();
    }, [user, currentPeriod, previousPeriod]);

    return {
        data,
        isLoading,
        error
    };
}

/**
 * @function calculatePercentageChange
 * @description คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
 * @param {number} current - ค่าปัจจุบัน
 * @param {number} previous - ค่าก่อนหน้า
 * @returns {number} - เปอร์เซ็นต์การเปลี่ยนแปลง
 */
function calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

export default {
    useAnalyticsData,
    useTrendComparison
};
