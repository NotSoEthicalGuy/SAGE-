/**
 * SAGE — Admin/Advisor AI Proxy
 */

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../db/client';
import { requireRole } from '../middleware/auth';

export const sageRouter = Router();

const client = new Anthropic();

sageRouter.post('/sage/chat', requireRole('admin', 'advisor'), async (req: Request, res: Response) => {
  try {
    const { message, history, studentId } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    let studentContext = 'No specific student selected.';
    let advisorMajor = null;

    if (req.user?.role === 'advisor') {
      const advisor = await prisma.advisor.findUnique({
        where: { advisorId: req.user.id },
        select: { majorId: true },
      });
      advisorMajor = advisor?.majorId || null;

      if (!studentId) {
        return res.status(400).json({ error: 'studentId is required for advisors' });
      }
    }

    if (studentId) {
      // The advisor UI lets them type either the UUID studentId
      // or the human-readable studentNumber (e.g. "A2111926").
      const student = await prisma.student.findFirst({
        where: { OR: [{ studentId }, { studentNumber: studentId }] },
        include: {
          major: true,
          enrollments: {
            include: { course: true, section: true },
            orderBy: [{ year: 'asc' }, { semester: 'asc' }],
          },
          aiReports: { orderBy: { generatedAt: 'desc' }, take: 1 },
        },
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });

      if (req.user?.role === 'advisor' && advisorMajor && student.majorId !== advisorMajor) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const latestReport = student.aiReports[0];
      studentContext = JSON.stringify(
        {
          name: student.name,
          major: student.major?.name,
          semester: student.currentSemester,
          gpa: student.cumulativeGpa,
          enrollmentYear: student.enrollmentYear,
          enrollments: student.enrollments.map((e) => ({
            course: `${e.course.code} ${e.course.name}`,
            semester: e.semester,
            year: e.year,
            status: e.status,
            finalGrade: e.finalGrade,
          })),
          latestReport: latestReport
            ? {
                driftScore: latestReport.driftScore,
                driftLevel: latestReport.driftLevel,
                summary: latestReport.trajectorySummary,
              }
            : null,
        },
        null,
        2
      );
    }

    const systemPrompt = `You are SAGE, an AI assistant for academic advising and administration.

ROLE: ${req.user?.role}
${advisorMajor ? `ADVISOR_MAJOR_ID: ${advisorMajor}` : ''}

STUDENT_CONTEXT_JSON:
${studentContext}

Answer succinctly. If data is missing, say so.`;

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...(history || []),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    res.json({ reply: text });
  } catch (e: any) {
    console.error('[SAGE] Sage chat error:', e.message);
    res.status(500).json({ error: 'Sage chat failed: ' + e.message });
  }
});
