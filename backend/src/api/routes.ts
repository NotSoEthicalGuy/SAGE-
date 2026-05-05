/**
 * SAGE — Main API Router
 * Mounts all sub-routers with auth protection
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { analyzeStudent } from '../services/aiOrchestrator';
import { requireAuth, requireAdvisor } from '../middleware/auth';
import { updateInterventionOutcomes } from '../services/interventionService';

export const router = Router();

//----------------------------------------------------------
// University Routes (backward compatible, now with auth)
//----------------------------------------------------------

// GET /api/majors - list all majors
router.get('/majors', requireAuth, async (_req: Request, res: Response) => {
  try {
    const majors = await prisma.major.findMany({ orderBy: { name: 'asc' } });
    res.json(majors);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch majors' });
  }
});

// GET /api/majors/:majorId/courses - list courses for a major
router.get('/majors/:majorId/courses', requireAuth, async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      where: { majorId: req.params.majorId },
      include: { skills: true, materials: { select: { materialId: true, fileName: true, fileType: true, uploadedAt: true } } },
      orderBy: { semesterOffered: 'asc' },
    });
    res.json(courses);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

//----------------------------------------------------------
// Student Routes
//----------------------------------------------------------

// GET /api/students - list students
// Advisors see only students from their assigned major, admins see all
router.get('/students', requireAuth, async (req: Request, res: Response) => {
  try {
    const where: any = { isActive: true };
    if (req.user?.role === 'advisor') {
      // Get the advisor's assigned major
      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user.id },
        select: { majorId: true }
      });
      if (advisor?.majorId) {
        where.majorId = advisor.majorId;
      } else {
        // If advisor has no major assigned, return no students
        return res.json([]);
      }
    }
    // Admin can filter by advisorId or majorId
    if (req.user?.role === 'admin') {
      if (req.query.advisorId) where.advisorId = req.query.advisorId;
      if (req.query.majorId) where.majorId = req.query.majorId;
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        major: true,
        advisor: { select: { advisorId: true, name: true } },
        aiReports: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/students/:studentId — full student profile
router.get('/students/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { studentId: req.params.studentId },
      include: {
        major: true,
        advisor: { select: { advisorId: true, name: true, email: true } },
        enrollments: {
          orderBy: [{ year: 'asc' }, { semester: 'asc' }],
          include: {
            course: true,
            exams: { orderBy: { examDate: 'asc' } },
          },
        },
        aiReports: { orderBy: { generatedAt: 'desc' } },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Advisors can only see students from their assigned major
    if (req.user?.role === 'advisor') {
      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user.id },
        select: { majorId: true }
      });
      if (!advisor?.majorId || student.majorId !== advisor.majorId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(student);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// ─────────────────────────────────────────────
// AI ANALYSIS ROUTES
// ─────────────────────────────────────────────

// POST /api/students/:studentId/analyze — run AI analysis
router.post('/students/:studentId/analyze', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const result = await analyzeStudent(req.params.studentId);

    const mappedResult = {
      driftScore: result.drift_score,
      driftLevel: result.drift_level,
      trajectorySummary: result.trajectory_summary,
      driftSignals: result.drift_signals.map((s: any) => ({
        signalType: s.signal_type,
        severity: s.severity,
        description: s.description,
        affectedCourses: s.affected_courses,
      })),
      strengths: result.strengths.map((s: any) => ({
        domain: s.domain,
        evidence: s.evidence,
        relevantCourses: s.relevant_courses,
      })),
      weaknesses: result.weaknesses.map((w: any) => ({
        domain: w.domain,
        evidence: w.evidence,
        relevantCourses: w.relevant_courses,
      })),
      isRerouteRecommended: result.is_reroute_recommended,
      recommendations: result.recommendations
        ? result.recommendations.map((r: any) => ({
            majorName: r.major_name,
            matchScore: r.match_score,
            reasoning: r.reasoning,
            transferableCreditsEstimate: r.transferable_credits_estimate,
            keyMatchingDomains: r.key_matching_domains,
          }))
        : null,
      confidence: result.confidence,
      dataGaps: result.data_gaps,
    };

    updateInterventionOutcomes(req.params.studentId, result.drift_score, new Date()).catch((err: any) => {
      console.warn('[SAGE] interventionOutcome update failed (non-critical):', err?.message);
    });

    res.json(mappedResult);
  } catch (e: any) {
    console.error('[SAGE] Analysis error:', e.message);
    if (e.message.includes('not found')) {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: `AI analysis failed: ${e.message}` });
  }
});

// GET /api/students/:studentId/reports — all AI reports for a student
router.get('/students/:studentId/reports', requireAuth, async (req: Request, res: Response) => {
  try {
    const reports = await prisma.aIReport.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { generatedAt: 'desc' },
    });
    res.json(reports);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PATCH /api/students/:studentId/reports/:reportId/notes — advisor adds notes
router.patch(
  '/students/:studentId/reports/:reportId/notes',
  requireAdvisor,
  async (req: Request, res: Response) => {
    try {
      const { notes } = req.body;
      const report = await prisma.aIReport.update({
        where: { reportId: req.params.reportId },
        data: { advisorNotes: notes },
      });
      res.json({ status: 'updated', report });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update notes' });
    }
  }
);

// GET /api/stats — system-wide stats for admin dashboard
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const [totalStudents, totalAdvisors, totalMajors, totalCourses, reportStats] = await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.advisor.count(),
      prisma.major.count(),
      prisma.course.count(),
      prisma.aIReport.groupBy({
        by: ['driftLevel'],
        _count: true,
        where: {
          generatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
          },
        },
      }),
    ]);

    const driftDistribution = {
      on_track: 0,
      early_warning: 0,
      drifting: 0,
      critical: 0,
    } as Record<string, number>;

    for (const stat of reportStats) {
      driftDistribution[stat.driftLevel] = stat._count;
    }

    res.json({ totalStudents, totalAdvisors, totalMajors, totalCourses, driftDistribution });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
