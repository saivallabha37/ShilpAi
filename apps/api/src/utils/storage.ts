import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://localhost:9000';
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY || 'minioadmin';
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY || 'minioadmin';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'shilpai-storage';
const STORAGE_REGION = process.env.STORAGE_REGION || 'us-east-1';

let s3Client: S3Client | null = null;
try {
  s3Client = new S3Client({
    endpoint: STORAGE_ENDPOINT,
    region: STORAGE_REGION,
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY,
      secretAccessKey: STORAGE_SECRET_KEY,
    },
    forcePathStyle: true,
  });
} catch (e) {
  console.warn('S3 client initialization failed, falling back to local file storage.');
}

export interface UploadResult {
  url: string;
  storageType: 's3' | 'local';
  filename: string;
}

export const saveMediaFile = async (
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder = 'products'
): Promise<UploadResult> => {
  const ext = path.extname(originalFilename) || (mimeType.includes('audio') ? '.m4a' : '.jpg');
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

  // Try S3 first if client exists
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: uniqueName,
          Body: buffer,
          ContentType: mimeType,
        })
      );
      const s3Url = `${STORAGE_ENDPOINT}/${STORAGE_BUCKET}/${uniqueName}`;
      return {
        url: s3Url,
        storageType: 's3',
        filename: uniqueName,
      };
    } catch (err) {
      console.warn('S3 upload failed, falling back to local disk storage:', err);
    }
  }

  // Local fallback: save to disk & serve via static route
  const targetFolder = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const localFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
  const filePath = path.join(targetFolder, localFilename);
  fs.writeFileSync(filePath, buffer);

  const port = process.env.PORT || 3000;
  const localUrl = `http://localhost:${port}/uploads/${folder}/${localFilename}`;

  return {
    url: localUrl,
    storageType: 'local',
    filename: localFilename,
  };
};
