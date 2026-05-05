/**
 * SAGE — Academic DNA Route
 * POST /api/students/:studentId/dna
 * Analyzes student archetype against historical patterns
 */

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../db/client';
import { requireAdvisor } from '../middleware/auth';

export const dnaRouter = Router();

const client = new Anthropic();

const ARCHETYPES = [
  'The Wrong Major',
  'The Late Drifter',
  'The Overloader',
  'The Core Avoider',
];

const DNA_SYSTEM_PROMPT = `You are SAGE's Academic DNA engine. You analyze a student's performance pattern and classify them into one of four academic archetypes.

ARCHETYPES:
1. "The Wrong Major" — Student's skills and strengths are clearly misaligned with their declared major. They perform well in courses that belong to a different field. This is not about effort — it's about fundamental domain mismatch.

2. "The Late Drifter" — Student started with strong performance but shows a clear declining trend over semesters. Early semesters look healthy; later semesters show deterioration. Often caused by increasing course difficulty in core areas.

3. "The Overloader" — Student's performance correlates strongly with course load. When taking more credits, grades drop across the board. Performance recovers when fewer courses are taken. Often high-achieving students who over-extend.

4. "The Core Avoider" — Student systematically underperforms in required/core courses while excelling in electives or softer courses. May be deliberately or unconsciously avoiding the hard requirements of their major.

OUTPUT FORMAT — return ONLY a valid JSON object:
{
  "archetype": "The Wrong Major" | "The Late Drifter" | "The Overloader" | "The Core Avoider",
  "confidence": float (0.0–1.0),
  "reasoning": "2-3 sentences explaining why this archetype fits this specific student",
  "predicted_outcome": "1-2 sentences on what typically happens to students with this pattern if no intervention occurs",
  "interventions": ["short actionable intervention 1", "short actionable intervention 2", "short actionable intervention 3"]
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

Classify this student into one of the four archetypes and return only the JSON object.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
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
    res.json(result);
  } catch (e: any) {
    console.error('[SAGE] DNA error:', e.message);
    res.status(500).json({ error: 'DNA analysis failed: ' + e.message });
  }
});
