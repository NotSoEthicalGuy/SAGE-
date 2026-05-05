import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireSelf } from '../middleware/auth';
import { detectPrerequisiteViolations, isCompleted, isActive } from '../services/prerequisiteService';

export const studentAnalyticsRouter = Router({ mergeParams: true });

studentAnalyticsRouter.get('/pos-progress', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { majorId: true, currentSemester: true, major: { select: { minimumCredits: true } } },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [posItems, enrollments] = await Promise.all([
      prisma.programOfStudyItem.findMany({
        where: { majorId: student.majorId },
        include: { course: { select: { courseId: true, credits: true } } },
      }),
      prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true, status: true, finalGrade: true, semester: true, year: true },
      }),
    ]);

    const completedCourseIds = new Set(
      enrollments.filter(isCompleted).map(e => e.courseId)
    );

    const completedCredits = posItems
      .filter(item => completedCourseIds.has(item.courseId))
      .reduce((sum, item) => sum + item.course.credits, 0);

    const totalCredits = student.major.minimumCredits;
    const pct = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

    const completedSemesterKeys = new Set(
      enrollments.filter(isCompleted).map(e => `${e.year}-${e.semester}`)
    );
    const semesterCount = completedSemesterKeys.size;
    const avgCreditsPerSemester = semesterCount > 0 ? completedCredits / semesterCount : null;

    const remainingCredits = Math.max(0, totalCredits - completedCredits);
    const semestersLeft =
      avgCreditsPerSemester && avgCreditsPerSemester > 0
        ? Math.ceil(remainingCredits / avgCreditsPerSemester)
        : null;

    let graduationEstimate: string | null = null;
    if (semestersLeft !== null) {
      const future = new Date();
      future.setMonth(future.getMonth() + semestersLeft * 6);
      const sem = future.getMonth() < 6 ? 1 : 2;
      graduationEstimate = `S${sem} ${future.getFullYear()}`;
    }

    const onTrack =
      completedCredits >= Math.floor((totalCredits / 8) * student.currentSemester * 0.9);

    res.json({ completedCredits, totalCredits, pct, graduationEstimate, onTrack });
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute degree progress' });
  }
});

studentAnalyticsRouter.get('/academic-standing', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { cumulativeGpa: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const gpa = student.cumulativeGpa ?? 0;

    let standing: string, label: string, colorKey: string;
    if (gpa >= 3.7) {
      standing = 'deans_list'; label = "Dean's List"; colorKey = 'dark';
    } else if (gpa >= 2.0) {
      standing = 'good'; label = 'Good Standing'; colorKey = 'green';
    } else if (gpa >= 1.5) {
      standing = 'warning'; label = 'Academic Warning'; colorKey = 'amber';
    } else {
      standing = 'probation'; label = 'Academic Probation'; colorKey = 'red';
    }

    res.json({ standing, label, colorKey, gpa });
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute academic standing' });
  }
});

studentAnalyticsRouter.get('/grade-trend', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, finalGrade: { not: null } },
      select: { semester: true, year: true, finalGrade: true },
      orderBy: [{ year: 'asc' }, { semester: 'asc' }],
    });

    const groupMap = new Map<string, { label: string; grades: number[] }>();
    for (const e of enrollments) {
      const key = `${e.year}-${e.semester}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { label: `S${e.semester} ${e.year}`, grades: [] });
      }
      groupMap.get(key)!.grades.push(e.finalGrade!);
    }

    const semesters = Array.from(groupMap.values()).map(({ label, grades }) => ({
      label,
      avgGrade: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
    }));

    res.json({ semesters, hasEnoughData: semesters.length >= 2 });
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute grade trend' });
  }
});

studentAnalyticsRouter.get('/recommended-courses', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { majorId: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [posItems, enrollments] = await Promise.all([
      prisma.programOfStudyItem.findMany({
        where: { majorId: student.majorId },
        include: {
          course: {
            select: { courseId: true, code: true, name: true, credits: true, prerequisites: true },
          },
        },
        orderBy: { semester: 'asc' },
      }),
      prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true, status: true, finalGrade: true, course: { select: { code: true } } },
      }),
    ]);

    const completedCodes = new Set(
      enrollments.filter(isCompleted).map(e => e.course.code)
    );
    const inProgressIds = new Set(
      enrollments.filter(isActive).map(e => e.courseId)
    );

    const eligible = posItems.filter(item => {
      if (completedCodes.has(item.course.code)) return false;
      if (inProgressIds.has(item.courseId)) return false;
      return item.course.prerequisites.every(prereq => completedCodes.has(prereq));
    });

    const courses = eligible.slice(0, 4).map(item => ({
      code: item.course.code,
      name: item.course.name,
      credits: item.course.credits,
      recommendedSemester: item.semester,
    }));

    res.json({ courses });
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute recommended courses' });
  }
});

studentAnalyticsRouter.get('/prerequisite-violations', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const violations = await detectPrerequisiteViolations(studentId);
    // Map to the existing response shape so frontend stays unchanged
    res.json({ violations: violations.map(v => ({ courseName: v.courseName, missingPrereq: v.missingPrerequisiteCode })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check prerequisite violations' });
  }
});

studentAnalyticsRouter.get('/advisor-messages', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const flags = await prisma.studentFlag.findMany({
      where: { studentId, isVisibleToStudent: true, resolvedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { flagId: true, note: true, createdAt: true },
    });

    res.json({ flags });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch advisor messages' });
  }
});

const VALID_TOPICS = [
  'Academic Planning',
  'Course Selection',
  'Grade Concern',
  'Major Change',
  'Other',
] as const;

studentAnalyticsRouter.get('/appointments', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const appointments = await prisma.appointmentRequest.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(appointments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

studentAnalyticsRouter.post('/appointments', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { topic, requestedDate, notes } = req.body;

    if (!topic || !VALID_TOPICS.includes(topic)) {
      return res.status(400).json({ error: `topic must be one of: ${VALID_TOPICS.join(', ')}` });
    }
    if (!requestedDate) {
      return res.status(400).json({ error: 'requestedDate is required' });
    }

    const appointment = await prisma.appointmentRequest.create({
      data: {
        studentId,
        topic,
        requestedDate: new Date(requestedDate),
        notes: notes ?? null,
        status: 'pending',
      },
    });
    res.status(201).json(appointment);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create appointment request' });
  }
});
