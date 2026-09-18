import { Router } from 'express';
import { getCraftCategories, getMyProfile, updateMyProfile, getArtisanProfile } from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/craft-categories', getCraftCategories);
router.get('/me', requireAuth(['ARTISAN']), getMyProfile);
router.put('/me', requireAuth(['ARTISAN']), updateMyProfile);
router.get('/:artisanId', requireAuth(['BUYER']), getArtisanProfile);

export default router;

