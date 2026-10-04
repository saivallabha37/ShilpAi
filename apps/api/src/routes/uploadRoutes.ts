import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { saveMediaFile } from '../utils/storage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

const router = Router();

// Upload a single file (image or audio)
router.post('/', requireAuth(), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'No file provided' } });
    }

    const folder = (req.body.folder as string) || 'products';
    const result = await saveMediaFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    return res.json({
      url: result.url,
      storageType: result.storageType,
      filename: result.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: error.message || 'File upload failed' } });
  }
});

// Upload multiple files (e.g. up to 5 product photos)
router.post('/multiple', requireAuth(), upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: { code: 'FILES_REQUIRED', message: 'No files provided' } });
    }

    const folder = (req.body.folder as string) || 'products';
    const results = await Promise.all(
      files.map((file) =>
        saveMediaFile(file.buffer, file.originalname, file.mimetype, folder)
      )
    );

    return res.json({
      files: results.map((r, i) => ({
        url: r.url,
        storageType: r.storageType,
        filename: r.filename,
        mimeType: files[i].mimetype,
        size: files[i].size,
      })),
    });
  } catch (error: any) {
    console.error('Multiple file upload error:', error);
    return res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: error.message || 'Upload failed' } });
  }
});

export default router;
