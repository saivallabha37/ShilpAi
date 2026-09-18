import { Router } from 'express';
import { createProduct, getMyProducts, getProductDetail, updateProduct, submitProduct, publishProduct, listPublicProducts, addImage } from '../controllers/productController';
import { processVoiceInput } from '../controllers/voiceController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Artisan routes
router.post('/', requireAuth(['ARTISAN']), createProduct);
router.get('/mine', requireAuth(['ARTISAN']), getMyProducts);
router.put('/:id', requireAuth(['ARTISAN']), updateProduct);
router.post('/:id/images', requireAuth(['ARTISAN']), addImage);
router.post('/:id/voice', requireAuth(['ARTISAN']), processVoiceInput);
router.post('/:id/submit', requireAuth(['ARTISAN']), submitProduct);
router.post('/:id/publish', requireAuth(['ARTISAN']), publishProduct);
// Unpublish, archive, image upload omitted for brevity but follow the same pattern

// Buyer/Public routes
router.get('/', requireAuth(['BUYER']), listPublicProducts);
router.get('/:id', requireAuth(['ARTISAN', 'BUYER']), getProductDetail);

export default router;
