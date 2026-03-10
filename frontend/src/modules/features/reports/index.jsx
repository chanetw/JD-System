/**
 * @file index.jsx
 * @description Reports Module Registry
 */

import { lazy } from 'react';

const ReportsPage = lazy(() => import('./pages/ReportsPage'));

export const routes = [
  {
    path: '/reports',
    element: <ReportsPage />,
    roles: ['admin', 'superadmin'], // Admin เห็นทุกคน, User เห็นแค่ตัวเอง (logic ใน component)
    title: 'รายงานผลงานรายบุคคล'
  }
];
