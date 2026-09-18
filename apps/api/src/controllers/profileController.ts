import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCraftCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.craftCategory.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    const profile = await prisma.artisanProfile.findUnique({
      where: { userId },
      include: { craftCategory: true }
    });
    if (!profile) return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    const { name, craftCategoryId, locationState, locationDistrict, bio, photoUrl } = req.body;
    
    if (!name || !craftCategoryId || !locationState || !locationDistrict) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }

    const category = await prisma.craftCategory.findUnique({ where: { id: craftCategoryId } });
    if (!category) return res.status(400).json({ error: { code: 'INVALID_CRAFT_CATEGORY', message: 'Invalid category' } });

    const profile = await prisma.artisanProfile.upsert({
      where: { userId },
      update: {
        name, craftCategoryId, locationState, locationDistrict, bio, photoUrl,
        completeness: 'complete'
      },
      create: {
        userId, name, craftCategoryId, locationState, locationDistrict, bio, photoUrl,
        completeness: 'complete'
      },
      include: { craftCategory: true }
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const getArtisanProfile = async (req: Request, res: Response) => {
  try {
    const { artisanId } = req.params;
    const profile = await prisma.artisanProfile.findFirst({
      where: { user: { id: artisanId } },
      include: { craftCategory: true, user: { include: { products: { where: { status: 'published' } } } } }
    });
    
    if (!profile) return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });

    // Sanitize response
    const safeProfile = {
      id: profile.id,
      name: profile.name,
      craftCategory: profile.craftCategory,
      locationState: profile.locationState,
      locationDistrict: profile.locationDistrict,
      bio: profile.bio,
      photoUrl: profile.photoUrl,
      publishedProductsCount: profile.user.products.length
    };

    res.json(safeProfile);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

