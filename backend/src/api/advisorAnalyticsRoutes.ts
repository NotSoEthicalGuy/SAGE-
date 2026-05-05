import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireRole } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const anthropic = new Anthropic();

const PathwaySchema = z.object({
  semestersRemaining: z.number().int(),
  projectedGraduationDate: z.string(),
  onTrack: z.boolean(),
  semesterPlan: z.array(z.object({
    semesterNumber: z.number().int(),
    year: z.number().int(),
    courseCodes: z.array(z.string()),
  })),
  prerequisiteViolations: z.array(z.string()),
  recoveryPlan: z.array(z.object({
    semesterNumber: z.number().int(),
    year: z.number().int(),
    courseCodes: z.array(z.string()),
  })).optional(),
});

const AlternativePathwaySchema = PathwaySchema.extend({
  transferableCredits: z.number().int(),
  newCoursesRequired: z.array(z.string()),
});

const TriageSchema = z.array(z.object({
  studentId: z.string(),
  studentName: z.string(),
  urgencyScore: z.number().int().min(0).max(100),
  urgencyLevel: z.enum(['immediate', 'high', 'monitor', 'healthy']),
  topThreeReasons: z.array(z.string()).length(3),
  recommendedAction: z.string(),
}));

export const advisorAnalyticsRouter = Router();

const VALID_FLAG_TYPES = [
  'Academic Hold',
  'At Risk',
  'Follow Up Required',
  'Prerequisite Violation',
  'Positive Progress',
] as const;

// ─────────────────────────────────────────────
// FLAGS
// ─────────────────────────────────────────────

advisorAnalyticsRouter.post(
  '/students/:id/flags',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const { flagType, note, isVisibleToStudent } = req.body;
      if (!flagType || !VALID_FLAG_TYPES.includes(flagType)) {
        return res.status(400).json({ error: `flagType must be one of: ${VALID_FLAG_TYPES.join(', ')}` });
      }
      if (!note) return res.status(400).json({ error: 'note is required' });

      const flag = await prisma.studentFlag.create({
        data: {
          studentId: req.params.id,
          advisorId: req.user!.id,
          flagType,
          note,
          isVisibleToStudent: isVisibleToStudent ?? false,
        },
      });
      res.status(201).json(flag);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create flag' });
    }
  }
);

advisorAnalyticsRouter.get(
  '/students/:id/flags',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.active === 'true';
      const flags = await prisma.studentFlag.findMany({
        where: {
          studentId: req.params.id,
          ...(activeOnly ? { resolvedAt: null } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(flags);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch flags' });
    }
  }
);

advisorAnalyticsRouter.patch(
  '/flags/:id',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const existing = await prisma.studentFlag.findUnique({ where: { flagId: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Flag not found' });
      if (existing.advisorId !== req.user!.id) return res.status(403).json({ error: 'Only the creator may update this flag' });

      const { resolvedAt, note, isVisibleToStudent } = req.body;
      const flag = await prisma.studentFlag.update({
        where: { flagId: req.params.id },
        data: {
          ...(resolvedAt !== undefined ? { resolvedAt: resolvedAt ? new Date(resolvedAt) : null } : {}),
          ...(note !== undefined ? { note } : {}),
          ...(isVisibleToStudent !== undefined ? { isVisibleToStudent } : {}),
        },
      });
      res.json(flag);
    } catch (e: any) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Flag not found' });
      res.status(500).json({ error: 'Failed to update flag' });
    }
  }
);

advisorAnalyticsRouter.delete(
  '/flags/:id',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const flag = await prisma.studentFlag.findUnique({ where: { flagId: req.params.id } });
      if (!flag) return res.status(404).json({ error: 'Flag not found' });
      if (flag.advisorId !== req.user!.id) return res.status(403).json({ error: 'Only the creator may delete this flag' });

      await prisma.studentFlag.delete({ where: { flagId: req.params.id } });
      res.json({ deleted: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete flag' });
    }
  }
);

// ─────────────────────────────────────────────
// GRADUATION PATHWAY
// ─────────────────────────────────────────────

advisorAnalyticsRouter.get(
  '/students/:id/graduation-pathway',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const plan = await prisma.studentPlan.findFirst({
        where: { studentId: req.params.id, advisorId: req.user!.id },
        orderBy: { generatedAt: 'desc' },
      });
      if (!plan) return res.json(null);
      res.json({ ...plan, pathway: plan.semesterPlans });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch graduation pathway' });
    }
  }
);

