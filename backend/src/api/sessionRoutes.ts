/**
 * SAGE — Class Sessions & Attendance Routes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAdvisor, requireAuth } from '../middleware/auth';

export const sessionRouter = Router();

// POST /api/class-sessions — open a new session
sessionRouter.post('/', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const { courseId, date, title } = req.body;
    const advisorId = req.user!.id;
    if (!courseId || !date) {
      return res.status(400).json({ error: 'courseId and date are required' });
    }
    const session = await prisma.classSession.create({
      data: { advisorId, courseId, date: new Date(date), title },
      include: { course: { select: { code: true, name: true } } },
    });
    res.status(201).json(session);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to create session: ' + e.message });
  }
});

// GET /api/class-sessions — list sessions for current advisor
sessionRouter.get('/', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const advisorId = req.user!.id;
    const sessions = await prisma.classSession.findMany({
      where: { advisorId },
      include: {
        course: { select: { code: true, name: true } },
        attendance: { include: { student: { select: { name: true, studentId: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/class-sessions/:sessionId — session detail
sessionRouter.get('/:sessionId', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const session = await prisma.classSession.findUnique({
      where: { sessionId: req.params.sessionId },
      include: {
        course: true,
        attendance: { include: { student: { select: { name: true, studentId: true, email: true } } } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/class-sessions/:sessionId/attendance — mark attendance
sessionRouter.post('/:sessionId/attendance', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const { attendance } = req.body; // [{ studentId, present }]
    if (!Array.isArray(attendance)) {
      return res.status(400).json({ error: 'attendance must be an array of {studentId, present}' });
    }

    const results = await Promise.all(
      attendance.map(({ studentId, present }: { studentId: string; present: boolean }) =>
        prisma.attendance.upsert({
          where: { sessionId_studentId: { sessionId: req.params.sessionId, studentId } },
          create: { sessionId: req.params.sessionId, studentId, present },
          update: { present },
        })
      )
    );
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to mark attendance: ' + e.message });
  }
});

// GET /api/class-sessions/:sessionId/attendance
sessionRouter.get('/:sessionId/attendance', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const attendance = await prisma.attendance.findMany({
      where: { sessionId: req.params.sessionId },
      include: { student: { select: { name: true, studentId: true, email: true } } },
    });
    res.json(attendance);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});
