/**
 * @file useUserPerformance.js
 * @description Hook สำหรับดึงข้อมูลผลงานรายบุคคล
 */

import { useState, useEffect } from 'react';
import httpClient from '@shared/services/httpClient';

/**
 * Hook สำหรับดึงข้อมูลผลงานของ user คนหนึ่ง
 * @param {number} userId - ID ของผู้ใช้
 * @param {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 */
export function useUserPerformance(userId, startDate = null, endDate = null) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await httpClient.get(`/reports/user-performance/${userId}`, { params });
        
        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch user performance');
        }
      } catch (err) {
        console.error('[useUserPerformance] Error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, startDate, endDate]);

  return { data, isLoading, error };
}

/**
 * Hook สำหรับดึงข้อมูลเปรียบเทียบทีม
 * @param {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 */
export function useTeamComparison(startDate = null, endDate = null) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await httpClient.get('/reports/team-comparison', { params });
        
        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch team comparison');
        }
      } catch (err) {
        console.error('[useTeamComparison] Error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return { data, isLoading, error, refetch: () => {} };
}