advisorAnalyticsRouter.post(
  '/students/:id/graduation-pathway',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user!.id },
        select: { majorId: true },
      });
      if (!advisor?.majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

      const student = await prisma.student.findUnique({
        where: { studentId: req.params.id },
        include: {
          major: {
            include: {
              courses: {
                select: {
                  code: true, name: true, credits: true,
                  prerequisites: true, semesterOffered: true,
                },
              },
            },
          },
          enrollments: {
            include: { course: { select: { code: true, name: true, credits: true } } },
            orderBy: [{ year: 'asc' }, { semester: 'asc' }],
          },
        },
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.majorId !== advisor.majorId) return res.status(403).json({ error: 'Access denied' });

      const completedCourses = student.enrollments
        .filter(e => e.finalGrade !== null || e.status === 'completed')
        .map(e => ({ code: e.course.code, name: e.course.name, credits: e.course.credits }));

      const inProgressCourses = student.enrollments
        .filter(e => ['in_progress', 'registered', 'approved', 'pending'].includes(e.status) && e.finalGrade === null)
        .map(e => ({ code: e.course.code, name: e.course.name, credits: e.course.credits }));

      const completedCredits = completedCourses.reduce((s, c) => s + c.credits, 0);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentSemester = now.getMonth() < 6 ? 1 : 2;

      const prompt = `You are an academic advisor system. Generate a graduation pathway for this student.

Student: ${student.name}
Major: ${student.major.name} (${student.major.totalCredits} total credits required)
Current Semester: ${student.currentSemester}
Cumulative GPA: ${student.cumulativeGpa ?? 'N/A'}
Credits Completed: ${completedCredits}
Credits Remaining: ${student.major.totalCredits - completedCredits}
Current Year/Semester: ${currentYear} S${currentSemester}

Completed Courses: ${completedCourses.map(c => c.code).join(', ') || 'None'}
In-Progress Courses: ${inProgressCourses.map(c => c.code).join(', ') || 'None'}

All Major Courses with prerequisites:
${student.major.courses.map(c => `- ${c.code}: ${c.name} (${c.credits}cr, prereqs: ${c.prerequisites.join(', ') || 'none'})`).join('\n')}

Return ONLY valid JSON matching this schema:
{
  "semestersRemaining": <integer>,
  "projectedGraduationDate": "<e.g. S2 2026>",
  "onTrack": <boolean>,
  "semesterPlan": [{"semesterNumber": <int>, "year": <int>, "courseCodes": ["CS301", ...]}],
  "prerequisiteViolations": ["<description if any>"],
  "recoveryPlan": [{"semesterNumber": <int>, "year": <int>, "courseCodes": [...]}]
}

Rules:
- Respect all prerequisite chains
- Assume 4-5 courses per semester max
- semesterPlan starts from the NEXT semester (not current)
- Only include courses not yet completed
- recoveryPlan is required if onTrack is false`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = message.content[0];
      if (block.type !== 'text') return res.status(502).json({ error: 'Unexpected Claude response type' });
      const raw = block.text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '');
      const jsonMatch = raw.match(/\{[\s\S]*\}/s);
      if (!jsonMatch) return res.status(502).json({ error: 'Claude returned non-JSON response' });
      let jsonParsed: any;
      try {
        jsonParsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(502).json({ error: 'Claude returned malformed JSON' });
      }

      const parsed = PathwaySchema.parse(jsonParsed);

      const plan = await prisma.studentPlan.create({
        data: {
          studentId: req.params.id,
          advisorId: req.user!.id,
          semesterPlans: parsed as any,
          isAiGenerated: true,
        },
      });

      res.json({ ...plan, pathway: parsed });
    } catch (e: any) {
      if (e?.name === 'ZodError') {
        return res.status(502).json({ error: 'Claude response failed validation', details: e.errors });
      }
      res.status(500).json({ error: 'Failed to generate graduation pathway' });
    }
  }
);

