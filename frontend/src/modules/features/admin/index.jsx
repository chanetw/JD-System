import React from 'react';

// Pages
import UserManagement from './pages/UserManagement';
import JobTypeSLA from './pages/JobTypeSLA';
import JobTypeItems from './pages/JobTypeItems';
import OrganizationManagement from './pages/OrganizationManagement';
import ReportsDashboard from './pages/ReportsDashboard';
import Reports from './pages/Reports';
import NotificationSettings from './pages/NotificationSettings';
import HolidayCalendar from './pages/HolidayCalendar';
import ApprovalFlow from './pages/ApprovalFlow';

export const adminRoutes = [
    {
        path: 'admin/users',
        element: <UserManagement />,
        title: 'User Management',
        roles: ['admin'] // Optional: For future Sidebar generation
    },
    {
        path: 'admin/job-types',
        element: <JobTypeSLA />,
        title: 'Job Types & SLA'
    },
    {
        path: 'admin/job-type-items',
        element: <JobTypeItems />,
        title: 'Job Type Items'
    },
    {
        path: 'admin/organization',
        element: <OrganizationManagement />,
        title: 'Organization'
    },
    {
        path: 'admin/reports-v1',
        element: <ReportsDashboard />,
        title: 'Reports V1'
    },
    {
        path: 'admin/reports',
        element: <Reports />,
        title: 'Reports'
    },
    {
        path: 'admin/notifications',
        element: <NotificationSettings />,
        title: 'Notification Settings'
    },
    {
        path: 'admin/holidays',
        element: <HolidayCalendar />,
        title: 'Holiday Calendar'
    },
    {
        path: 'admin/approval-flow',
        element: <ApprovalFlow />,
        title: 'Approval Flow'
    }
];

export default {
    name: 'admin',
    routes: adminRoutes
};
