import { Router } from 'express';
import { submitInquiry, getMyInquiries, updateInquiryStatus, markInquiryViewed } from '../controllers/inquiryController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth(['BUYER']), submitInquiry);
router.get('/mine', requireAuth(['ARTISAN', 'BUYER']), getMyInquiries);
router.patch('/:id/status', requireAuth(['ARTISAN']), updateInquiryStatus);
router.patch('/:id/view', requireAuth(['ARTISAN']), markInquiryViewed);

export default router;

