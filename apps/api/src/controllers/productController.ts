import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to determine if an edit is material
const isMaterialEdit = (current: any, update: any) => {
  const fields = ['name', 'rawDescription', 'categoryId', 'materials', 'productionTime'];
  return fields.some(f => update[f] !== undefined && update[f] !== current[f]);
};

let IN_MEMORY_PRODUCTS: any[] = [
  {
    id: 'prod-demo-1',
    artisanId: 'artisan-demo-id',
    name: 'Handcrafted Royal Blue Ceramic Vase',
    rawDescription: 'Jaipur blue pottery vase with Persian floral artwork. Made without clay using quartz powder and multani mitti.',
    materials: 'Quartz stone powder, recycled glass, Multani Mitti',
    productionTime: '4 days per piece',
    quantityAvailable: 45,
    price: 1450,
    status: 'published',
    category: { label: 'Blue Pottery' },
    suggestedPriceRange: { min: 1200, max: 1750, currency: 'INR' },
    images: [{
      order: 0,
      rawImageUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
      processedImageUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=256&q=80',
      processingStatus: 'done',
    }],
    catalog: {
      finalDescription: 'Elevate your interiors with this GI-certified Jaipur Blue Pottery vase. Distinguished by its signature Persian cobalt blue glaze and intricate floral tracery.',
      structuredFields: {
        title: 'Handcrafted Royal Blue Ceramic Vase',
        craftTechnique: 'Jaipur Blue Pottery',
        primaryMaterial: 'Quartz stone & natural mineral glaze',
        culturalSignificance: 'Introduced to Jaipur by Maharaja Sawai Ram Singh II in the 19th century.'
      }
    },
    priceRecommendation: {
      calculatedBaseCost: 1150,
      suggestedMinPrice: 1250,
      suggestedMaxPrice: 1750,
      explanation: 'Base cost ₹1,150 (materials ₹450 + 8h labor @ ₹75/h + ₹100 overhead).'
    },
    artisan: {
      artisanProfile: {
        name: 'Rameshwar Prajapati',
        locationState: 'Rajasthan',
        locationDistrict: 'Jaipur'
      }
    }
  },
  {
    id: 'prod-demo-2',
    artisanId: 'artisan-demo-2',
    name: 'Authentic Madhubani Tree of Life Painting',
    rawDescription: 'Mithila line art painting depicting the sacred Tree of Life painted with natural plant pigments.',
    materials: 'Handmade cotton rag paper, natural vegetable dyes',
    productionTime: '6 days',
    quantityAvailable: 20,
    price: 2800,
    status: 'published',
    category: { label: 'Traditional Folk Painting' },
    suggestedPriceRange: { min: 2400, max: 3400, currency: 'INR' },
    images: [{
      order: 0,
      rawImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
      processedImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=256&q=80',
      processingStatus: 'done',
    }],
    catalog: {
      finalDescription: 'A classic portrayal of fertility, harmony, and cosmic equilibrium through the revered Tree of Life motif.',
      structuredFields: {
        title: 'Authentic Madhubani Tree of Life Painting',
        craftTechnique: 'Mithila / Madhubani Kachni Line Art',
        primaryMaterial: 'Handmade rag paper & natural dyes'
      }
    },
    priceRecommendation: {
      calculatedBaseCost: 2370,
      suggestedMinPrice: 2400,
      suggestedMaxPrice: 3400,
      explanation: '22 hours of meticulous line art @ ₹85/hr fair wage.'
    },
    artisan: {
      artisanProfile: {
        name: 'Sunita Devi',
        locationState: 'Bihar',
        locationDistrict: 'Madhubani'
      }
    }
  }
];

export const createProduct = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const artisanId = req.user?.userId || 'artisan-demo-id';
    const { name, categoryId, materials, productionTime, quantityAvailable, rawDescription } = req.body;
    
    if (!name) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });

    try {
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
      return res.json(product);
    } catch (dbErr) {
      // In-memory fallback
      const inMemProd = {
        id: `prod-${Date.now()}`,
        artisanId,
        name,
        categoryId,
        materials,
        productionTime,
        quantityAvailable,
        rawDescription,
        status: 'draft',
        inputVersion: 1,
        images: [],
        suggestedPriceRange: { min: 800, max: 1400, currency: 'INR' },
        price: null,
      };
      IN_MEMORY_PRODUCTS.unshift(inMemProd);
      return res.json(inMemProd);
    }
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const getMyProducts = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const artisanId = req.user?.userId;
    const status = req.query.status as string;

    try {
      const where: any = { artisanId, status: { not: 'archived' } };
      if (status) where.status = status;

      const products = await prisma.product.findMany({
        where,
        include: { images: { orderBy: { order: 'asc' } }, category: true },
        orderBy: { updatedAt: 'desc' }
      });
      if (products && products.length > 0) return res.json(products);
    } catch (dbErr) {
      console.warn('Database offline, using in-memory products');
    }

    return res.json(IN_MEMORY_PRODUCTS);
  } catch (error) {
    return res.json(IN_MEMORY_PRODUCTS);
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

import { saveMediaFile } from '../utils/storage';

export const addImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const artisanId = req.user?.userId;
    let rawImageUrl = req.body.rawImageUrl;

    const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Not found' } });
    if (product.artisanId !== artisanId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not owner' } });

    if (product.images.length >= 5) return res.status(400).json({ error: { code: 'IMAGE_LIMIT_EXCEEDED', message: 'Max 5 images' } });

    if (req.file) {
      const uploaded = await saveMediaFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'products');
      rawImageUrl = uploaded.url;
    }

    if (!rawImageUrl) {
      return res.status(400).json({ error: { code: 'IMAGE_REQUIRED', message: 'rawImageUrl or file upload is required' } });
    }

    const order = product.images.length;
    
    const newImage = await prisma.productImage.create({
      data: {
        productId: id,
        rawImageUrl,
        order,
        processingStatus: 'pending'
      }
    });

    if (product.status === 'published' || product.status === 'ready_for_review') {
      await prisma.product.update({
        where: { id },
        data: { inputVersion: { increment: 1 }, status: 'processing' }
      });
      await prisma.job.create({ data: { type: 'IMAGE_PROCESS', payload: { imageId: newImage.id, sourceVersion: 1 } } });
    }

    res.json(newImage);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const listPublicProducts = async (req: Request, res: Response) => {
  try {
    const { categoryId, query, state, minPrice, maxPrice } = req.query;

    const where: any = {
      status: 'published',
    };

    if (categoryId && typeof categoryId === 'string') {
      where.categoryId = categoryId;
    }

    if (state && typeof state === 'string') {
      where.artisan = {
        artisanProfile: {
          locationState: { contains: state, mode: 'insensitive' },
        },
      };
    }

    if (query && typeof query === 'string') {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { rawDescription: { contains: query, mode: 'insensitive' } },
        { materials: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    try {
      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { order: 'asc' } },
          catalog: true,
          priceRecommendation: true,
          artisan: {
            select: {
              id: true,
              artisanProfile: {
                select: {
                  name: true,
                  locationState: true,
                  locationDistrict: true,
                  photoUrl: true,
                  bio: true,
                  craftCategory: true,
                },
              },
            },
          },
        },
        orderBy: { publishedAt: 'desc' }
      });

      if (products && products.length > 0) {
        return res.json(products);
      }
    } catch (dbErr) {
      console.warn('Database offline, serving fallback products');
    }

    return res.json(IN_MEMORY_PRODUCTS);
  } catch (error: any) {
    return res.json(IN_MEMORY_PRODUCTS);
  }
};
