/**
 * SAGE — Advisor Management Routes (Admin only)
 * GET/POST/PUT/DELETE /api/advisors
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';
import { requireAdmin } from '../middleware/auth';

export const advisorRouter = Router();

// GET /api/advisors — list all advisors
advisorRouter.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const advisors = await prisma.advisor.findMany({
      orderBy: { name: 'asc' },
      include: {
        major: { select: { majorId: true, name: true } },
        students: {
          select: { studentId: true, name: true, cumulativeGpa: true },
        },
      },
    });
    // Strip passwordHash from response
    const safe = advisors.map(({ passwordHash: _, ...a }) => a);
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch advisors' });
  }
});

// GET /api/advisors/:advisorId — single advisor
advisorRouter.get('/:advisorId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const advisor = await prisma.advisor.findUnique({
      where: { advisorId: req.params.advisorId },
      include: {
        major: { select: { majorId: true, name: true } },
        students: true
      },
    });
    if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
    const { passwordHash: _, ...safe } = advisor;
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch advisor' });
  }
});

// POST /api/advisors — create advisor
advisorRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, majorId } = req.body;
    if (!name || !email || !password || !majorId) {
      return res.status(400).json({ error: 'Name, email, password, and majorId are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const advisor = await prisma.advisor.create({
      data: { name, email, passwordHash, majorId },
    });
    const { passwordHash: _, ...safe } = advisor;
    res.status(201).json(safe);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create advisor' });
  }
});

// PUT /api/advisors/:advisorId — update advisor
advisorRouter.put('/:advisorId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, majorId } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    if (majorId) data.majorId = majorId;

    const advisor = await prisma.advisor.update({
      where: { advisorId: req.params.advisorId },
      data,
    });
    const { passwordHash: _, ...safe } = advisor;
    res.json(safe);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Advisor not found' });
    res.status(500).json({ error: 'Failed to update advisor' });
  }
});

// DELETE /api/advisors/:advisorId — delete advisor
advisorRouter.delete('/:advisorId', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Unassign students first
    await prisma.student.updateMany({
      where: { advisorId: req.params.advisorId },
      data: { advisorId: null },
    });
    await prisma.advisor.delete({ where: { advisorId: req.params.advisorId } });
    res.json({ status: 'deleted' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Advisor not found' });
    res.status(500).json({ error: 'Failed to delete advisor' });
  }
});
