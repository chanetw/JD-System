/**
 * @file draftReadLogService.js
 * @description Service สำหรับจัดการ Draft Read Logs
 */

import httpClient from '../httpClient';

export const draftReadLogService = {
  /**
   * บันทึกการเปิดอ่าน Draft Submission
   * @param {number} jobId - Job ID
   * @returns {Promise} Response data
   */
  recordRead: async (jobId) => {
    try {
      const response = await httpClient.post(`/draft-read-logs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('[Draft Read Log] Error recording read:', error);
      throw error;
    }
  },

  /**
   * บันทึกการเปิดดู Draft Attachment
   * @param {number} jobId - Job ID
   * @param {number} attachmentId - Attachment ID
   * @returns {Promise} Response data
   */
  recordAttachmentView: async (jobId, attachmentId) => {
    try {
      const response = await httpClient.post(`/draft-read-logs/${jobId}/files/${attachmentId}/view`);
      return response.data;
    } catch (error) {
      console.error('[Draft Read Log] Error recording attachment view:', error);
      throw error;
    }
  },

  /**
   * ดึงข้อมูล Read Logs ของ Job
   * @param {number} jobId - Job ID
   * @returns {Promise} Response data
   */
  getReadLogs: async (jobId) => {
    try {
      const response = await httpClient.get(`/draft-read-logs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('[Draft Read Log] Error fetching logs:', error);
      throw error;
    }
  },

  /**
   * เช็คว่า Requester อ่าน Draft แล้วหรือยัง
   * @param {number} jobId - Job ID
   * @returns {Promise} Response data with hasRead status
   */
  checkReadStatus: async (jobId) => {
    try {
      const response = await httpClient.get(`/draft-read-logs/${jobId}/status`);
      return response.data;
    } catch (error) {
      console.error('[Draft Read Log] Error checking status:', error);
      throw error;
    }
  }
};

export default draftReadLogService;
