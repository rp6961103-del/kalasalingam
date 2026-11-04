import { Router } from 'express';
import { SmsController } from '../controllers/smsController';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticatedApiRateLimit, authenticatedMutationRateLimit } from '../middleware/persistentRateLimit';

const router = Router();

router.get('/sms', authenticate, authenticatedApiRateLimit, asyncHandler(SmsController.listLogs));
router.get('/notifications', authenticate, authenticatedApiRateLimit, asyncHandler(SmsController.listNotifications));
router.post('/notifications/read', authenticate, authenticatedApiRateLimit, authenticatedMutationRateLimit, asyncHandler(SmsController.markNotificationsRead));

export default router;