advisorAnalyticsRouter.post(
  '/students/:id/graduation-pathway/alternative',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user!.id },
        select: { majorId: true },
      });
      if (!advisor?.majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

      const { targetMajorId } = req.body;
      if (!targetMajorId) return res.status(400).json({ error: 'targetMajorId is required' });

      const [student, targetMajor] = await Promise.all([
        prisma.student.findUnique({
          where: { studentId: req.params.id },
          include: {
            major: { select: { name: true, totalCredits: true } },
            enrollments: {
              include: { course: { select: { code: true, name: true, credits: true } } },
              where: { OR: [{ finalGrade: { not: null } }, { status: 'completed' }] },
            },
          },
        }),
        prisma.major.findUnique({
          where: { majorId: targetMajorId },
          include: {
            courses: {
              select: {
                code: true, name: true, credits: true,
                prerequisites: true, semesterOffered: true,
              },
            },
          },
        }),
      ]);

      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.majorId !== advisor.majorId) return res.status(403).json({ error: 'Access denied' });
      if (!targetMajor) return res.status(404).json({ error: 'Target major not found' });

      const completedCodes = new Set(student.enrollments.map(e => e.course.code));
      const completedCredits = student.enrollments.reduce((s, e) => s + e.course.credits, 0);
      const transferable = targetMajor.courses.filter(c => completedCodes.has(c.code));
      const transferableCredits = transferable.reduce((s, c) => s + c.credits, 0);
      const newRequired = targetMajor.courses.filter(c => !completedCodes.has(c.code));

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentSemester = now.getMonth() < 6 ? 1 : 2;

      const prompt = `Generate an alternative graduation pathway if this student switches majors.

Student: ${student.name}
Current Major: ${student.major.name}
Target Major: ${targetMajor.name} (${targetMajor.totalCredits} total credits)
Completed Credits (any major): ${completedCredits}
Transferable Credits to ${targetMajor.name}: ${transferableCredits}
Current Year/Semester: ${currentYear} S${currentSemester}

Completed Courses (codes): ${[...completedCodes].join(', ') || 'None'}

New Courses Required in ${targetMajor.name}:
${newRequired.map(c => `- ${c.code}: ${c.name} (${c.credits}cr, prereqs: ${c.prerequisites.join(', ') || 'none'})`).join('\n')}

Return ONLY valid JSON:
{
  "semestersRemaining": <integer>,
  "projectedGraduationDate": "<e.g. S1 2027>",
  "onTrack": <boolean>,
  "semesterPlan": [{"semesterNumber": <int>, "year": <int>, "courseCodes": [...]}],
  "prerequisiteViolations": [],
  "transferableCredits": ${transferableCredits},
  "newCoursesRequired": [${newRequired.map(c => `"${c.code}"`).join(', ')}]
}`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = message.content[0];
      if (block.type !== 'text') return res.status(502).json({ error: 'Unexpected Claude response type' });
      const raw = block.text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '');
      const jsonMatch = raw.match(/\{[\s\S]*\}/s);
      if (!jsonMatch) return res.status(502).json({ error: 'Claude returned non-JSON response' });
      let jsonParsed: any;
      try {
        jsonParsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(502).json({ error: 'Claude returned malformed JSON' });
      }

      const parsed = AlternativePathwaySchema.parse(jsonParsed);
      res.json(parsed);
    } catch (e: any) {
      if (e?.name === 'ZodError') {
        return res.status(502).json({ error: 'Claude response failed validation', details: e.errors });
      }
      res.status(500).json({ error: 'Failed to generate alternative pathway' });
    }
  }
);

// ─────────────────────────────────────────────
// TRIAGE
// ─────────────────────────────────────────────

