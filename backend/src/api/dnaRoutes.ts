/**
 * SAGE — Academic DNA Route
 * POST /api/students/:studentId/dna
 * Analyzes student archetype against historical patterns
 */

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { requireAdvisor } from '../middleware/auth';

export const dnaRouter = Router();

interface SkillGrade {
  name: string;
  score: number;
  isUniversal: boolean;
}

interface AdvisorEdit {
  skillName: string;
  scoreBefore: number;
  scoreAfter: number;
}

const client = new Anthropic();

const ARCHETYPES = [
  'Square Peg',
  'Fading Student',
  'Overcommitter',
  'Selective Student',
  'Underdeliverer',
];

const DNA_SYSTEM_PROMPT = `You are SAGE's Academic DNA engine. Analyze a student's performance pattern and classify them into one of five academic archetypes. Then grade the student on 10 skills: 5 universal and 5 major-specific.

ARCHETYPES:
1. "Square Peg" — Student's skills and major point in opposite directions. Performs significantly better outside their declared field. This is a domain mismatch, not an effort problem.
2. "Fading Student" — Student started with ability. Performance has declined semester over semester with no recovery. Something changed and has not been corrected.
3. "Overcommitter" — Student takes on more than they can perform under. Grades drop under heavy loads and recover with fewer courses. The issue is capacity judgment, not intelligence.
4. "Selective Student" — Student excels in courses they choose to engage with and consistently underperforms in required major coursework. They are avoiding the hard requirements of their program.
5. "Underdeliverer" — No single dramatic pattern. A consistent, broad gap between what the program demands and what the student produces across all areas.

UNIVERSAL SKILLS — grade all five for every student (0–100, derived from their academic record):
- Critical Thinking: ability to reason through complex problems, evident in performance on analytical/research courses
- Resilience: ability to maintain or recover performance after setbacks (failed courses, bad semesters, external pressures evident in the record)
- Consistency: stability of output over time — low variance across semesters and course types
- Self-Management: evidence of appropriate course load choices, meeting requirements on schedule, avoiding repeated withdrawals
- Motivation: sustained engagement — consistent attendance, completion rate, effort visible in grade trends

MAJOR-SPECIFIC SKILLS — identify 5 skills that students in the declared major are expected to develop. Grade the student on each based strictly on their academic record and course performance patterns. Choose skills that are specific and meaningful for that field (e.g., for Computer Science: Algorithmic Thinking, Problem Decomposition; for Business: Strategic Reasoning, Quantitative Aptitude; for Engineering: Systems Thinking, Mathematical Precision).

GRADING GUIDANCE:
- 80–100: Strong evidence of this skill in the academic record
- 60–79: Mixed evidence — present but inconsistent
- 40–59: Weak evidence — skill not reliably demonstrated
- 0–39: Clear evidence of absence or significant deficit

OUTPUT FORMAT — return ONLY a valid JSON object:
{
  "archetype": "Square Peg" | "Fading Student" | "Overcommitter" | "Selective Student" | "Underdeliverer",
  "confidence": float (0.0–1.0),
  "reasoning": "2-3 sentences explaining why this archetype fits this specific student",
  "predicted_outcome": "1-2 sentences on what typically happens to students with this pattern if no intervention occurs",
  "interventions": ["short actionable intervention 1", "short actionable intervention 2", "short actionable intervention 3"],
  "skill_grades": [
    {"name": "Critical Thinking", "score": integer (0-100), "is_universal": true},
    {"name": "Resilience", "score": integer (0-100), "is_universal": true},
    {"name": "Consistency", "score": integer (0-100), "is_universal": true},
    {"name": "Self-Management", "score": integer (0-100), "is_universal": true},
    {"name": "Motivation", "score": integer (0-100), "is_universal": true},
    {"name": "<major-specific skill 1>", "score": integer (0-100), "is_universal": false},
    {"name": "<major-specific skill 2>", "score": integer (0-100), "is_universal": false},
    {"name": "<major-specific skill 3>", "score": integer (0-100), "is_universal": false},
    {"name": "<major-specific skill 4>", "score": integer (0-100), "is_universal": false},
    {"name": "<major-specific skill 5>", "score": integer (0-100), "is_universal": false}
  ]
}`;

