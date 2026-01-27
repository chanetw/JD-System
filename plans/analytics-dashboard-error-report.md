# รายงานข้อผิดพลาดและข้อแนะนำ - Analytics Dashboard Module

## วันที่ตรวจสอบ: 27 มกราคม 2026

---

## 🔴 ข้อผิดพลาดที่ต้องแก้ไข (Critical Errors)

### 1. Import Path ผิดพลาดใน SummaryWidget.jsx

**ไฟล์**: [`frontend/src/modules/features/analytics/components/SummaryWidget.jsx`](frontend/src/modules/features/analytics/components/SummaryWidget.jsx:11)

**ปัญหา**: 
```javascript
import { TrendIndicator } from './TrendIndicator';
```

**สาเหตุ**: TrendIndicator ถูก export เป็น `default export` ไม่ใช่ `named export`

**วิธีแก้ไข**:
```javascript
import TrendIndicator from './TrendIndicator';
```

---

### 2. useRealtime Hook ไม่มี subscribe/unsubscribe functions

**ไฟล์**: [`frontend/src/modules/features/analytics/hooks/useRealtimeAnalytics.js`](frontend/src/modules/features/analytics/hooks/useRealtimeAnalytics.js:21)

**ปัญหา**: 
```javascript
const { subscribe, unsubscribe, isConnected, error } = useRealtime();
```

**สาเหตุ**: ไฟล์ [`useRealtime.js`](frontend/src/modules/shared/hooks/useRealtime.js) ไม่มี hook ชื่อ `useRealtime` ที่ return `subscribe` และ `unsubscribe` functions โดยตรง มีแต่ hooks เฉพาะทาง เช่น `useJobsRealtime`, `useNotificationsRealtime` เป็นต้น

**วิธีแก้ไข**: ใช้ `useJobsRealtime` แทน หรือสร้าง hook ใหม่ที่เหมาะสม

```javascript
// Option 1: ใช้ useJobsRealtime
import { useJobsRealtime } from '@shared/hooks/useRealtime';

export function useRealtimeAnalytics(onDataChange) {
    const { user } = useAuthStore();
    const tenantId = user?.tenantId;
    
    useJobsRealtime(tenantId, {
        onInsert: onDataChange,
        onUpdate: onDataChange,
        onDelete: onDataChange
    }, !!tenantId);
    
    return { isConnected: true, error: null };
}
```

---

### 3. API Method ไม่ตรงกับ apiService

**ไฟล์**: [`frontend/src/modules/features/analytics/hooks/useAnalyticsData.js`](frontend/src/modules/features/analytics/hooks/useAnalyticsData.js:38)

**ปัญหา**: 
```javascript
const reportData = await api.getReportData(
    filters.period || 'this_month',
    filters.startDate,
    filters.endDate,
    { ... }
);
```

**สาเหตุ**: `api` (จาก apiService.js) ไม่มี method `getReportData` โดยตรง ต้องใช้ `reportService.getReportData` แทน

**วิธีแก้ไข**:
```javascript
import { reportService } from '@shared/services/modules/reportService';

// แทนที่
const reportData = await reportService.getReportData(
    filters.period || 'this_month',
    filters.startDate,
    filters.endDate,
    { ... }
);
```

---

### 4. Export Functions ไม่มีใน reportService

**ไฟล์**: [`frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx`](frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx:67)

**ปัญหา**: 
```javascript
await reportService.exportDashboardToPDF(data, filters);
await reportService.exportDashboardToExcel(data, filters);
```

**สาเหตุ**: Functions `exportDashboardToPDF` และ `exportDashboardToExcel` ยังไม่มีใน reportService

**วิธีแก้ไข**: ต้องเพิ่ม functions เหล่านี้ใน reportService.js หรือสร้าง exportService.js ใหม่

---

### 5. Data Structure ไม่ตรงกับ reportService

**ไฟล์**: [`frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx`](frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx:104)

**ปัญหา**: 
```javascript
const barChartData = data.monthlyTrend?.map(item => ({
    name: item.month,
    created: item.created,
    completed: item.completed
})) || [];
```

**สาเหตุ**: reportService.getReportData() return `monthlyTrend` แต่ structure อาจไม่ตรงกับที่คาดหวัง ต้องตรวจสอบ `calculateMonthlyTrend` function

**วิธีแก้ไข**: ตรวจสอบ structure ของ `monthlyTrend` จาก reportService และปรับ mapping ให้ตรงกัน

---

### 6. Missing statusDistribution ใน reportService

**ไฟล์**: [`frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx`](frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx:111)

**ปัญหา**: 
```javascript
const pieChartData = data.statusDistribution?.map(item => ({
    name: item.status,
    value: item.count
})) || [];
```

**สาเหตุ**: reportService.getReportData() return `byStatus` ไม่ใช่ `statusDistribution`

**วิธีแก้ไข**:
```javascript
const pieChartData = data.byStatus?.map(item => ({
    name: item.status,
    value: item.count
})) || [];
```

