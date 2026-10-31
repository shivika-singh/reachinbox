import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export const COOKIE = 'session';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const p = jwt.verify(token, config.jwtSecret) as { uid: string };
    (req as any).userId = p.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}

export const uid = (req: Request) => (req as any).userId as string;
