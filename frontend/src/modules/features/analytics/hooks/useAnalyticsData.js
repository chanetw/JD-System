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
import httpClient from '@shared/services/httpClient';

/**
 * Helper: คำนวณช่วงวันที่ตาม Period
 */
function getPeriodDates(periodType) {
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
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'last_quarter':
            const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
            startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
            endDate = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
            break;
        case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'last_year':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31);
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
            // คำนวณ date range จาก period
            const dates = filters.startDate && filters.endDate 
                ? { startDate: filters.startDate, endDate: filters.endDate }
                : getPeriodDates(filters.period || 'this_month');

            // สร้าง query parameters
            const params = {
                startDate: dates.startDate,
                endDate: dates.endDate
            };

            if (filters.status) params.status = filters.status;
            if (filters.projectId) params.projectId = filters.projectId;
            if (filters.assigneeId) params.assigneeId = filters.assigneeId;

            // เรียก Backend API
            const response = await httpClient.get('/reports/analytics', { params });

            if (response.data.success) {
                setData(response.data.data);
            } else {
                setError(response.data.message || 'Failed to fetch analytics data');
            }
        } catch (err) {
            console.error('Error fetching analytics data:', err);
            setError(err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    }, [user, filters.period, filters.startDate, filters.endDate, filters.status, filters.projectId, filters.assigneeId]);

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
                // คำนวณ date range สำหรับช่วงเวลาปัจจุบัน
                const currentDates = getPeriodDates(currentPeriod);
                const previousDates = getPeriodDates(previousPeriod);

                // ⚡ Performance: ดึงข้อมูลทั้ง 2 ช่วงแบบ parallel
                const [currentResponse, previousResponse] = await Promise.all([
                    httpClient.get('/reports/analytics', {
                        params: {
                            startDate: currentDates.startDate,
                            endDate: currentDates.endDate
                        }
                    }),
                    httpClient.get('/reports/analytics', {
                        params: {
                            startDate: previousDates.startDate,
                            endDate: previousDates.endDate
                        }
                    })
                ]);

                const currentData = currentResponse.data.data;
                const previousData = previousResponse.data.data;

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
                setError(err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลแนวโน้มได้');
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
