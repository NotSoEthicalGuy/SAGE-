/**
 * SAGE — Shared DNA Report Routes
 * Student endpoints: view, chat, approve
 */

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../db/client';
import { requireRole } from '../middleware/auth';

export const sharedReportRouter = Router();

const client = new Anthropic();
const requireStudent = requireRole('student');

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

interface ChatMessage {
  role: 'student' | 'sage';
  content: string;
  timestamp: string;
}

const DNA_CHAT_SYSTEM_PROMPT = `You are SAGE, an academic analytics engine. A student is reviewing their Academic DNA skill grades and may challenge specific scores.

YOUR ROLE:
- Explain the evidence behind each grade clearly and directly using the academic record provided
- Listen to the student's argument about a specific grade
- Adjust a score ONLY if the student provides specific, verifiable evidence from their academic record
- Be direct and factual. No sympathy without evidence.
- Do not discuss anything unrelated to this Academic DNA report. If asked, redirect: "I can only discuss your Academic DNA report."

GRADE ADJUSTMENT RULES:
- A vague claim ("I work hard", "I deserve more") is not sufficient — do not adjust
- A specific, verifiable claim ("I maintained all courses while working full time", "I recovered from a failed semester in the next one") justifies adjustment
- Maximum adjustment: ±10 points from the student's current score for that skill
- Each skill can only be adjusted once in this conversation
- If you adjust a score, state clearly: "Adjusted [skill name] from [X] to [Y]."
- Append a grade update tag at the very end of your response if and only if you change a score:
<grade_update>{"skillName": "exact name as shown", "newScore": number}</grade_update>`;

// GET /api/student/shared-report
sharedReportRouter.get('/student/shared-report', requireStudent, async (req: Request, res: Response) => {
  try {
    const report = await prisma.sharedDnaReport.findFirst({
      where: { studentId: (req as any).user.id },
      orderBy: { sharedAt: 'desc' },
      include: {
        dnaResult: {
          select: { archetype: true, confidence: true, reasoning: true, predictedOutcome: true, interventions: true },
        },
      },
    });
    if (!report) return res.status(404).json({ error: 'No shared report found' });
    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch report: ' + e.message });
  }
});

