/**
 * Pending Approvals Page for Admin
 *
 * Allows admins to view, approve, or reject pending user registrations.
 */

import React, { useEffect, useState } from 'react';
import { useAuthStoreV2, usePendingUsers, useRegistrationCounts, useIsOrgAdmin } from '../../../core/stores/authStoreV2';



const PendingApprovals: React.FC = () => {
  const {
    fetchPendingUsers,
    fetchRegistrationCounts,
    rejectUser,
    isLoading,
    error,
    clearError,
  } = useAuthStoreV2();

  const pendingUsers = usePendingUsers();
  const registrationCounts = useRegistrationCounts();
  const isOrgAdmin = useIsOrgAdmin();

  // Local state for rejection modal
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Local state for action feedback
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch data on mount
  useEffect(() => {
    if (isOrgAdmin) {
      fetchPendingUsers();
      fetchRegistrationCounts();
    }
  }, [fetchPendingUsers, fetchRegistrationCounts, isOrgAdmin]);

  // Clear error on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Clear action message after 3 seconds
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Handle reject button click
  const handleRejectClick = (userId: number) => {
    setSelectedUser(userId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Confirm rejection
  const handleConfirmReject = async () => {
    if (!selectedUser) return;

    try {
      await rejectUser(selectedUser, rejectionReason || 'Registration rejected by admin');
      setActionMessage({ type: 'success', text: 'User rejected successfully!' });
      setShowRejectModal(false);
      setSelectedUser(null);
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to reject user' });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Access check
  if (!isOrgAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registration Monitor</h1>
          <p className="text-gray-500">ติดตามการสมัครใหม่ — ผู้ใช้จะ Active เป็น Requester (HO) ทันที</p>
        </div>
        <button
          onClick={() => {
            fetchPendingUsers();
            fetchRegistrationCounts();
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-800">
          <p className="font-semibold">ระบบสมัครสมาชิกใหม่ (Auto-Activate)</p>
          <p className="mt-0.5">ผู้สมัครใหม่จะได้รับสิทธิ์ <strong>Requester</strong> พร้อม Scope <strong>โครงการ HO</strong> ทันทีโดยอัตโนมัติ ไม่ต้องรออนุมัติ<br />
          หากต้องการเปลี่ยนบทบาทหรือขอบเขต ไปที่{' '}
          <a href="/admin/users" className="underline font-medium hover:text-blue-900">User Management</a>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {registrationCounts && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{registrationCounts.PENDING}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">Approved</p>
            <p className="text-2xl font-bold text-green-900">{registrationCounts.APPROVED}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">Rejected</p>
            <p className="text-2xl font-bold text-red-900">{registrationCounts.REJECTED}</p>
          </div>
          <div className="bg-gray-50 border border-gray-400 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{registrationCounts.total}</p>
          </div>
        </div>
      )}

      {/* Action Message */}
      {actionMessage && (
        <div className={`px-4 py-3 rounded-lg ${actionMessage.type === 'success'
          ? 'bg-green-50 border border-green-200 text-green-700'
          : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
          {actionMessage.text}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Registrations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-400 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-400 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Registrations ({pendingUsers.length})
          </h2>
          <a
            href="/admin/users"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            จัดการสิทธิ์ใน User Management
          </a>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">ยังไม่มีผู้สมัครใหม่</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Registered</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Role (Default)</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-medium">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.firstName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.departmentName || <span className="text-gray-400">Not specified</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(user.registeredAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Requester · HO
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href="/admin/users"
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          จัดการสิทธิ์
                        </a>
                        <button
                          onClick={() => handleRejectClick(user.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          ปิดใช้งาน
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-400">
              <h3 className="text-lg font-semibold text-gray-900">Reject Registration</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Please provide a reason for rejection (optional):
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter rejection reason..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PendingApprovals;
