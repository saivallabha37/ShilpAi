import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to determine if an edit is material
const isMaterialEdit = (current: any, update: any) => {
  const fields = ['name', 'rawDescription', 'categoryId', 'materials', 'productionTime'];
  return fields.some(f => update[f] !== undefined && update[f] !== current[f]);
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const artisanId = req.user?.userId;
    const { name, categoryId, materials, productionTime, quantityAvailable, rawDescription } = req.body;
    
    if (!name) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });

    const product = await prisma.product.create({
      data: {
        artisanId,
        name,
        categoryId,
        materials,
        productionTime,
        quantityAvailable,
        rawDescription,
        status: 'draft'
      }
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const getMyProducts = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const artisanId = req.user?.userId;
    const status = req.query.status as string;

    const where: any = { artisanId, status: { not: 'archived' } };
    if (status) where.status = status;

    const products = await prisma.product.findMany({
      where,
      include: { images: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const getProductDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const user = req.user;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        images: { orderBy: { order: 'asc' } },
        catalog: { include: { translations: true } },
        artisan: { include: { artisanProfile: true } }
      }
    });

    if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } });

    // Authorization
    if (user?.role === 'BUYER' && product.status !== 'published') {
      return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } });
    }
    if (user?.role === 'ARTISAN' && product.artisanId !== user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not owner' } });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const artisanId = req.user?.userId;
    const updateData = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } });
    if (product.artisanId !== artisanId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not owner' } });
    if (product.status === 'archived') return res.status(400).json({ error: { code: 'INVALID_TRANSITION', message: 'Cannot edit archived product' } });

    const material = isMaterialEdit(product, updateData);
    
    let updatePayload: any = { ...updateData };
    
    if (material) {
      updatePayload.inputVersion = { increment: 1 };
      
      // If material edit, reset AI statuses
      updatePayload.catalogStatus = 'pending';
      updatePayload.priceStatus = 'pending';

      // If it was ready for review or processing, it stays processing until AI is done
      if (product.status === 'ready_for_review') {
        updatePayload.status = 'processing';
      }
      
      // Note: if published, it stays published per PRD 03 (11c), buyers see last good content
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updatePayload
    });

    // If material edit, dispatch AI jobs (mocked for now)
    if (material) {
      await prisma.job.create({
        data: {
          type: 'CATALOG_GEN',
          payload: { productId: product.id, inputVersion: product.inputVersion + 1 }
        }
      });
      await prisma.job.create({
        data: {
          type: 'PRICE_REC',
          payload: { productId: product.id, inputVersion: product.inputVersion + 1 }
        }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const submitProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const artisanId = req.user?.userId;

    const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } });
    if (product.artisanId !== artisanId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not owner' } });

    if (product.status !== 'draft' && product.status !== 'unpublished') {
      return res.status(400).json({ error: { code: 'INVALID_TRANSITION', message: 'Can only submit from draft or unpublished' } });
    }

    if (product.images.length === 0) {
      return res.status(400).json({ error: { code: 'MISSING_IMAGES', message: 'At least one image is required' } });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'processing', inputVersion: { increment: 1 }, catalogStatus: 'pending', priceStatus: 'pending' }
    });

    // Dispatch AI jobs
    await prisma.job.create({ data: { type: 'CATALOG_GEN', payload: { productId: product.id, inputVersion: updated.inputVersion } } });
    await prisma.job.create({ data: { type: 'PRICE_REC', payload: { productId: product.id, inputVersion: updated.inputVersion } } });

    // Mark images for processing
    for (const img of product.images) {
      await prisma.productImage.update({
        where: { id: img.id },
        data: { processingStatus: 'pending', sourceVersion: { increment: 1 } }
      });
      await prisma.job.create({ data: { type: 'IMAGE_PROCESS', payload: { imageId: img.id, sourceVersion: img.sourceVersion + 1 } } });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const publishProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const artisanId = req.user?.userId;

    const product = await prisma.product.findUnique({ where: { id }, include: { images: true, catalog: true } });
    if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } });
    if (product.artisanId !== artisanId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not owner' } });

    if (product.status !== 'ready_for_review' && product.status !== 'unpublished') {
      return res.status(400).json({ error: { code: 'INVALID_TRANSITION', message: 'Can only publish from ready_for_review or unpublished' } });
    }

    if (!product.price) return res.status(400).json({ error: { code: 'PRICE_REQUIRED', message: 'Price is required' } });
    if (product.images.length === 0) return res.status(400).json({ error: { code: 'MISSING_IMAGES', message: 'At least one image is required' } });
    if (!product.rawDescription && !product.catalog?.finalDescription && !product.catalog?.structuredFields) {
      return res.status(400).json({ error: { code: 'DESCRIPTION_REQUIRED', message: 'Description from any source is required' } });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const addImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const artisanId = req.user?.userId;
    const { rawImageUrl } = req.body;

    const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } });
    if (product.artisanId !== artisanId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not owner' } });

    if (product.images.length >= 5) return res.status(400).json({ error: { code: 'IMAGE_LIMIT_EXCEEDED', message: 'Max 5 images' } });

    const order = product.images.length;
    
    const newImage = await prisma.productImage.create({
      data: {
        productId: id,
        rawImageUrl,
        order,
        processingStatus: 'pending'
      }
    });

    // We don't automatically dispatch IMAGE_PROCESS job here per PRD 03 - submit does it.
    // Wait, PRD 03 says "Image upload returns immediately with processingStatus = pending; it never blocks on processing."
    // Actually, PRD 04 says "Artisan uploads product photo(s) in PRD 03's create flow -> images saved with processingStatus = pending, upload returns immediately... Artisan submits product -> product enters processing state... This module picks up pending images".
    
    // If we're updating a published product (material edit):
    if (product.status === 'published' || product.status === 'ready_for_review') {
      await prisma.product.update({
        where: { id },
        data: { inputVersion: { increment: 1 }, status: 'processing' } // revert to processing
      });
      // trigger processing for new image
      await prisma.job.create({ data: { type: 'IMAGE_PROCESS', payload: { imageId: newImage.id, sourceVersion: 1 } } });
    }

    res.json(newImage);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const listPublicProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'published' },
      include: { images: { orderBy: { order: 'asc' } }, artisan: { include: { artisanProfile: true } } },
      orderBy: { publishedAt: 'desc' }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};
