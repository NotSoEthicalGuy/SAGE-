/**
 * SAGE — JWT Auth Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sage-secret-key-change-in-production';

export interface AuthPayload {
  id: string;
  email: string;
  role: 'admin' | 'advisor' | 'student';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole('admin')(req, res, next);
}

export function requireAdvisor(req: Request, res: Response, next: NextFunction) {
  return requireRole('advisor', 'admin')(req, res, next);
}

export function requireRole(...roles: AuthPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient role' });
      }
      next();
    });
  };
}

export function requireSelf(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden: Student access required' });
    }

    const targetId = req.params.studentId || req.params.id;
    if (targetId && targetId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access to other student data denied' });
    }

    next();
  });
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
