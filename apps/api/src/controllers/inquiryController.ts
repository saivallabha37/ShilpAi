import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

export const submitInquiry = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const buyerId = req.user?.userId;
    const { productId } = req.body;
    
    const schema = z.object({
      productId: z.string(),
      quantity: z.number().int().positive().optional(),
      requirements: z.string().optional(),
      targetLocation: z.string().optional(),
      message: z.string().optional()
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues } });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'published') {
      return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not available' } });
    }

    const buyerProfile = await prisma.buyerProfile.findUnique({ where: { userId: buyerId } });
    if (!buyerProfile) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Buyer profile required' } });

    const inquiry = await prisma.inquiry.create({
      data: {
        productId,
        buyerId: buyerProfile.id,
        quantity: parsed.data.quantity,
        requirements: parsed.data.requirements,
        targetLocation: parsed.data.targetLocation,
        message: parsed.data.message,
      }
    });

    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const getMyInquiries = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId, role } = req.user;

    if (role === 'BUYER') {
      const buyerProfile = await prisma.buyerProfile.findUnique({ where: { userId } });
      if (!buyerProfile) return res.json([]);
      const inquiries = await prisma.inquiry.findMany({
        where: { buyerId: buyerProfile.id },
        include: { product: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(inquiries);
    } else if (role === 'ARTISAN') {
      const inquiries = await prisma.inquiry.findMany({
        where: { product: { artisanId: userId } },
        include: { product: true, buyer: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(inquiries);
    }

    res.json([]);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const updateInquiryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // @ts-ignore
    const { userId, role } = req.user;

    const inquiry = await prisma.inquiry.findUnique({ where: { id }, include: { product: true } });
    if (!inquiry) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });

    // Only artisan who owns the product can accept/decline
    if (role !== 'ARTISAN' || inquiry.product.artisanId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }

    if (!['ACCEPTED', 'DECLINED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });
    }

    const updated = await prisma.inquiry.update({
      where: { id },
      data: { status }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const markInquiryViewed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const { userId, role } = req.user;

    const inquiry = await prisma.inquiry.findUnique({ where: { id }, include: { product: true } });
    if (!inquiry) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });

    if (role !== 'ARTISAN' || inquiry.product.artisanId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }

    const updated = await prisma.inquiry.update({
      where: { id },
      data: { isViewed: true, viewedAt: new Date() }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