---

### 7. Missing slaReport ใน reportService

**ไฟล์**: [`frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx`](frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx:222)

**ปัญหา**: 
```javascript
<SLAReportTable
    data={data?.slaReport || []}
    ...
/>
```

**สาเหตุ**: reportService.getReportData() return `slaPerformance` ไม่ใช่ `slaReport`

**วิธีแก้ไข**:
```javascript
<SLAReportTable
    data={data?.slaPerformance || []}
    ...
/>
```

---

## 🟡 ข้อผิดพลาดที่ควรแก้ไข (Warnings)

### 8. Unused Import ใน FilterPanel.jsx

**ไฟล์**: [`frontend/src/modules/features/analytics/components/FilterPanel.jsx`](frontend/src/modules/features/analytics/components/FilterPanel.jsx:7)

**ปัญหา**: 
```javascript
import { useAuthStore } from '@core/stores/authStore';
```

**สาเหตุ**: `useAuthStore` ถูก import แต่ไม่ได้ใช้งาน

**วิธีแก้ไข**: ลบ import ที่ไม่ใช้ หรือใช้งานสำหรับ role-based filtering

---

### 9. Memory Leak ใน ExportButton.jsx

**ไฟล์**: [`frontend/src/modules/features/analytics/components/ExportButton.jsx`](frontend/src/modules/features/analytics/components/ExportButton.jsx:47)

**ปัญหา**: 
```javascript
if (typeof window !== 'undefined') {
    document.addEventListener('mousedown', handleClickOutside);
}
```

**สาเหตุ**: Event listener ถูกเพิ่มทุกครั้งที่ render แต่ไม่มีการ cleanup

**วิธีแก้ไข**:
```javascript
useEffect(() => {
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, []);
```

---

### 10. Infinite Loop Risk ใน useRealtimeAnalyticsWithRefetch

**ไฟล์**: [`frontend/src/modules/features/analytics/hooks/useRealtimeAnalytics.js`](frontend/src/modules/features/analytics/hooks/useRealtimeAnalytics.js:75)

**ปัญหา**: 
```javascript
const debouncedRefetch = useCallback(() => {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    const timer = setTimeout(() => {
        refetch();
    }, debounceMs);
    setDebounceTimer(timer);
}, [refetch, debounceMs, debounceTimer]); // debounceTimer ใน dependencies
```

**สาเหตุ**: `debounceTimer` อยู่ใน dependencies ของ `useCallback` ทำให้ function ถูกสร้างใหม่ทุกครั้งที่ timer เปลี่ยน

**วิธีแก้ไข**: ใช้ `useRef` แทน `useState` สำหรับ timer
```javascript
const debounceTimerRef = useRef(null);

const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
        refetch();
    }, debounceMs);
}, [refetch, debounceMs]);
```

---

### 11. Missing Error Handling ใน Export Functions

**ไฟล์**: [`frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx`](frontend/src/modules/features/analytics/pages/AnalyticsDashboard.jsx:64)

**ปัญหา**: 
```javascript
const handleExportPDF = async () => {
    setIsExporting(true);
    try {
        await reportService.exportDashboardToPDF(data, filters);
    } finally {
        setIsExporting(false);
    }
};
```

**สาเหตุ**: ไม่มี catch block สำหรับ error handling

**วิธีแก้ไข**:
```javascript
const handleExportPDF = async () => {
    setIsExporting(true);
    try {
        await reportService.exportDashboardToPDF(data, filters);
    } catch (error) {
        console.error('Export PDF failed:', error);
        // แสดง toast notification หรือ error message
    } finally {
        setIsExporting(false);
    }
};
```

---

## 🟢 ข้อแนะนำเพิ่มเติม (Recommendations)

### 12. เพิ่ม Loading State สำหรับ FilterPanel

**ไฟล์**: [`frontend/src/modules/features/analytics/components/FilterPanel.jsx`](frontend/src/modules/features/analytics/components/FilterPanel.jsx)

**ข้อแนะนำ**: เพิ่ม loading state สำหรับ dropdown options (projects, users) เพื่อ UX ที่ดีขึ้น

---

### 13. เพิ่ม Empty State สำหรับ Charts

**ไฟล์**: [`frontend/src/modules/features/analytics/components/PerformanceChart.jsx`](frontend/src/modules/features/analytics/components/PerformanceChart.jsx)

**ข้อแนะนำ**: เพิ่ม empty state เมื่อไม่มีข้อมูลสำหรับแสดงกราฟ

```javascript
if (!data || data.length === 0) {
    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="h-80 flex items-center justify-center text-gray-500">
                ไม่มีข้อมูลสำหรับแสดงกราฟ
            </div>
        </div>
    );
}
```

---

### 14. เพิ่ม Accessibility (a11y)

**ข้อแนะนำ**: เพิ่ม ARIA labels และ keyboard navigation สำหรับ components ต่างๆ

