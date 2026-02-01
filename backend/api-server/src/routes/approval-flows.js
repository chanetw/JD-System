/**
 * @file approval-flows.js
 * @description Approval Flows Configuration Routes
 * 
 * Features:
 * - Get/Save Approval Flows
 * - Get/Save Assignment Matrix
 */

import express from 'express';
import ApprovalService from '../services/approvalService.js';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';

const router = express.Router();
const approvalService = new ApprovalService();

router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/approval-flows
 * @query {number} projectId
 */
router.get('/', async (req, res) => {
    try {
        const { projectId } = req.query;
        if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required' });

        console.log(`[API] GET /api/approval-flows?projectId=${projectId}`);
        const flow = await approvalService.getApprovalFlowByProject(projectId);
        console.log('[API] Retrieved flows:', JSON.stringify(flow, null, 2));

        // Transform to expected format if needed by frontend, or frontend adapts
        // Frontend expects levels array. Service returns object with levels.

        // If null, return empty structure or null
        const result = flow || { projectId, levels: [], includeTeamLead: false, teamLeadId: null };

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[ApprovalFlows] Get error:', error);
        res.status(500).json({ success: false, message: 'Failed to get flows' });
    }
});

/**
 * POST /api/approval-flows
 * @body {number} projectId
 * @body {object} flowData - { levels: [...], includeTeamLead, teamLeadId }
 */
router.post('/', async (req, res) => {
    try {
        console.log('---------------------------------------------------');
        console.log('[API] POST /api/approval-flows');
        console.log('[API] Payload:', JSON.stringify(req.body, null, 2));
        console.log('---------------------------------------------------');
        const { projectId, ...flowData } = req.body;
        const tenantId = req.user.tenantId;

        if (!projectId) {
            return res.status(400).json({ success: false, message: 'projectId is required' });
        }

        // Pass tenantId along with flowData
        const result = await approvalService.saveApprovalFlow(projectId, { ...flowData, tenantId });
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[ApprovalFlows] Save error:', error);
        res.status(500).json({ success: false, message: 'Failed to save flows: ' + error.message });
    }
});

/**
 * GET /api/approval-flows/matrix
 * @query {number} projectId
 */
router.get('/matrix', async (req, res) => {
    try {
        const { projectId } = req.query;
        if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required' });

        const result = await approvalService.getAssignmentMatrix(projectId);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[ApprovalFlows] Get matrix error:', error);
        res.status(500).json({ success: false, message: 'Failed to get matrix' });
    }
});

/**
 * POST /api/approval-flows/bulk-from-assignments
 * Create multiple flows based on project job assignments
 * Automatically uses assignee from project_job_assignments table
 *
 * @body {number} projectId
 * @body {Array<number>} jobTypeIds - List of job type IDs to create flows for
 * @body {boolean} skipApproval - Whether to skip approval
 * @body {string} name - Flow name prefix
 */
router.post('/bulk-from-assignments', async (req, res) => {
    try {
        const { projectId, jobTypeIds, skipApproval, name } = req.body;
        const tenantId = req.user.tenantId;

        if (!projectId || !jobTypeIds || jobTypeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'projectId และ jobTypeIds required'
            });
        }

        const result = await approvalService.createBulkFlowsFromAssignments({
            tenantId,
            projectId: parseInt(projectId),
            jobTypeIds: jobTypeIds.map(id => parseInt(id)),
            skipApproval: !!skipApproval,
            name: name || 'Approval Flow'
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[ApprovalFlows] Bulk create error:', error);
        res.status(500).json({ success: false, message: 'Failed to create flows: ' + error.message });
    }
});

/**
 * POST /api/approval-flows/matrix
 * @body {number} projectId
 * @body {Array} assignments
 */
router.post('/matrix', async (req, res) => {
    try {
        const { projectId, assignments } = req.body;
        const result = await approvalService.saveAssignmentMatrix(projectId, assignments);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[ApprovalFlows] Save matrix error:', error);
        res.status(500).json({ success: false, message: 'Failed to save matrix' });
    }
});

export default router;
