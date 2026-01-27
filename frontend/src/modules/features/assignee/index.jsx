import { lazy } from 'react';

const MyQueue = lazy(() => import('./pages/MyQueue'));

export const routes = [
    {
        path: 'assignee/my-queue',
        element: <MyQueue />,
        title: 'คิวงานของฉัน',
        roles: ['assignee', 'graphic', 'editor'] // Allow relevant roles
    }
];
