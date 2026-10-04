import { Router } from 'express';
import multer from 'multer';
import { createProduct, getMyProducts, getProductDetail, updateProduct, submitProduct, publishProduct, listPublicProducts, addImage } from '../controllers/productController';
import { processVoiceInput } from '../controllers/voiceController';
import { requireAuth } from '../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();

// Artisan product operations
router.post('/', requireAuth(['ARTISAN']), createProduct);
router.get('/mine', requireAuth(['ARTISAN']), getMyProducts);
router.put('/:id', requireAuth(['ARTISAN']), updateProduct);
router.post('/:id/images', requireAuth(['ARTISAN']), upload.single('file'), addImage);
router.post('/:id/voice', requireAuth(['ARTISAN']), upload.single('file'), processVoiceInput);
router.post('/:id/submit', requireAuth(['ARTISAN']), submitProduct);
router.post('/:id/publish', requireAuth(['ARTISAN']), publishProduct);

// Public / Buyer marketplace discovery
router.get('/', listPublicProducts);
router.get('/:id', getProductDetail);

export default router;
