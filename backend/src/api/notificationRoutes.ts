/**
 * SAGE — Notification Routes
 * Advisor endpoints: list, mark read, mark all read
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAdvisor } from '../middleware/auth';

export const notificationRouter = Router();

// GET /api/advisor/notifications
notificationRouter.get('/advisor/notifications', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { advisorId: (req as any).user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + e.message });
  }
});

// PUT /api/advisor/notifications/read-all
notificationRouter.put('/advisor/notifications/read-all', requireAdvisor, async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { advisorId: (req as any).user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ updated: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to mark all read: ' + e.message });
  }
});

// PUT /api/advisor/notifications/:id/read
notificationRouter.put('/advisor/notifications/:id/read', requireAdvisor, async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, advisorId: (req as any).user.id },
      data: { isRead: true },
    });
    res.json({ updated: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to mark read: ' + e.message });
  }
});
