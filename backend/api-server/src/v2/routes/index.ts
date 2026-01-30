/**
 * V2 API Routes Index
 *
 * Central router that combines all v2 route modules.
 */

import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// Health check for v2 API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'V2 Auth API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
