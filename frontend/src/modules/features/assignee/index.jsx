import { lazy } from 'react';

const MyQueue = lazy(() => import('./pages/MyQueue'));

export const routes = [
    {
        path: 'assignee/my-queue',
        element: <MyQueue />,
        title: 'คิวงานของฉัน',
        roles: ['Assignee', 'Admin', 'Requester', 'Approver', 'graphic', 'editor'] // V1: Admin, Requester, Approver can also view
    }
];
