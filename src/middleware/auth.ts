import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error('JWT_SECRET is not configured or is too short. Set a strong JWT_SECRET in the backend environment.');
  }
  return secret;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: number; username: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    const isConfigError = error instanceof Error && error.message.includes('JWT_SECRET');
    res.status(isConfigError ? 500 : 401).json({
      status: 'error',
      message: isConfigError ? 'Authentication service is not configured' : 'Invalid or expired token',
    });
  }
}
