/**
 * SAGE — Admin Student Routes
 * Extended CRUD for students (admin: full control; advisor: read own)
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/client';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const adminStudentRouter = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const pdfUpload = multer({
  storage: pdfStorage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

// POST /api/admin/students — create student (admin only)
adminStudentRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, majorId, advisorId, enrollmentYear, currentSemester, password, studentNumber } = req.body;
    if (!name || !email || !majorId || !enrollmentYear) {
      return res.status(400).json({ error: 'name, email, majorId, and enrollmentYear are required' });
    }
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const student = await prisma.student.create({
      data: {
        name,
        email,
        majorId,
        advisorId: advisorId || null,
        enrollmentYear,
        currentSemester: currentSemester || 1,
        passwordHash,
        studentNumber: studentNumber || null,
      },
      include: { major: true, advisor: { select: { advisorId: true, name: true } } },
    });
    res.status(201).json(student);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// PUT /api/admin/students/:studentId — update student (admin only)
adminStudentRouter.put('/:studentId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      majorId,
      advisorId,
      enrollmentYear,
      currentSemester,
      cumulativeGpa,
      isActive,
      password,
      studentNumber,
    } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (majorId !== undefined) data.majorId = majorId;
    if (advisorId !== undefined) data.advisorId = advisorId || null;
    if (enrollmentYear !== undefined) data.enrollmentYear = enrollmentYear;
    if (currentSemester !== undefined) data.currentSemester = currentSemester;
    if (cumulativeGpa !== undefined) data.cumulativeGpa = cumulativeGpa;
    if (isActive !== undefined) data.isActive = isActive;
    if (studentNumber !== undefined) data.studentNumber = studentNumber || null;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const student = await prisma.student.update({
      where: { studentId: req.params.studentId },
      data,
      include: { major: true, advisor: { select: { advisorId: true, name: true } } },
    });
    res.json(student);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Student not found' });
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/admin/students/:studentId — soft delete
adminStudentRouter.delete('/:studentId', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.student.update({
      where: { studentId: req.params.studentId },
      data: { isActive: false },
    });
    res.json({ status: 'deactivated' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Student not found' });
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// PUT /api/admin/students/:studentId/major — transfer student to a different major
adminStudentRouter.put('/:studentId/major', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { majorId } = req.body;
    if (!majorId) return res.status(400).json({ error: 'majorId is required' });

    const student = await prisma.student.update({
      where: { studentId: req.params.studentId },
      data: { majorId },
    });
    res.json(student);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Student not found' });
    res.status(500).json({ error: 'Failed to transfer major' });
  }
});

// PUT /api/admin/students/:studentId/grade — set/update grade on enrollment
adminStudentRouter.put('/:studentId/grade', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { enrollmentId, finalGrade, letterGrade } = req.body;
    if (!enrollmentId) return res.status(400).json({ error: 'enrollmentId is required' });

    const enrollment = await prisma.enrollment.update({
      where: { enrollmentId },
      data: {
        finalGrade: finalGrade !== undefined ? Number(finalGrade) : undefined,
        letterGrade: letterGrade !== undefined ? letterGrade : undefined,
      },
    });
    res.json(enrollment);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Enrollment not found' });
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

// GET /api/admin/students — all students with advisor info (admin only)
adminStudentRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { majorId, advisorId } = req.query;
    const where: any = {};
    if (majorId) where.majorId = majorId as string;
    if (advisorId) where.advisorId = advisorId as string;

    const students = await prisma.student.findMany({
      where,
      include: {
        major: true,
        advisor: { select: { advisorId: true, name: true, email: true } },
        aiReports: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/admin/majors — CRUD for majors
// POST /api/admin/majors
// PUT /api/admin/majors/:majorId
// DELETE /api/admin/majors/:majorId
export const majorRouter = Router();

majorRouter.get('/', requireAuth, async (_req, res) => {
  const majors = await prisma.major.findMany({ orderBy: { name: 'asc' } });
  res.json(majors);
});

majorRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, code, faculty, totalCredits, minimumCredits, description } = req.body;
    if (!name || !faculty || !totalCredits) {
      return res.status(400).json({ error: 'name, faculty, and totalCredits are required' });
    }
    const major = await prisma.major.create({
      data: {
        name,
        code: code || null,
        faculty,
        totalCredits: Number(totalCredits),
        minimumCredits: minimumCredits !== undefined ? Number(minimumCredits) : undefined,
        description,
      },
    });
    res.status(201).json(major);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Major name already exists' });
    res.status(500).json({ error: 'Failed to create major' });
  }
});

majorRouter.put('/:majorId', requireAdmin, async (req, res) => {
  try {
    const { name, code, faculty, totalCredits, minimumCredits, description } = req.body;
    const major = await prisma.major.update({
      where: { majorId: req.params.majorId },
      data: {
        name,
        code,
        faculty,
        totalCredits: totalCredits ? Number(totalCredits) : undefined,
        minimumCredits: minimumCredits !== undefined ? Number(minimumCredits) : undefined,
        description,
      },
    });
    res.json(major);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Major not found' });
    res.status(500).json({ error: 'Failed to update major' });
  }
});

majorRouter.delete('/:majorId', requireAdmin, async (req, res) => {
  try {
    await prisma.major.delete({ where: { majorId: req.params.majorId } });
    res.json({ status: 'deleted' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Major not found' });
    res.status(500).json({ error: 'Failed to delete major' });
  }
});

// POST /api/admin/majors/:majorId/pdf — upload curriculum PDF
majorRouter.post('/:majorId/pdf', requireAdmin, pdfUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const pdfUrl = `/uploads/${path.basename(req.file.path)}`;
    const major = await prisma.major.update({
      where: { majorId: req.params.majorId },
      data: { pdfUrl },
    });
    res.json(major);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Major not found' });
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

// POST /api/admin/majors/:majorId/courses — add a course to the program of study
majorRouter.post('/:majorId/courses', requireAdmin, async (req, res) => {
  try {
    const { courseId, semester, isRequired, sortOrder } = req.body;
    if (!courseId || semester === undefined) {
      return res.status(400).json({ error: 'courseId and semester are required' });
    }

    const item = await prisma.programOfStudyItem.create({
      data: {
        majorId: req.params.majorId,
        courseId,
        semester: Number(semester),
        isRequired: isRequired !== undefined ? Boolean(isRequired) : true,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      },
    });
    res.status(201).json(item);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Course already in program of study' });
    res.status(500).json({ error: 'Failed to add course to program of study' });
  }
});
