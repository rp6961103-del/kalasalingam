import { Router } from 'express';
import { IssueController } from '../controllers/issueController';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticatedApiRateLimit, authenticatedMutationRateLimit } from '../middleware/persistentRateLimit';

const router = Router();

router.use(authenticate, authenticatedApiRateLimit);
router.get('/', asyncHandler(IssueController.list));
router.get('/:id', asyncHandler(IssueController.getById));
router.post('/', authenticatedMutationRateLimit, asyncHandler(IssueController.create));
router.post('/:id/vote', authenticatedMutationRateLimit, asyncHandler(IssueController.vote));
router.patch('/:id/status', authenticatedMutationRateLimit, asyncHandler(IssueController.updateStatus));

export default router;
