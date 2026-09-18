import os
import io
import time
import json
import psycopg2
import boto3
from PIL import Image, ImageEnhance
from rembg import remove
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost:5432/shilpai?schema=public")
# psycopg2 doesn't support the ?schema= query param used by Prisma
if "?" in DB_URL:
    DB_URL = DB_URL.split("?")[0]

STORAGE_ENDPOINT = os.environ.get("STORAGE_ENDPOINT", "http://localhost:9000")
STORAGE_ACCESS_KEY = os.environ.get("STORAGE_ACCESS_KEY", "minioadmin")
STORAGE_SECRET_KEY = os.environ.get("STORAGE_SECRET_KEY", "minioadmin")
STORAGE_BUCKET = os.environ.get("STORAGE_BUCKET", "shilpai-storage")

s3 = boto3.client(
    's3',
    endpoint_url=STORAGE_ENDPOINT,
    aws_access_key_id=STORAGE_ACCESS_KEY,
    aws_secret_access_key=STORAGE_SECRET_KEY,
)

def ensure_bucket():
    try:
        s3.head_bucket(Bucket=STORAGE_BUCKET)
    except:
        s3.create_bucket(Bucket=STORAGE_BUCKET)

def download_image(url):
    # In a real scenario, this fetches from S3 or HTTP.
    # We will simulate fetching the file bytes.
    # For now, if it's an S3 object key disguised as a URL or a real URL.
    # We'll just generate a mock image for development if not reachable.
    try:
        if url.startswith("http"):
            import requests
            resp = requests.get(url)
            return Image.open(io.BytesIO(resp.content)).convert("RGBA")
        else:
            # Assume it's a local mock or object key
            resp = s3.get_object(Bucket=STORAGE_BUCKET, Key=url)
            return Image.open(resp['Body']).convert("RGBA")
    except Exception as e:
        print(f"Mocking image download due to error: {e}")
        img = Image.new('RGBA', (500, 500), color=(150, 0, 0, 255))
        return img

def upload_image(img, key):
    buf = io.BytesIO()
    img.convert('RGB').save(buf, format='JPEG', quality=85)
    buf.seek(0)
    s3.put_object(Bucket=STORAGE_BUCKET, Key=key, Body=buf, ContentType='image/jpeg', ACL='public-read')
    return f"{STORAGE_ENDPOINT}/{STORAGE_BUCKET}/{key}"

def process_image_pipeline(raw_img_url, product_id, image_id):
    # 1. Download
    img = download_image(raw_img_url)
    
    # 2. Quality check (mocked)
    warnings = []
    if img.width < 300 or img.height < 300:
        warnings.append("too_small")
    
    # 3. Background removal
    subject = remove(img)
    
    # 4. Enhancement (mild contrast/brightness)
    enhancer = ImageEnhance.Contrast(subject)
    subject = enhancer.enhance(1.1)
    
    # 5. Canvas fit (1024x1024)
    canvas_size = 1024
    subject.thumbnail((canvas_size, canvas_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (245, 245, 245, 255))
    offset = ((canvas_size - subject.width) // 2, (canvas_size - subject.height) // 2)
    canvas.paste(subject, offset, subject)
    
    # 6. Thumbnail (256x256)
    thumb = canvas.copy()
    thumb.thumbnail((256, 256), Image.Resampling.LANCZOS)
    
    # 7. Upload
    processed_key = f"products/{product_id}/{image_id}_processed.jpg"
    thumb_key = f"products/{product_id}/{image_id}_thumb.jpg"
    
    processed_url = upload_image(canvas, processed_key)
    thumb_url = upload_image(thumb, thumb_key)
    
    return processed_url, thumb_url, warnings

def process_jobs():
    print("Starting image processing worker...")
    try:
        ensure_bucket()
    except Exception as e:
        print("Warning: could not ensure bucket. Storage might not be running.")

    while True:
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            
            # Fetch pending IMAGE_PROCESS job
            cur.execute("""
                SELECT id, payload FROM "Job"
                WHERE type = 'IMAGE_PROCESS' AND status = 'pending'
                ORDER BY "createdAt" ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED;
            """)
            
            job = cur.fetchone()
            if job:
                job_id, payload = job
                print(f"Processing job {job_id}")
                image_id = payload.get('imageId')
                source_version = payload.get('sourceVersion', 1)
                
                cur.execute("""
                    UPDATE "Job" SET status = 'processing', "lockedAt" = NOW()
                    WHERE id = %s
                """, (job_id,))
                conn.commit()
                
                cur.execute("""
                    SELECT "productId", "rawImageUrl", "sourceVersion" FROM "ProductImage"
                    WHERE id = %s
                """, (image_id,))
                img_record = cur.fetchone()
                
                if not img_record:
                    # Image was deleted
                    cur.execute("""UPDATE "Job" SET status = 'done', "updatedAt" = NOW() WHERE id = %s""", (job_id,))
                    conn.commit()
                    continue
                    
                product_id, raw_image_url, db_version = img_record
                
                # Check version mismatch
                if db_version != source_version:
                    cur.execute("""UPDATE "Job" SET status = 'done', "updatedAt" = NOW() WHERE id = %s""", (job_id,))
                    conn.commit()
                    continue
                
                try:
                    processed_url, thumb_url, warnings = process_image_pipeline(raw_image_url, product_id, image_id)
                    
                    cur.execute("""
                        UPDATE "ProductImage"
                        SET "processedImageUrl" = %s, "thumbnailUrl" = %s, "processingStatus" = 'done', "qualityWarnings" = %s, "processedAt" = NOW()
                        WHERE id = %s AND "sourceVersion" = %s
                    """, (processed_url, thumb_url, json.dumps(warnings), image_id, source_version))
                    
                    cur.execute("""
                        UPDATE "Job" SET status = 'done', "updatedAt" = NOW() WHERE id = %s
                    """, (job_id,))
                    conn.commit()
                    print(f"Finished job {job_id}")
                    
                except Exception as e:
                    print(f"Pipeline error: {e}")
                    cur.execute("""
                        UPDATE "ProductImage" SET "processingStatus" = 'failed' WHERE id = %s AND "sourceVersion" = %s
                    """, (image_id, source_version))
                    cur.execute("""
                        UPDATE "Job" SET status = 'failed', "errorMessage" = %s, "updatedAt" = NOW() WHERE id = %s
                    """, (str(e), job_id))
                    conn.commit()

            else:
                time.sleep(2)
                
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    process_jobs()

