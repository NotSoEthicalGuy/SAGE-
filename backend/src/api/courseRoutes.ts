/**
 * SAGE — Course Management Routes
 * Includes course CRUD, materials upload, and skills management
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/client';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const courseRouter = Router();

// File upload setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.pptx', '.ppt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and PPTX files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

async function extractText(filePath: string, fileType: string): Promise<string> {
  try {
    if (fileType === 'pdf') {
      const pdfParse = (await import('pdf-parse')) as any;
      const parse = pdfParse.default || pdfParse;
      const buffer = fs.readFileSync(filePath);
      const data = await parse(buffer);
      return data.text.slice(0, 10000); // cap at 10k chars
    }
    if (fileType === 'pptx') {
      try {
        const officeparser = (await import('officeparser')) as any;
        const text = await (officeparser.parseOfficeAsync || officeparser.parseOffice)(filePath);
        return (text as string).slice(0, 10000);
      } catch {
        return '';
      }
    }
  } catch (e) {
    console.error('[SAGE] Text extraction failed:', e);
  }
  return '';
}

// GET /api/courses — list courses (with optional majorId filter)
courseRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { majorId } = req.query;
    const courses = await prisma.course.findMany({
      where: majorId ? { majorId: majorId as string } : undefined,
      include: {
        major: { select: { name: true } },
        skills: true,
        materials: { select: { materialId: true, fileName: true, fileType: true, uploadedAt: true } },
      },
      orderBy: [{ majorId: 'asc' }, { semesterOffered: 'asc' }],
    });
    res.json(courses);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/:courseId — single course detail
courseRouter.get('/:courseId', requireAuth, async (req: Request, res: Response) => {
  try {
    const course = await prisma.course.findUnique({
      where: { courseId: req.params.courseId },
      include: { major: true, skills: true, materials: true },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// POST /api/courses — create course (admin only)
courseRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      majorId,
      code,
      name,
      title,
      description,
      credits,
      courseType,
      semesterOffered,
      difficultyLevel,
      syllabusText,
      topicsCovered,
      prerequisites,
    } = req.body;
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
        courseType: courseType || undefined,
        credits: Number(credits),
        semesterOffered: semesterOffered ? Number(semesterOffered) : null,
        difficultyLevel: difficultyLevel ? Number(difficultyLevel) : null,
        syllabusText: syllabusText || null,
        topicsCovered: topicsCovered || [],
        prerequisites: prerequisites || [],
      },
    });
    res.status(201).json(course);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Course code already exists' });
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/courses/:courseId — update course (admin only)
courseRouter.put('/:courseId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      title,
      description,
      courseType,
      credits,
      semesterOffered,
      difficultyLevel,
      syllabusText,
      topicsCovered,
      prerequisites,
    } = req.body;
    const course = await prisma.course.update({
      where: { courseId: req.params.courseId },
      data: {
        name,
        title,
        description,
        courseType,
        credits: credits ? Number(credits) : undefined,
        semesterOffered: semesterOffered !== undefined ? Number(semesterOffered) : undefined,
        difficultyLevel: difficultyLevel !== undefined ? Number(difficultyLevel) : undefined,
        syllabusText,
        topicsCovered,
        prerequisites,
      },
    });
    res.json(course);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Course not found' });
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:courseId — delete course (admin only)
courseRouter.delete('/:courseId', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.course.delete({ where: { courseId: req.params.courseId } });
    res.json({ status: 'deleted' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Course not found' });
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// POST /api/courses/:courseId/materials — upload file
courseRouter.post('/:courseId/materials', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
    const fileType = ext === 'pdf' ? 'pdf' : 'pptx';
    const extractedText = await extractText(req.file.path, fileType);

    const material = await prisma.courseMaterial.create({
      data: {
        courseId: req.params.courseId,
        fileType,
        filePath: req.file.path,
        fileName: req.file.originalname,
        extractedText,
      },
    });
    res.status(201).json(material);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to upload material: ' + e.message });
  }
});

// GET /api/courses/:courseId/materials — list materials
courseRouter.get('/:courseId/materials', requireAuth, async (req: Request, res: Response) => {
  try {
    const materials = await prisma.courseMaterial.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(materials);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// DELETE /api/courses/:courseId/materials/:materialId
courseRouter.delete('/:courseId/materials/:materialId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const material = await prisma.courseMaterial.delete({ where: { materialId: req.params.materialId } });
    // Try to delete file
    try { fs.unlinkSync(material.filePath); } catch {}
    res.json({ status: 'deleted' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Material not found' });
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// POST /api/courses/:courseId/skills — add skill
courseRouter.post('/:courseId/skills', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { skillName } = req.body;
    if (!skillName) return res.status(400).json({ error: 'skillName is required' });
    const skill = await prisma.courseSkill.create({
      data: { courseId: req.params.courseId, skillName },
    });
    res.status(201).json(skill);
  } catch (e) {
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// GET /api/courses/:courseId/skills — list skills
courseRouter.get('/:courseId/skills', requireAuth, async (req: Request, res: Response) => {
  try {
    const skills = await prisma.courseSkill.findMany({ where: { courseId: req.params.courseId } });
    res.json(skills);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// DELETE /api/courses/:courseId/skills/:skillId
courseRouter.delete('/:courseId/skills/:skillId', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.courseSkill.delete({ where: { skillId: req.params.skillId } });
    res.json({ status: 'deleted' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Skill not found' });
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});
