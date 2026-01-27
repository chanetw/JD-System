/**
 * @file index.jsx
 * @description Analytics Module - Export routes and components
 * 
 * วัตถุประสงค์:
 * - ลงทะเบียน Routes สำหรับ Analytics Dashboard
 * - Export Components ที่เกี่ยวข้อง
 */

import ProtectedRoute from '@core/auth/ProtectedRoute';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

/**
 * Routes สำหรับ Analytics Module
 */
export const routes = [
    {
        path: '/analytics',
        element: (
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
                <AnalyticsDashboard />
            </ProtectedRoute>
        ),
        title: 'Analytics Dashboard',
        roles: ['admin', 'manager', 'supervisor']
    }
];

/**
 * Export Components สำหรับการใช้งานภายนอก Module
 */
export { default as AnalyticsDashboard } from './pages/AnalyticsDashboard';
export { default as SummaryWidget } from './components/SummaryWidget';
export { default as PerformanceChart } from './components/PerformanceChart';
export { default as SLAReportTable } from './components/SLAReportTable';
export { default as TrendIndicator } from './components/TrendIndicator';
export { default as FilterPanel } from './components/FilterPanel';
export { default as ExportButton } from './components/ExportButton';

/**
 * Export Hooks สำหรับการใช้งานภายนอก Module
 */
export { useAnalyticsData } from './hooks/useAnalyticsData';
export { useRealtimeAnalytics } from './hooks/useRealtimeAnalytics';
export { useRealtimeAnalyticsWithRefetch } from './hooks/useRealtimeAnalytics';