advisorAnalyticsRouter.post(
  '/triage',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const semester = now.getMonth() < 6 ? 1 : 2;
      const year = now.getFullYear();

      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user!.id },
        select: { majorId: true },
      });
      if (!advisor?.majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

      const students = await prisma.student.findMany({
        where: { majorId: advisor.majorId, isActive: true },
        include: {
          enrollments: {
            include: { course: { select: { code: true, name: true } } },
            orderBy: [{ year: 'asc' }, { semester: 'asc' }],
          },
          aiReports: { orderBy: { generatedAt: 'desc' }, take: 1 },
        },
      });

      if (students.length === 0) return res.status(400).json({ error: 'No students found for your major' });

      const studentSummaries = students.map(s => {
        const report = s.aiReports[0];
        const activeEnrollments = s.enrollments.filter(e =>
          ['in_progress', 'registered', 'approved', 'pending'].includes(e.status)
        );
        return `Student: ${s.name} (ID: ${s.studentId})
  GPA: ${s.cumulativeGpa ?? 'N/A'}
  Semester: ${s.currentSemester}
  Drift Level: ${report?.driftLevel ?? 'not analyzed'}
  Drift Score: ${report ? (report.driftScore * 100).toFixed(0) + '%' : 'N/A'}
  Current Courses: ${activeEnrollments.map(e => e.course.code).join(', ') || 'None'}`;
      }).join('\n\n');

      const prompt = `You are an academic advisor triage system. Analyze all students and assign urgency scores.

Semester: S${semester} ${year}

Students:
${studentSummaries}

For EACH student, return a JSON array:
[{
  "studentId": "<exact studentId from above>",
  "studentName": "<exact name from above>",
  "urgencyScore": <0-100 integer, higher = more urgent>,
  "urgencyLevel": "<immediate|high|monitor|healthy>",
  "topThreeReasons": ["reason1", "reason2", "reason3"],
  "recommendedAction": "<one concise action>"
}]

urgencyLevel rules:
- immediate: urgencyScore >= 75
- high: urgencyScore >= 50
- monitor: urgencyScore >= 25
- healthy: urgencyScore < 25

Return ONLY the JSON array, no other text.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = message.content[0];
      if (block.type !== 'text') return res.status(502).json({ error: 'Unexpected Claude response type' });
      const raw = block.text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '');
      const jsonMatch = raw.match(/\[[\s\S]*\]/s);
      if (!jsonMatch) return res.status(502).json({ error: 'Claude returned non-JSON response' });

      let jsonParsed: any;
      try {
        jsonParsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(502).json({ error: 'Claude returned malformed JSON' });
      }

      const parsed = TriageSchema.parse(jsonParsed);

      const triageRun = await prisma.triageRun.create({
        data: {
          advisorId: req.user!.id,
          semester,
          year,
          result: parsed as any,
        },
      });

      res.json({ triageRunId: triageRun.id, runAt: triageRun.runAt, semester, year, students: parsed });
    } catch (e: any) {
      if (e?.name === 'ZodError') {
        return res.status(502).json({ error: 'Claude response failed validation', details: e.errors });
      }
      res.status(500).json({ error: 'Failed to run triage' });
    }
  }
);

advisorAnalyticsRouter.get(
  '/triage/latest',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const run = await prisma.triageRun.findFirst({
        where: { advisorId: req.user!.id },
        orderBy: { runAt: 'desc' },
      });
      if (!run) return res.json(null);

      res.json({
        triageRunId: run.id,
        runAt: run.runAt,
        semester: run.semester,
        year: run.year,
        students: run.result,
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch latest triage' });
    }
  }
);

// ─────────────────────────────────────────────
// INTERVENTIONS
// ─────────────────────────────────────────────

advisorAnalyticsRouter.post(
  '/students/:id/interventions',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const { interventionType, notes, interventionDate } = req.body;
      if (!interventionType) return res.status(400).json({ error: 'interventionType is required' });
      if (!interventionDate) return res.status(400).json({ error: 'interventionDate is required' });
      const parsedDate = new Date(interventionDate);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'interventionDate must be a valid ISO date string' });

      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user!.id },
        select: { majorId: true },
      });
      if (!advisor?.majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

      const student = await prisma.student.findUnique({
        where: { studentId: req.params.id },
        select: { majorId: true },
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.majorId !== advisor.majorId) return res.status(403).json({ error: 'Access denied' });

      const latestReport = await prisma.aIReport.findFirst({
        where: { studentId: req.params.id },
        orderBy: { generatedAt: 'desc' },
        select: { driftScore: true },
      });

      const intervention = await prisma.$transaction(async (tx) => {
        const created = await tx.intervention.create({
          data: {
            studentId: req.params.id,
            advisorId: req.user!.id,
            interventionType,
            notes: notes ?? null,
            interventionDate: parsedDate,
          },
        });
        if (latestReport) {
          await tx.interventionOutcome.create({
            data: {
              interventionId: created.id,
              driftScoreBefore: latestReport.driftScore,
            },
          });
        }
        return created;
      });

      const full = await prisma.intervention.findUnique({
        where: { id: intervention.id },
        include: { outcome: true },
      });

      res.status(201).json(full);
    } catch (e) {
      res.status(500).json({ error: 'Failed to log intervention' });
    }
  }
);

advisorAnalyticsRouter.get(
  '/students/:id/interventions',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user!.id },
        select: { majorId: true },
      });
      if (!advisor?.majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

      const student = await prisma.student.findUnique({
        where: { studentId: req.params.id },
        select: { majorId: true },
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.majorId !== advisor.majorId) return res.status(403).json({ error: 'Access denied' });

      const interventions = await prisma.intervention.findMany({
        where: { studentId: req.params.id },
        include: { outcome: true },
        orderBy: { interventionDate: 'desc' },
      });
      res.json(interventions);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch interventions' });
    }
  }
);

advisorAnalyticsRouter.get(
  '/intervention-effectiveness',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const outcomes = await prisma.interventionOutcome.findMany({
        where: {
          driftScoreAfter: { not: null },
          effectivenessScore: { not: null },
          intervention: { advisorId: req.user!.id },
        },
        include: { intervention: { select: { interventionType: true } } },
      });

      const byType = new Map<string, { scores: number[]; successes: number }>();
      for (const o of outcomes) {
        const type = o.intervention.interventionType;
        if (!byType.has(type)) byType.set(type, { scores: [], successes: 0 });
        const entry = byType.get(type)!;
        const score = o.effectivenessScore as number;
        entry.scores.push(score);
        if (score > 0) entry.successes++;
      }

      const result = Array.from(byType.entries()).map(([interventionType, { scores, successes }]) => ({
        interventionType,
        timesUsed: scores.length,
        avgEffectiveness: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
        successRate: Math.round((successes / scores.length) * 100),
      })).sort((a, b) => b.successRate - a.successRate);

      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch intervention effectiveness' });
    }
  }
);