dnaRouter.post('/students/:studentId/dna', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { studentId: req.params.studentId },
      include: {
        major: true,
        enrollments: {
          include: { course: { select: { code: true, name: true, semesterOffered: true } }, exams: true },
          orderBy: [{ year: 'asc' }, { semester: 'asc' }],
        },
        aiReports: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Build semester-by-semester performance summary
    const bySemester = new Map<string, typeof student.enrollments>();
    for (const e of student.enrollments) {
      const key = `${e.year}-${e.semester}`;
      if (!bySemester.has(key)) bySemester.set(key, []);
      bySemester.get(key)!.push(e);
    }

    const semesterSummaries = Array.from(bySemester.entries()).map(([key, enrollments]) => {
      const grades = enrollments.map(e => e.finalGrade).filter(Boolean) as number[];
      const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
      return {
        semester: key,
        courseCount: enrollments.length,
        avg: avg?.toFixed(1),
        courses: enrollments.map(e => `${e.course.code} (${e.finalGrade ?? 'IP'})`),
      };
    });

    const userPrompt = `Analyze this student for Academic DNA archetype classification.

Student: ${student.name}
Major: ${student.major.name}  
GPA: ${student.cumulativeGpa ?? 'Unknown'}
Semester: ${student.currentSemester}

SEMESTER-BY-SEMESTER PERFORMANCE:
${semesterSummaries.map(s => `${s.semester}: ${s.courseCount} courses, avg ${s.avg ?? 'N/A'}/100 | ${s.courses.join(', ')}`).join('\n')}

${student.aiReports[0] ? `LATEST DRIFT ANALYSIS:
Score: ${(student.aiReports[0].driftScore * 100).toFixed(0)}% (${student.aiReports[0].driftLevel})
${student.aiReports[0].trajectorySummary}` : ''}

Classify this student into one of the five archetypes and grade their skills. Return only the JSON object.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: DNA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let raw = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('').trim();

    if (raw.startsWith('```')) {
      const parts = raw.split('```');
      raw = parts[1] ?? parts[0];
      if (raw.startsWith('json')) raw = raw.slice(4);
      raw = raw.trim();
    }

    const result = JSON.parse(raw);
    if (!ARCHETYPES.includes(result.archetype)) {
      return res.status(500).json({ error: `Invalid archetype returned: ${result.archetype}` });
    }

    const saved = await prisma.dnaResult.create({
      data: {
        studentId: req.params.studentId,
        advisorId: (req as any).user.id,
        archetype: result.archetype,
        confidence: result.confidence,
        reasoning: result.reasoning,
        predictedOutcome: result.predicted_outcome,
        interventions: result.interventions,
        skillGrades: result.skill_grades,
      },
    });

    res.json({ ...result, id: saved.id });
  } catch (e: any) {
    console.error('[SAGE] DNA error:', e.message);
    res.status(500).json({ error: 'DNA analysis failed: ' + e.message });
  }
});

// GET /api/students/:studentId/dna/latest
dnaRouter.get('/students/:studentId/dna/latest', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const result = await prisma.dnaResult.findFirst({
      where: { studentId: req.params.studentId },
      orderBy: { generatedAt: 'desc' },
    });
    if (!result) return res.status(404).json({ error: 'No DNA analysis found' });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch DNA result: ' + e.message });
  }
});

// POST /api/students/:studentId/dna/:dnaResultId/share
dnaRouter.post('/students/:studentId/dna/:dnaResultId/share', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const { advisorNote, editedGrades } = req.body as {
      advisorNote?: string;
      editedGrades?: AdvisorEdit[];
    };

    const dnaResult = await prisma.dnaResult.findUnique({
      where: { id: req.params.dnaResultId },
    });
    if (!dnaResult) return res.status(404).json({ error: 'DNA result not found' });

    // Fix 1: Verify advisor ownership
    if (dnaResult.advisorId !== (req as any).user.id) {
      return res.status(403).json({ error: 'Forbidden: This DNA result belongs to another advisor' });
    }

    // Fix 2: Verify DNA result belongs to this student
    if (dnaResult.studentId !== req.params.studentId) {
      return res.status(400).json({ error: 'DNA result does not belong to this student' });
    }

    // Fix 3: Validate scoreAfter range
    if (editedGrades?.some((e) => e.scoreAfter < 0 || e.scoreAfter > 100)) {
      return res.status(400).json({ error: 'scoreAfter must be between 0 and 100' });
    }

    // Block if student already has an active (non-approved) shared report
    const existing = await prisma.sharedDnaReport.findFirst({
      where: { studentId: req.params.studentId, isApproved: false },
    });
    if (existing) {
      return res.status(409).json({ error: 'Student already has a pending shared report awaiting approval' });
    }

    const originalGrades = dnaResult.skillGrades as unknown as SkillGrade[];

    // Compute finalGrades: start from original, apply advisor edits if any
    const finalGrades: SkillGrade[] = originalGrades.map((g) => {
      const edit = editedGrades?.find((e) => e.skillName === g.name);
      return edit ? { ...g, score: edit.scoreAfter } : g;
    });

    const shared = await prisma.sharedDnaReport.create({
      data: {
        dnaResultId: dnaResult.id,
        studentId: req.params.studentId,
        advisorId: (req as any).user.id,
        advisorNote: advisorNote ?? null,
        originalGrades: originalGrades as unknown as Prisma.InputJsonValue,
        advisorEditedGrades: (editedGrades && editedGrades.length > 0)
          ? (editedGrades as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        finalGrades: finalGrades as unknown as Prisma.InputJsonValue,
      },
    });

    res.json(shared);
  } catch (e: any) {
    res.status(500).json({ error: 'Share failed: ' + e.message });
  }
});
