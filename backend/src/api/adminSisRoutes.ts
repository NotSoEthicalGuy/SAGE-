/**
 * SAGE — Admin SIS Routes
 * All routes require admin.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';
import { requireAdmin } from '../middleware/auth';

export const adminSisRouter = Router();

adminSisRouter.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role, majorId, advisorId, isActive } = req.query;
    const users: any[] = [];

    if (!role || role === 'student') {
      const where: any = {};
      if (majorId) where.majorId = majorId as string;
      if (advisorId) where.advisorId = advisorId as string;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const students = await prisma.student.findMany({
        where,
        include: { major: true, advisor: { select: { advisorId: true, name: true } } },
        orderBy: { name: 'asc' },
      });
      users.push(
        ...students.map((s) => ({
          id: s.studentId,
          role: 'student',
          name: s.name,
          email: s.email,
          studentNumber: s.studentNumber,
          major: s.major,
          advisor: s.advisor,
          isActive: s.isActive,
        }))
      );
    }

    if (!role || role === 'advisor') {
      const where: any = {};
      if (majorId) where.majorId = majorId as string;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const advisors = await prisma.advisor.findMany({
        where,
        include: { major: true },
        orderBy: { name: 'asc' },
      });
      users.push(
        ...advisors.map((a) => ({
          id: a.advisorId,
          role: 'advisor',
          name: a.name,
          email: a.email,
          major: a.major,
          isActive: a.isActive,
        }))
      );
    }

    if (role === 'admin') {
      users.push({
        id: 'admin',
        role: 'admin',
        name: 'Admin',
        email: 'admin@university.edu',
        isActive: true,
      });
    }

    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

adminSisRouter.post('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role, name, email, password, majorId, advisorId, enrollmentYear, studentNumber } = req.body;
    if (!role) return res.status(400).json({ error: 'role is required' });

    if (role === 'student') {
      if (!name || !email || !majorId || !enrollmentYear || !password) {
        return res.status(400).json({ error: 'name, email, majorId, enrollmentYear, and password are required' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const student = await prisma.student.create({
        data: {
          name,
          email,
          passwordHash,
          majorId,
          advisorId: advisorId || null,
          enrollmentYear: Number(enrollmentYear),
          currentSemester: 1,
          studentNumber: studentNumber || null,
        },
      });
      return res.status(201).json({ id: student.studentId, role: 'student' });
    }

    if (role === 'advisor') {
      if (!name || !email || !majorId || !password) {
        return res.status(400).json({ error: 'name, email, majorId, and password are required' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const advisor = await prisma.advisor.create({
        data: { name, email, passwordHash, majorId },
      });
      return res.status(201).json({ id: advisor.advisorId, role: 'advisor' });
    }

    return res.status(400).json({ error: 'Admin users are managed separately' });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

adminSisRouter.put('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role, name, email, majorId, advisorId, enrollmentYear, studentNumber, isActive, password } = req.body;
    const data: any = { name, email, majorId, advisorId, enrollmentYear, studentNumber, isActive };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    if (role === 'student' || !role) {
      try {
        const student = await prisma.student.update({
          where: { studentId: req.params.id },
          data,
        });
        return res.json({ id: student.studentId, role: 'student' });
      } catch (e: any) {
        if (e.code !== 'P2025' || role) throw e;
      }
    }

    if (role === 'advisor' || !role) {
      const advisor = await prisma.advisor.update({
        where: { advisorId: req.params.id },
        data: { name, email, majorId, isActive, ...(password ? { passwordHash: data.passwordHash } : {}) },
      });
      return res.json({ id: advisor.advisorId, role: 'advisor' });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

adminSisRouter.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const role = (req.query.role as string) || req.body?.role;
    if (role === 'student' || !role) {
      try {
        await prisma.student.update({
          where: { studentId: req.params.id },
          data: { isActive: false },
        });
        return res.json({ status: 'deactivated' });
      } catch (e: any) {
        if (e.code !== 'P2025' || role) throw e;
      }
    }

    if (role === 'advisor' || !role) {
      await prisma.advisor.update({
        where: { advisorId: req.params.id },
        data: { isActive: false },
      });
      return res.json({ status: 'deactivated' });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

adminSisRouter.get('/advisors', requireAdmin, async (_req, res) => {
  try {
    const advisors = await prisma.advisor.findMany({
      include: { major: true, students: { select: { studentId: true } } },
      orderBy: { name: 'asc' },
    });
    const safe = advisors.map(({ passwordHash: _, ...a }) => a);
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch advisors' });
  }
});

adminSisRouter.post('/advisors', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, majorId } = req.body;
    if (!name || !email || !password || !majorId) {
      return res.status(400).json({ error: 'name, email, password, and majorId are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const advisor = await prisma.advisor.create({ data: { name, email, passwordHash, majorId } });
    const { passwordHash: _, ...safe } = advisor;
    res.status(201).json(safe);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create advisor' });
  }
});

adminSisRouter.put('/advisors/:id', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, majorId, isActive } = req.body;
    const data: any = { name, email, majorId, isActive };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const advisor = await prisma.advisor.update({
      where: { advisorId: req.params.id },
      data,
    });
    const { passwordHash: _, ...safe } = advisor;
    res.json(safe);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Advisor not found' });
    res.status(500).json({ error: 'Failed to update advisor' });
  }
});

adminSisRouter.get('/courses', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { majorId } = req.query;
    const courses = await prisma.course.findMany({
      where: majorId ? { majorId: majorId as string } : undefined,
      include: { major: true },
      orderBy: [{ majorId: 'asc' }, { semesterOffered: 'asc' }],
    });
    res.json(courses);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

adminSisRouter.post('/courses', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { majorId, code, name, title, description, credits, courseType, prerequisites } = req.body;
    if (!majorId || !code || !name || !credits) {
      return res.status(400).json({ error: 'majorId, code, name, and credits are required' });
    }
    const course = await prisma.course.create({
      data: {
        majorId,
        code,
        name,
        title: title || null,
        description: description || null,
        credits: Number(credits),
        courseType: courseType || undefined,
        prerequisites: prerequisites || [],
        topicsCovered: [],
      },
    });
    res.status(201).json(course);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Course code already exists' });
    res.status(500).json({ error: 'Failed to create course' });
  }
});

adminSisRouter.put('/courses/:courseId', requireAdmin, async (req, res) => {
  try {
    const { name, title, description, credits, courseType, prerequisites } = req.body;
    const course = await prisma.course.update({
      where: { courseId: req.params.courseId },
      data: {
        name,
        title,
        description,
        credits: credits !== undefined ? Number(credits) : undefined,
        courseType,
        prerequisites,
      },
    });
    res.json(course);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Course not found' });
    res.status(500).json({ error: 'Failed to update course' });
  }
});

adminSisRouter.get('/sections', requireAdmin, async (req, res) => {
  try {
    const { majorId, semester } = req.query;
    const where: any = {};
    if (majorId) where.majorId = majorId as string;
    if (semester) where.semester = semester as string;

    const sections = await prisma.section.findMany({
      where,
      include: { course: true, major: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sections);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

adminSisRouter.get('/enrollments', requireAdmin, async (req, res) => {
  try {
    const { majorId, semester, status } = req.query;
    const where: any = {};
    if (status) where.status = status as string;
    if (semester) where.semester = Number(semester);
    if (majorId) where.course = { majorId: majorId as string };

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: { student: true, course: true, section: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(enrollments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

adminSisRouter.get('/grades', requireAdmin, async (req, res) => {
  try {
    const { majorId, semester } = req.query;
    const where: any = { finalGrade: { not: null } };
    if (semester) where.semester = Number(semester);
    if (majorId) where.course = { majorId: majorId as string };

    const grades = await prisma.enrollment.findMany({
      where,
      include: { student: true, course: true, section: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(grades);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

adminSisRouter.get('/payments', requireAdmin, async (_req, res) => {
  try {
    const slips = await prisma.paymentSlip.findMany({
      include: { student: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json(slips);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

adminSisRouter.put('/payments/:paymentSlipId', requireAdmin, async (req, res) => {
  try {
    const { status, paidDate } = req.body;
    const slip = await prisma.paymentSlip.update({
      where: { paymentSlipId: req.params.paymentSlipId },
      data: {
        status,
        paidDate: paidDate ? new Date(paidDate) : undefined,
      },
    });
    res.json(slip);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Payment slip not found' });
    res.status(500).json({ error: 'Failed to update payment slip' });
  }
});