// POST /api/shared-reports/:reportId/chat
sharedReportRouter.post('/shared-reports/:reportId/chat', requireStudent, async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message: string };
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    const report = await prisma.sharedDnaReport.findUnique({
      where: { id: req.params.reportId },
      include: { dnaResult: { select: { archetype: true } } },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.studentId !== (req as any).user.id) return res.status(403).json({ error: 'Forbidden' });
    if (report.isApproved) return res.status(400).json({ error: 'Report already approved' });
    if (report.chatMessageCount >= 5) return res.status(400).json({ error: 'Message limit reached', limitReached: true });

    const finalGrades = report.finalGrades as unknown as SkillGrade[];
    const originalGrades = report.originalGrades as unknown as SkillGrade[];
    const advisorEdits = report.advisorEditedGrades as unknown as AdvisorEdit[] | null;

    // Effective starting grade per skill (post-advisor, pre-chat)
    const effectiveStart = originalGrades.map((g) => {
      const edit = advisorEdits?.find((e) => e.skillName === g.name);
      return { name: g.name, score: edit ? edit.scoreAfter : g.score };
    });

    // Skills already adjusted by student chat (finalGrade differs from effectiveStart)
    const alreadyAdjusted = new Set<string>(
      finalGrades
        .filter((g) => {
          const start = effectiveStart.find((s) => s.name === g.name);
          return start && start.score !== g.score;
        })
        .map((g) => g.name)
    );

    const history = report.chatMessages as unknown as ChatMessage[];

    // Build Claude messages
    const gradeContext = finalGrades
      .map((g) => `${g.name} (${g.isUniversal ? 'universal' : 'major-specific'}): ${g.score}/100`)
      .join('\n');

    const contextMessage = `Student: [authenticated via system]
Archetype: ${report.dnaResult.archetype}

Current skill grades:
${gradeContext}

${alreadyAdjusted.size > 0 ? `Already adjusted this session (cannot be changed again): ${[...alreadyAdjusted].join(', ')}` : ''}`;

    const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: contextMessage },
      { role: 'assistant', content: 'Understood. I have reviewed the student\'s Academic DNA profile and am ready to discuss their grades.' },
      ...history.map((m) => ({
        role: (m.role === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: DNA_CHAT_SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    const rawReply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('').trim();

    // Parse grade update tag
    const gradeUpdateMatch = rawReply.match(/<grade_update>([\s\S]*?)<\/grade_update>/);
    let updatedGrade: { skillName: string; newScore: number } | null = null;
    let newFinalGrades = finalGrades;

    if (gradeUpdateMatch) {
      try {
        const parsed = JSON.parse(gradeUpdateMatch[1].trim()) as { skillName: string; newScore: number };
        const skillIndex = finalGrades.findIndex((g) => g.name === parsed.skillName);
        if (skillIndex !== -1 && !alreadyAdjusted.has(parsed.skillName)) {
          const startScore = effectiveStart.find((s) => s.name === parsed.skillName)?.score ?? finalGrades[skillIndex].score;
          const clamped = Math.max(0, Math.min(100, Math.max(startScore - 10, Math.min(startScore + 10, parsed.newScore))));
          newFinalGrades = finalGrades.map((g, i) => i === skillIndex ? { ...g, score: clamped } : g);
          updatedGrade = { skillName: parsed.skillName, newScore: clamped };
        }
      } catch { /* malformed tag — ignore */ }
    }

    // Clean reply (strip grade_update tag)
    const cleanReply = rawReply.replace(/<grade_update>[\s\S]*?<\/grade_update>/, '').trim();

    const now = new Date().toISOString();
    const updatedHistory: ChatMessage[] = [
      ...history,
      { role: 'student', content: message, timestamp: now },
      { role: 'sage', content: cleanReply, timestamp: now },
    ];

    await prisma.sharedDnaReport.update({
      where: { id: report.id },
      data: {
        chatMessages: updatedHistory as any,
        chatMessageCount: { increment: 1 },
        finalGrades: newFinalGrades as any,
      },
    });

    const remaining = 4 - report.chatMessageCount;
    res.json({
      reply: cleanReply,
      updatedGrade,
      messagesUsed: report.chatMessageCount + 1,
      messagesRemaining: remaining,
      limitReached: remaining <= 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Chat failed: ' + e.message });
  }
});

// POST /api/shared-reports/:reportId/approve
sharedReportRouter.post('/shared-reports/:reportId/approve', requireStudent, async (req: Request, res: Response) => {
  try {
    const report = await prisma.sharedDnaReport.findUnique({
      where: { id: req.params.reportId },
      include: {
        dnaResult: { select: { archetype: true } },
        student: { select: { name: true } },
      },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.studentId !== (req as any).user.id) return res.status(403).json({ error: 'Forbidden' });
    if (report.isApproved) return res.status(400).json({ error: 'Already approved' });

    const finalGrades = report.finalGrades as unknown as SkillGrade[];
    const originalGrades = report.originalGrades as unknown as SkillGrade[];
    const advisorEdits = report.advisorEditedGrades as unknown as AdvisorEdit[] | null;

    const effectiveStart = originalGrades.map((g) => {
      const edit = advisorEdits?.find((e) => e.skillName === g.name);
      return { name: g.name, score: edit ? edit.scoreAfter : g.score };
    });

    const chatAdjusted = finalGrades.filter((g) => {
      const start = effectiveStart.find((s) => s.name === g.name);
      return start && start.score !== g.score;
    });

    const chatUsed = report.chatMessageCount > 0;
    const adjustmentSummary = chatAdjusted.length > 0
      ? chatAdjusted.map((g) => {
          const start = effectiveStart.find((s) => s.name === g.name)!;
          return `${g.name} ${start.score} → ${g.score}`;
        }).join(', ')
      : null;

    const notifBody = [
      `Archetype: ${report.dnaResult.archetype}.`,
      chatUsed
        ? `Chat: ${report.chatMessageCount} of 5 messages used.`
        : 'No chat — student approved without discussion.',
      adjustmentSummary ? `Grade changes: ${adjustmentSummary}.` : null,
    ].filter(Boolean).join(' ');

    await prisma.$transaction([
      prisma.sharedDnaReport.update({
        where: { id: report.id },
        data: { isApproved: true, approvedAt: new Date() },
      }),
      prisma.notification.create({
        data: {
          advisorId: report.advisorId,
          type: 'report_approved',
          title: `${report.student.name} approved their DNA report`,
          body: notifBody,
          studentId: report.studentId,
          reportId: report.id,
        },
      }),
    ]);

    res.json({ approved: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Approval failed: ' + e.message });
  }
});
