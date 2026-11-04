import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticatedApiRateLimit, persistentRateLimit } from '../middleware/persistentRateLimit';

const router = Router();

router.post('/login', persistentRateLimit('login', 10, 15 * 60_000), asyncHandler(AuthController.login));
router.post('/register', persistentRateLimit('registration', 5, 60 * 60_000), asyncHandler(AuthController.register));
router.post('/bootstrap-management', persistentRateLimit('management-bootstrap', 3, 60 * 60_000), asyncHandler(AuthController.bootstrapManagement));
router.post('/send-otp', persistentRateLimit('otp', 5, 15 * 60_000), AuthController.sendOtp);
router.get('/me', authenticate, authenticatedApiRateLimit, asyncHandler(AuthController.me));
router.post('/logout', persistentRateLimit('logout', 30, 60_000), asyncHandler(AuthController.logout));

export default router;
