/**
 * Pending Approvals Page for Admin
 *
 * Allows admins to view, approve, or reject pending user registrations.
 */

import React, { useEffect, useState } from 'react';
import { useAuthStoreV2, usePendingUsers, useRegistrationCounts, useIsOrgAdmin } from '../../../core/stores/authStoreV2';

// Role options for assignment during approval (V1 naming)
const ROLE_OPTIONS = [
  { value: 'Assignee', label: 'Assignee (Basic access)' },
  { value: 'Approver', label: 'Approver (Approval access)' },
  { value: 'Requester', label: 'Requester (Full access)' },
];

const PendingApprovals: React.FC = () => {
  const {
    fetchPendingUsers,
    fetchRegistrationCounts,
    approveUser,
    rejectUser,
    isLoading,
    error,
    clearError,
  } = useAuthStoreV2();

  const pendingUsers = usePendingUsers();
  const registrationCounts = useRegistrationCounts();
  const isOrgAdmin = useIsOrgAdmin();

  // Local state for approval modal
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState('Member');
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Local state for rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Local state for action feedback
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local state for password display modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [approvedUserInfo, setApprovedUserInfo] = useState<{
    email: string;
    temporaryPassword: string;
    displayName: string;
    emailSent: boolean;
  } | null>(null);

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

  // Handle approve button click
  const handleApproveClick = (userId: number) => {
    setSelectedUser(userId);
    setSelectedRole('Member');
    setShowApproveModal(true);
  };

  // Handle reject button click
  const handleRejectClick = (userId: number) => {
    setSelectedUser(userId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Confirm approval
  const handleConfirmApprove = async () => {
    if (!selectedUser) return;

    try {
      // Get user info before approval
      const userToApprove = pendingUsers.find(u => u.id === selectedUser);

      // Call approve API - this returns the temporary password
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('auth_token_v2');
      const response = await fetch(`${API_URL}/api/v2/admin/approve-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: selectedUser, roleName: selectedRole })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve');
      }

      // Store the result to show in modal
      setApprovedUserInfo({
        email: data.data.email,
        temporaryPassword: data.data.temporaryPassword,
        displayName: data.data.displayName || `${userToApprove?.firstName} ${userToApprove?.lastName}`,
        emailSent: data.data.emailSent || false
      });

      setShowApproveModal(false);
      setSelectedUser(null);
      setShowPasswordModal(true);

      // Refresh the list
      fetchPendingUsers();
      fetchRegistrationCounts();

    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to approve user' });
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500">Review and approve user registration requests</p>
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
        <div className={`px-4 py-3 rounded-lg ${
          actionMessage.type === 'success'
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

      {/* Pending Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-400 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-400">
          <h2 className="text-lg font-semibold text-gray-900">
            Pending Registration Requests ({pendingUsers.length})
          </h2>
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
            <p className="text-gray-500">No pending registration requests</p>
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
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
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
                          <p className="text-sm text-gray-500">{user.displayName}</p>
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
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApproveClick(user.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(user.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
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

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-400">
              <h3 className="text-lg font-semibold text-gray-900">Approve Registration</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Assign a role to this user before approving:
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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

      {/* Approval Success Modal */}
      {showPasswordModal && approvedUserInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-400 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">อนุมัติสำเร็จ!</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                ผู้ใช้ <span className="font-semibold">{approvedUserInfo.displayName}</span> ได้รับการอนุมัติแล้ว
              </p>

              {approvedUserInfo.emailSent ? (
                // Email sent successfully
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        ส่งอีเมลแจ้งเตือนแล้ว!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        ระบบได้ส่งรหัสผ่านชั่วคราวไปที่ <strong>{approvedUserInfo.email}</strong> เรียบร้อยแล้ว
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Email failed - show password for manual sharing
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ ส่งอีเมลไม่สำเร็จ - กรุณาส่งข้อมูลด้านล่างให้ผู้ใช้
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-yellow-700">อีเมล:</p>
                      <p className="font-mono text-sm bg-white px-2 py-1 rounded border">{approvedUserInfo.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-yellow-700">รหัสผ่านชั่วคราว:</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm bg-white px-2 py-1 rounded border flex-1 select-all">
                          {approvedUserInfo.temporaryPassword}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(approvedUserInfo.temporaryPassword);
                            setActionMessage({ type: 'success', text: 'คัดลอกรหัสผ่านแล้ว!' });
                          }}
                          className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 rounded"
                        >
                          คัดลอก
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p>ผู้ใช้จะต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end rounded-b-xl">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setApprovedUserInfo(null);
                  setActionMessage({ type: 'success', text: 'User approved successfully!' });
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