```javascript
// ExportButton.jsx
<button
    onClick={() => setIsOpen(!isOpen)}
    aria-expanded={isOpen}
    aria-haspopup="true"
    aria-label="Export options"
    ...
>
```

---

### 15. เพิ่ม Unit Tests

**ข้อแนะนำ**: สร้าง unit tests สำหรับ components และ hooks

```
frontend/src/modules/features/analytics/
├── __tests__/
│   ├── components/
│   │   ├── SummaryWidget.test.jsx
│   │   ├── TrendIndicator.test.jsx
│   │   ├── FilterPanel.test.jsx
│   │   ├── ExportButton.test.jsx
│   │   ├── PerformanceChart.test.jsx
│   │   └── SLAReportTable.test.jsx
│   ├── hooks/
│   │   ├── useAnalyticsData.test.js
│   │   └── useRealtimeAnalytics.test.js
│   └── pages/
│       └── AnalyticsDashboard.test.jsx
```

---

### 16. เพิ่ม TypeScript Types (Optional)

**ข้อแนะนำ**: หากต้องการ type safety สามารถเพิ่ม TypeScript types ได้

```typescript
// types/analytics.ts
export interface KPIData {
    totalDJ: number;
    onTimeRate: number;
    avgTurnaround: number;
    revisionRate: number;
}

export interface TrendData {
    totalJobsChange: number;
    onTimeRateChange: number;
    avgTurnaroundChange: number;
    revisionRateChange: number;
}

export interface AnalyticsFilters {
    period: string;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    projectId: string | null;
    assigneeId: string | null;
}
```

---

### 17. เพิ่ม Caching Strategy

**ข้อแนะนำ**: ใช้ React Query หรือ SWR สำหรับ caching และ data fetching

```javascript
// ใช้ React Query
import { useQuery } from '@tanstack/react-query';

export function useAnalyticsData(filters) {
    return useQuery({
        queryKey: ['analytics', filters],
        queryFn: () => reportService.getReportData(
            filters.period,
            filters.startDate,
            filters.endDate,
            filters
        ),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 30 * 60 * 1000, // 30 minutes
    });
}
```

---

### 18. เพิ่ม Error Boundary

**ข้อแนะนำ**: เพิ่ม Error Boundary สำหรับ catch errors ใน components

```javascript
// components/AnalyticsErrorBoundary.jsx
import { Component } from 'react';

class AnalyticsErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
                    <h2 className="font-bold">เกิดข้อผิดพลาด</h2>
                    <p>{this.state.error?.message}</p>
                </div>
            );
        }
        return this.props.children;
    }
}
```

---

### 19. เพิ่ม Performance Monitoring

**ข้อแนะนำ**: เพิ่ม performance monitoring สำหรับ track render times และ API calls

```javascript
// ใช้ React DevTools Profiler หรือ custom logging
useEffect(() => {
    const startTime = performance.now();
    
    return () => {
        const endTime = performance.now();
        console.log(`[Analytics] Render time: ${endTime - startTime}ms`);
    };
}, []);
```

---

### 20. เพิ่ม Responsive Design Testing

**ข้อแนะนำ**: ทดสอบ responsive design บนหน้าจอขนาดต่างๆ

- Mobile: 320px - 480px
- Tablet: 481px - 768px
- Desktop: 769px - 1024px
- Large Desktop: 1025px+

---

## 📋 สรุปการดำเนินการ

### ต้องแก้ไขทันที (Critical)
1. ✅ แก้ไข import path ใน SummaryWidget.jsx
2. ✅ แก้ไข useRealtime hook ใน useRealtimeAnalytics.js
3. ✅ แก้ไข API method ใน useAnalyticsData.js
4. ✅ เพิ่ม export functions ใน reportService.js
5. ✅ แก้ไข data structure mapping ใน AnalyticsDashboard.jsx

### ควรแก้ไข (Warnings)
6. ⚠️ ลบ unused import ใน FilterPanel.jsx
7. ⚠️ แก้ไข memory leak ใน ExportButton.jsx
8. ⚠️ แก้ไข infinite loop risk ใน useRealtimeAnalytics.js
9. ⚠️ เพิ่ม error handling ใน export functions

### ข้อแนะนำ (Recommendations)
10. 💡 เพิ่ม loading state สำหรับ FilterPanel
11. 💡 เพิ่ม empty state สำหรับ Charts
12. 💡 เพิ่ม accessibility (a11y)
13. 💡 เพิ่ม unit tests
14. 💡 เพิ่ม TypeScript types (optional)
15. 💡 เพิ่ม caching strategy
16. 💡 เพิ่ม error boundary
17. 💡 เพิ่ม performance monitoring
18. 💡 เพิ่ม responsive design testing

---

## 📝 หมายเหตุ

รายงานนี้จัดทำขึ้นจากการตรวจสอบ code โดยไม่ได้ run application จริง ควรทดสอบ application หลังจากแก้ไขข้อผิดพลาดทั้งหมดแล้ว
