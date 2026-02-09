import { lazy } from 'react';

const MyQueue = lazy(() => import('./pages/MyQueue'));

export const routes = [
    {
        path: 'assignee/my-queue',
        element: <MyQueue />,
        title: 'คิวงานของฉัน',
        roles: ['Member', 'assignee', 'admin', 'SuperAdmin', 'OrgAdmin', 'graphic', 'editor'] // Restricted to pure work recipients and admins
    }
];
