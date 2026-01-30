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

        const flow = await approvalService.getApprovalFlowByProject(projectId);
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
        const { projectId, ...flowData } = req.body;
        // flowData includes levels, includeTeamLead, etc.

        // Validation?

        const result = await approvalService.saveApprovalFlow(projectId, flowData);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[ApprovalFlows] Save error:', error);
        res.status(500).json({ success: false, message: 'Failed to save flows' });
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
