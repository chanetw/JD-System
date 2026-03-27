/**
 * @file EmailSettings.jsx
 * @description หน้าจัดการ Email Settings (CC emails แยกตามประเภท)
 * 
 * Features:
 * - แสดงรายการ email notification types ทั้งหมด
 * - เปิด/ปิดการแจ้งเตือนแต่ละประเภท
 * - เพิ่ม/ลบ CC emails สำหรับแต่ละประเภท
 * - ทดสอบส่ง email
 * - Admin only
 */

import { useState, useEffect } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import httpClient from '@shared/services/httpClient';
import { isAdmin as checkIsAdmin } from '@shared/utils/permission.utils';

export default function EmailSettings() {
  const { user } = useAuthStoreV2();
  const [emailSettings, setEmailSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(null); // Track which type is being tested
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [expandedType, setExpandedType] = useState(null);

  // ตรวจสอบว่าเป็น Admin หรือไม่ (รองรับทั้ง V1: user.roles[] และ V2: user.roleName)
  const isAdmin = checkIsAdmin(user);

  // โหลดข้อมูล Email Settings
  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      setLoading(true);
      const response = await httpClient.get('/email-settings');
      if (response.data.success) {
        setEmailSettings(response.data.data.emailSettings);
      }
    } catch (error) {
      console.error('[Email Settings] Fetch error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateEmailSetting = async (type, enabled, ccEmails) => {
    try {
      setSaving(true);
      const response = await httpClient.put(`/email-settings/${type}`, {
        enabled,
        ccEmails
      });
      
      if (response.data.success) {
        // อัปเดต state
        setEmailSettings(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            enabled,
            ccEmails
          }
        }));
        showToast('บันทึกการตั้งค่าสำเร็จ', 'success');
      }
    } catch (error) {
      console.error('[Email Settings] Update error:', error);
      showToast(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = (type) => {
    const setting = emailSettings[type];
    updateEmailSetting(type, !setting.enabled, setting.ccEmails);
  };

  const handleAddEmail = (type, email) => {
    const setting = emailSettings[type];
    if (!email || !email.trim()) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('รูปแบบอีเมลไม่ถูกต้อง', 'error');
      return;
    }

    // Check duplicate
    if (setting.ccEmails.includes(email)) {
      showToast('อีเมลนี้มีอยู่แล้ว', 'error');
      return;
    }

    // Check limit
    if (setting.ccEmails.length >= 10) {
      showToast('จำนวน CC emails เกินกำหนด (สูงสุด 10 emails)', 'error');
      return;
    }

    const newCcEmails = [...setting.ccEmails, email];
    updateEmailSetting(type, setting.enabled, newCcEmails);
  };

  const handleRemoveEmail = (type, emailToRemove) => {
    const setting = emailSettings[type];
    const newCcEmails = setting.ccEmails.filter(email => email !== emailToRemove);
    updateEmailSetting(type, setting.enabled, newCcEmails);
  };

  const handleTestEmail = async (type) => {
    try {
      setTestingEmail(type);
      const response = await httpClient.post(`/email-settings/${type}/test`);
      if (response.data.success) {
        showToast('ส่ง test email สำเร็จ', 'success');
      }
    } catch (error) {
      console.error('[Email Settings] Test email error:', error);
      showToast(error.response?.data?.message || 'เกิดข้อผิดพลาดในการส่ง test email', 'error');
    } finally {
      setTestingEmail(null);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // ถ้าไม่ใช่ Admin
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">⛔ คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-red-600 text-sm mt-1">เฉพาะ Admin เท่านั้นที่สามารถจัดการ Email Settings ได้</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📧 Email Settings</h1>
        <p className="text-gray-600 mt-1">จัดการ CC emails สำหรับการแจ้งเตือนแต่ละประเภท</p>
      </div>

      {/* Email Settings List */}
      <div className="space-y-4">
        {Object.entries(emailSettings).map(([type, setting]) => (
          <EmailSettingCard
            key={type}
            type={type}
            setting={setting}
            expanded={expandedType === type}
            onToggleExpand={() => setExpandedType(expandedType === type ? null : type)}
            onToggleEnabled={() => handleToggleEnabled(type)}
            onAddEmail={(email) => handleAddEmail(type, email)}
            onRemoveEmail={(email) => handleRemoveEmail(type, email)}
            onTestEmail={() => handleTestEmail(type)}
            saving={saving}
            testingEmail={testingEmail === type}
          />
        ))}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Email Setting Card Component
 */
function EmailSettingCard({ type, setting, expanded, onToggleExpand, onToggleEnabled, onAddEmail, onRemoveEmail, onTestEmail, saving, testingEmail }) {
  const [newEmail, setNewEmail] = useState('');

  const handleAddClick = () => {
    if (newEmail.trim()) {
      onAddEmail(newEmail.trim());
      setNewEmail('');
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700'
    };
    const labels = {
      high: 'สูง',
      medium: 'ปานกลาง',
      low: 'ต่ำ'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={onToggleExpand}>
        <div className="flex items-center gap-4 flex-1">
          {/* Toggle Switch */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled();
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              setting.enabled ? 'bg-rose-600' : 'bg-gray-300'
            }`}
            disabled={saving}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                setting.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{setting.label}</h3>
              {getPriorityBadge(setting.priority)}
              {setting.ccEmails.length > 0 && (
                <span className="text-xs text-gray-500">({setting.ccEmails.length} emails)</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{setting.description}</p>
          </div>

          {/* Expand Icon */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {/* CC Emails List */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">CC Emails</label>
            {setting.ccEmails.length === 0 ? (
              <p className="text-sm text-gray-500 italic">ยังไม่มี CC emails</p>
            ) : (
              <div className="space-y-2">
                {setting.ccEmails.map((email, index) => (
                  <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      onClick={() => onRemoveEmail(email)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                      disabled={saving}
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Email Form */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">เพิ่ม CC Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddClick()}
                placeholder="example@email.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                disabled={saving || setting.ccEmails.length >= 10}
              />
              <button
                onClick={handleAddClick}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving || !newEmail.trim() || setting.ccEmails.length >= 10}
              >
                เพิ่ม
              </button>
            </div>
            {setting.ccEmails.length >= 10 && (
              <p className="text-xs text-red-600 mt-1">จำนวน CC emails ถึงขีดจำกัดแล้ว (สูงสุด 10 emails)</p>
            )}
          </div>

          {/* Test Email Button */}
          <button
            onClick={onTestEmail}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={saving || testingEmail || !setting.enabled || setting.ccEmails.length === 0}
          >
            {testingEmail ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>กำลังส่ง Email...</span>
              </>
            ) : (
              <>
                <span>📨</span>
                <span>ทดสอบส่ง Email</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
