import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-here';

const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const requestOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Phone number required' } });

    // Mock OTP logic
    const code = '123456';
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins

    await prisma.otpCode.create({
      data: {
        phoneNumber,
        codeHash,
        expiresAt,
      }
    });

    res.json({ message: 'OTP sent (mocked as 123456 for dev)' });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;
    
    const otpRecord = await prisma.otpCode.findFirst({
      where: { phoneNumber },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'OTP expired or not found' } });
    }

    const isValid = await bcrypt.compare(code, otpRecord.codeHash);
    if (!isValid) {
      return res.status(400).json({ error: { code: 'OTP_INVALID', message: 'Invalid OTP' } });
    }

    // Upsert Artisan
    let credential = await prisma.artisanCredential.findUnique({ where: { phoneNumber }, include: { user: true } });
    let user;

    if (!credential) {
      user = await prisma.user.create({
        data: {
          role: 'ARTISAN',
          artisanCredential: {
            create: {
              phoneNumber,
              phoneVerifiedAt: new Date(),
            }
          }
        }
      });
    } else {
      user = credential.user;
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: { code: 'ACCOUNT_INACTIVE', message: 'Account is suspended' } });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({ accessToken, refreshToken, user: { id: user.id, role: user.role, status: user.status } });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const registerBuyer = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      contactName: z.string().optional(),
      organizationName: z.string()
    });
    
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues } });

    const { email, password, contactName, organizationName } = parsed.data;

    const existing = await prisma.buyerCredential.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: { code: 'ACCOUNT_EXISTS', message: 'Email already registered' } });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        role: 'BUYER',
        buyerCredential: {
          create: { email, passwordHash }
        },
        buyerProfile: {
          create: { organizationName, contactName }
        }
      }
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({ accessToken, refreshToken, user: { id: user.id, role: user.role, status: user.status } });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const loginBuyer = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const cred = await prisma.buyerCredential.findUnique({ where: { email }, include: { user: true } });
    if (!cred) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });

    const isValid = await bcrypt.compare(password, cred.passwordHash);
    if (!isValid) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });

    if (cred.user.status !== 'active') return res.status(403).json({ error: { code: 'ACCOUNT_INACTIVE', message: 'Account is suspended' } });

    const { accessToken, refreshToken } = generateTokens(cred.user.id, cred.user.role);

    await prisma.refreshToken.create({
      data: {
        userId: cred.user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({ accessToken, refreshToken, user: { id: cred.user.id, role: cred.user.role, status: cred.user.status } });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
};

export const me = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user?.userId;
  if (!userId) return res.status(401).send();
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).send();

  res.json({ id: user.id, role: user.role, status: user.status });
};

