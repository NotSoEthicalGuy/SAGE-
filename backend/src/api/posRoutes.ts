/**
 * SAGE — Program of Study Routes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireRole, requireAuth } from '../middleware/auth';

export const posRouter = Router();

// ── Helper: determine course status from enrollment ──────────────────────────

function deriveStatus(enrollment: any | null): 'completed' | 'registered' | 'failed' | 'not_registered' {
  if (!enrollment) return 'not_registered';
  const { status, finalGrade } = enrollment;
  if (status === 'failed' || status === 'withdrawn') return 'failed';
  if (finalGrade !== null && status === 'completed') return finalGrade >= 60 ? 'completed' : 'failed';
  if (status === 'completed') return 'completed';
  if (['in_progress', 'registered', 'approved', 'pending'].includes(status)) return 'registered';
  return 'not_registered';
}

function deriveSign(status: string): string {
  if (status === 'completed') return 'C';
  if (status === 'registered') return 'R';
  if (status === 'failed') return 'F';
  return '';
}

// ── GET /api/pos/majors/:majorId ─────────────────────────────────────────────
// Returns grouped degree requirements for a major (admin/advisor only)

posRouter.get('/majors/:majorId', requireRole('admin', 'advisor'), async (req: Request, res: Response) => {
  try {
    const requirements = await prisma.degreeRequirement.findMany({
      where: { majorId: req.params.majorId },
      include: { course: true },
      orderBy: [{ requirementGroup: 'asc' }, { recommendedSemester: 'asc' }],
    });

    const groupMap = new Map<string, any[]>();
    for (const r of requirements) {
      if (!groupMap.has(r.requirementGroup)) groupMap.set(r.requirementGroup, []);
      groupMap.get(r.requirementGroup)!.push(r);
    }

    const groups = Array.from(groupMap.entries()).map(([groupName, items]) => ({
      groupName,
      totalCredits: items.reduce((sum, r) => sum + r.course.credits, 0),
      courses: items.map(r => ({
        requirementId: r.id,
        courseId: r.courseId,
        code: r.course.code,
        name: r.course.name,
        credits: r.course.credits,
        recommendedSemester: r.recommendedSemester,
        requirementType: r.requirementType,
        requirementGroup: r.requirementGroup,
      })),
    }));

    res.json({ majorId: req.params.majorId, groups });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch program of study' });
  }
});

// ── GET /api/pos/students/:studentId ────────────────────────────────────────
// Returns POS with enrollment overlay. Accessible by the student themselves
// or by an advisor assigned to the student's major.

posRouter.get('/students/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { role, id } = req.user!;

    // Access control: student can only see their own; advisor must manage the student's major
    if (role === 'student') {
      if (id !== studentId) return res.status(403).json({ error: 'Forbidden' });
    } else if (role === 'advisor') {
      const student = await prisma.student.findUnique({ where: { studentId }, select: { majorId: true } });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      const advisor = await prisma.advisor.findUnique({ where: { advisorId: id }, select: { majorId: true } });
      if (!advisor || advisor.majorId !== student.majorId) {
        return res.status(403).json({ error: 'Forbidden: student not in your major' });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const student = await prisma.student.findUnique({ where: { studentId }, select: { majorId: true } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [requirements, enrollments, major] = await Promise.all([
      prisma.degreeRequirement.findMany({
        where: { majorId: student.majorId },
        include: { course: true },
        orderBy: [{ requirementGroup: 'asc' }, { recommendedSemester: 'asc' }],
      }),
      prisma.enrollment.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.major.findUnique({ where: { majorId: student.majorId }, select: { minimumCredits: true } }),
    ]);

    // Build enrollment lookup: courseId -> best enrollment
    const enrollmentByCourse = new Map<string, any>();
    for (const e of enrollments) {
      const existing = enrollmentByCourse.get(e.courseId);
      if (!existing) {
        enrollmentByCourse.set(e.courseId, e);
      } else {
        // Prefer completed over registered over failed
        const rank = (s: string) => s === 'completed' ? 3 : s === 'registered' ? 2 : s === 'failed' ? 1 : 0;
        const existStatus = deriveStatus(existing);
        const newStatus = deriveStatus(e);
        if (rank(newStatus) > rank(existStatus)) enrollmentByCourse.set(e.courseId, e);
      }
    }

    const groupMap = new Map<string, any[]>();
    let totalCreditsPassed = 0;
    const totalCreditsRequired = major?.minimumCredits ?? requirements.reduce((s, r) => s + r.course.credits, 0);

    for (const r of requirements) {
      const enrollment = enrollmentByCourse.get(r.courseId) || null;
      const status = deriveStatus(enrollment);
      const sign = deriveSign(status);
      const semesterStr = enrollment?.year && enrollment?.semester
        ? `${enrollment.year}-${enrollment.semester}`
        : null;

      if (!groupMap.has(r.requirementGroup)) groupMap.set(r.requirementGroup, []);
      groupMap.get(r.requirementGroup)!.push({
        requirementId: r.id,
        courseId: r.courseId,
        code: r.course.code,
        name: r.course.name,
        credits: r.course.credits,
        recommendedSemester: r.recommendedSemester,
        requirementType: r.requirementType,
        status,
        semester: semesterStr,
        grade: enrollment?.finalGrade ?? null,
        letterGrade: enrollment?.letterGrade ?? null,
        sign,
      });

      if (status === 'completed') totalCreditsPassed += r.course.credits;
    }

    const groups = Array.from(groupMap.entries()).map(([groupName, courses]) => ({
      groupName,
      groupCreditsRequired: courses.reduce((s: number, c: any) => s + c.credits, 0),
      groupCreditsPassed: courses.filter((c: any) => c.status === 'completed').reduce((s: number, c: any) => s + c.credits, 0),
      courses,
    }));

    res.json({ totalCreditsRequired, totalCreditsPassed, groups });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch student program of study' });
  }
});

// ── GET /api/pos/students/:studentId/summary ─────────────────────────────────

posRouter.get('/students/:studentId/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { role, id } = req.user!;
    if (role === 'student' && id !== studentId) return res.status(403).json({ error: 'Forbidden' });

    const student = await prisma.student.findUnique({ where: { studentId }, select: { majorId: true } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [requirements, enrollments, major] = await Promise.all([
      prisma.degreeRequirement.findMany({
        where: { majorId: student.majorId },
        include: { course: { select: { credits: true } } },
        orderBy: [{ requirementGroup: 'asc' }],
      }),
      prisma.enrollment.findMany({ where: { studentId } }),
      prisma.major.findUnique({ where: { majorId: student.majorId }, select: { minimumCredits: true } }),
    ]);

    const completedCourseIds = new Set(
      enrollments.filter(e => deriveStatus(e) === 'completed').map(e => e.courseId)
    );

    const groupMap = new Map<string, { required: number; passed: number }>();
    let totalCreditsRequired = 0;
    let totalCreditsPassed = 0;

    for (const r of requirements) {
      if (!groupMap.has(r.requirementGroup)) groupMap.set(r.requirementGroup, { required: 0, passed: 0 });
      const g = groupMap.get(r.requirementGroup)!;
      g.required += r.course.credits;
      totalCreditsRequired += r.course.credits;
      if (completedCourseIds.has(r.courseId)) {
        g.passed += r.course.credits;
        totalCreditsPassed += r.course.credits;
      }
    }

    const groupSummaries = Array.from(groupMap.entries()).map(([groupName, v]) => ({
      groupName,
      groupCreditsRequired: v.required,
      groupCreditsPassed: v.passed,
    }));

    res.json({
      totalCreditsRequired: major?.minimumCredits ?? totalCreditsRequired,
      totalCreditsPassed,
      groupSummaries,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// ── POST /api/pos/majors/:majorId/requirements ───────────────────────────────

posRouter.post('/majors/:majorId/requirements', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { courseId, requirementType, recommendedSemester, requirementGroup } = req.body;
    if (!courseId || !requirementType || !recommendedSemester) {
      return res.status(400).json({ error: 'courseId, requirementType, and recommendedSemester are required' });
    }
    const course = await prisma.course.findUnique({ where: { courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const req_ = await prisma.degreeRequirement.create({
      data: {
        majorId: req.params.majorId,
        courseId,
        requirementType,
        recommendedSemester: Number(recommendedSemester),
        requirementGroup: requirementGroup || 'Department Requirements',
      },
      include: { course: true },
    });
    res.status(201).json(req_);
  } catch (e) {
    res.status(500).json({ error: 'Failed to add requirement' });
  }
});

// ── PUT /api/pos/requirements/:id ────────────────────────────────────────────

posRouter.put('/requirements/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { requirementType, recommendedSemester, requirementGroup } = req.body;
    const updated = await prisma.degreeRequirement.update({
      where: { id: req.params.id },
      data: {
        ...(requirementType && { requirementType }),
        ...(recommendedSemester !== undefined && { recommendedSemester: Number(recommendedSemester) }),
        ...(requirementGroup !== undefined && { requirementGroup }),
      },
      include: { course: true },
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Requirement not found' });
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

// ── DELETE /api/pos/requirements/:id ─────────────────────────────────────────

posRouter.delete('/requirements/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await prisma.degreeRequirement.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Requirement not found' });
    res.status(500).json({ error: 'Failed to delete requirement' });
  }
});
