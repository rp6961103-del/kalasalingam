import { Router } from 'express';
import { StatsController } from '../controllers/statsController';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticatedApiRateLimit } from '../middleware/persistentRateLimit';

const router = Router();

router.use(authenticate, authenticatedApiRateLimit);
router.get('/', asyncHandler(StatsController.getStats));

export default router;
