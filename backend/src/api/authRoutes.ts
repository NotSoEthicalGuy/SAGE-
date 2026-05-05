/**
 * SAGE — Auth Routes
 * POST /api/auth/login — returns JWT + role
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';
import { requireAuth, signToken } from '../middleware/auth';

export const authRouter = Router();

const ADMIN_EMAIL = 'admin@sage.edu';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check admin first (hardcoded or from env)
    if (email === ADMIN_EMAIL) {
      const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = signToken({ id: 'admin', email: ADMIN_EMAIL, role: 'admin' });
      return res.json({ token, role: 'admin', name: 'Admin', email: ADMIN_EMAIL });
    }

    const student = await prisma.student.findUnique({ where: { email } });
    if (student?.passwordHash) {
      const studentValid = await bcrypt.compare(password, student.passwordHash);
      if (!studentValid) return res.status(401).json({ error: 'Invalid credentials' });

      const studentToken = signToken({ id: student.studentId, email: student.email, role: 'student' });
      return res.json({
        token: studentToken,
        role: 'student',
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        studentNumber: student.studentNumber,
      });
    }

    // Check advisors table
    const advisor = await prisma.advisor.findUnique({ where: { email } });
    if (!advisor) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, advisor.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: advisor.advisorId, email: advisor.email, role: 'advisor' });
    return res.json({
      token,
      role: 'advisor',
      name: advisor.name,
      email: advisor.email,
      advisorId: advisor.advisorId,
    });
  } catch (e: any) {
    console.error('[SAGE] Login error:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/change-password — change password for current user
authRouter.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    if (req.user?.role === 'student') {
      const student = await prisma.student.findUnique({ where: { studentId: req.user.id } });
      if (!student?.passwordHash) return res.status(404).json({ error: 'Student not found' });
      const valid = await bcrypt.compare(currentPassword, student.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid current password' });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.student.update({ where: { studentId: student.studentId }, data: { passwordHash } });
      return res.json({ status: 'updated' });
    }

    if (req.user?.role === 'advisor') {
      const advisor = await prisma.advisor.findUnique({ where: { advisorId: req.user.id } });
      if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
      const valid = await bcrypt.compare(currentPassword, advisor.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid current password' });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.advisor.update({ where: { advisorId: advisor.advisorId }, data: { passwordHash } });
      return res.json({ status: 'updated' });
    }

    return res.status(400).json({ error: 'Admin password changes are not supported here' });
  } catch (e: any) {
    console.error('[SAGE] Change password error:', e.message);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});
