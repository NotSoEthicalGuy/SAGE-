/**
 * SAGE — AI Chat Route
 * POST /api/students/:studentId/chat
 * Advisor sends a message about a specific student; Claude responds with full context.
 */

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../db/client';
import { requireAdvisor } from '../middleware/auth';

export const chatRouter = Router();

const client = new Anthropic();

chatRouter.post('/students/:studentId/chat', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body; // history: [{role, content}]
    if (!message) return res.status(400).json({ error: 'message is required' });

    // Load student context
    const student = await prisma.student.findUnique({
      where: { studentId: req.params.studentId },
      include: {
        major: true,
        enrollments: {
          include: { course: true, exams: true },
          orderBy: [{ year: 'asc' }, { semester: 'asc' }],
        },
        aiReports: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const latestReport = student.aiReports[0];
    const systemPrompt = `You are SAGE, an AI academic advisor assistant. You are helping an advisor understand a specific student's academic profile.

STUDENT CONTEXT:
Name: ${student.name}
Major: ${student.major.name}
Current Semester: ${student.currentSemester}
GPA: ${student.cumulativeGpa ?? 'Not calculated'}
Enrollment Year: ${student.enrollmentYear}

COURSE HISTORY:
${student.enrollments.map(e =>
  `${e.course.code} — ${e.course.name}: ${e.finalGrade ?? 'In Progress'}/100 (${e.letterGrade ?? '-'}), Semester ${e.semester}`
).join('\n')}

${latestReport ? `LATEST AI ANALYSIS (${new Date(latestReport.generatedAt).toLocaleDateString()}):
Drift Score: ${(latestReport.driftScore * 100).toFixed(0)}% - ${latestReport.driftLevel}
Summary: ${latestReport.trajectorySummary}` : 'No AI analysis has been run yet.'}

Answer the advisor's questions about this student clearly and concisely, using the data above. 
If asked about things outside the available data, say so honestly.`;

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
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    res.json({ reply: text });
  } catch (e: any) {
    console.error('[SAGE] Chat error:', e.message);
    res.status(500).json({ error: 'Chat failed: ' + e.message });
  }
});
