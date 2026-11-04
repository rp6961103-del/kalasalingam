import { Router } from 'express';
import { WorkerController } from '../controllers/workerController';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticatedApiRateLimit } from '../middleware/persistentRateLimit';

const router = Router();

router.use(authenticate, authenticatedApiRateLimit);
router.get('/', asyncHandler(WorkerController.list));
router.get('/:id', asyncHandler(WorkerController.getById));

export default router;
