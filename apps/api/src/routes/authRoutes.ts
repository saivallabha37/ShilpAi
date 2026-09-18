import { Router } from 'express';
import { requestOtp, verifyOtp, registerBuyer, loginBuyer, me } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/artisan/otp/request', requestOtp);
router.post('/artisan/otp/verify', verifyOtp);
router.post('/buyer/register', registerBuyer);
router.post('/buyer/login', loginBuyer);
router.get('/me', requireAuth(), me);

export default router;

