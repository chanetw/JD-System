import ProtectedRoute from '@core/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';

export { Dashboard };

/**
 * Routes สำหรับ Dashboard Module
 */
export const routes = [
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        ),
        title: 'Dashboard',
        roles: ['admin', 'manager', 'supervisor', 'requester', 'assignee', 'approver']
    }
];
