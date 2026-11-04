import { Router } from 'express';
import { SchemaController } from '../controllers/schemaController';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticatedApiRateLimit } from '../middleware/persistentRateLimit';

const router = Router();

router.use(authenticate, authenticatedApiRateLimit, requireRole('Management'));
router.get('/', asyncHandler(SchemaController.getMetadata));
router.get('/:table', asyncHandler(SchemaController.getTableRows));

export default router;
