# Academic DNA Skill Grading + Student Share Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Academic DNA with 10 skill grades, let advisors share results to students, enable a SAGE-only student chat with ±10 grade adjustment, require student approval, and notify advisors via a new Notifications tab.

**Architecture:** Three new Prisma models (DnaResult, SharedDnaReport, Notification) keep the original AI output immutable while a shared snapshot carries all edits, chat, and approval state. Two new backend route files handle student interactions and advisor notifications. The student `/academic/messages` page and advisor `/student-information` page are extended; a new `/advisor/notifications` page is added.

**Tech Stack:** TypeScript, Express, Prisma/PostgreSQL, Anthropic SDK, Next.js 14 (App Router), React hooks.

---

## File Map

**Create:**
- `backend/src/api/sharedReportRoutes.ts` — student get/chat/approve endpoints
- `backend/src/api/notificationRoutes.ts` — advisor notification list/read endpoints
- `frontend/app/advisor/notifications/page.tsx` — advisor notifications page

**Modify:**
- `backend/prisma/schema.prisma` — 3 new models + relations on Student/Advisor
- `backend/src/api/dnaRoutes.ts` — new archetypes, skill grading prompt, persist to DB, share endpoint
- `backend/src/index.ts` — mount 2 new routers
- `frontend/lib/api.ts` — 8 new API functions
- `frontend/app/academic/messages/page.tsx` — replace placeholder with full report view
- `frontend/app/advisor/student-information/page.tsx` — add DNA run + slide-in share panel
- `frontend/components/AdvisorLayout.tsx` — add Notifications nav item with unread badge

---

## Task 1: Prisma Schema — 3 New Models

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the three new models at the end of schema.prisma (after the `InterventionOutcome` model)**

```prisma
model DnaResult {
  id               String   @id @default(uuid())
  studentId        String   @map("student_id")
  advisorId        String   @map("advisor_id")
  archetype        String
  confidence       Float
  reasoning        String
  predictedOutcome String   @map("predicted_outcome")
  interventions    String[]
  skillGrades      Json     @map("skill_grades")
  generatedAt      DateTime @default(now()) @map("generated_at")

  student       Student           @relation(fields: [studentId], references: [studentId])
  advisor       Advisor           @relation(fields: [advisorId], references: [advisorId])
  sharedReports SharedDnaReport[]

  @@index([studentId])
  @@map("dna_results")
}

model SharedDnaReport {
  id                  String    @id @default(uuid())
  dnaResultId         String    @map("dna_result_id")
  studentId           String    @map("student_id")
  advisorId           String    @map("advisor_id")
  advisorNote         String?   @map("advisor_note")
  originalGrades      Json      @map("original_grades")
  advisorEditedGrades Json?     @map("advisor_edited_grades")
  finalGrades         Json      @map("final_grades")
  chatMessages        Json      @default("[]") @map("chat_messages")
  chatMessageCount    Int       @default(0) @map("chat_message_count")
  isApproved          Boolean   @default(false) @map("is_approved")
  approvedAt          DateTime? @map("approved_at")
  sharedAt            DateTime  @default(now()) @map("shared_at")

  dnaResult DnaResult @relation(fields: [dnaResultId], references: [id])
  student   Student   @relation(fields: [studentId], references: [studentId])
  advisor   Advisor   @relation(fields: [advisorId], references: [advisorId])

  @@index([studentId])
  @@map("shared_dna_reports")
}

model Notification {
  id        String   @id @default(uuid())
  advisorId String   @map("advisor_id")
  type      String
  title     String
  body      String
  studentId String?  @map("student_id")
  reportId  String?  @map("report_id")
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  advisor Advisor @relation(fields: [advisorId], references: [advisorId])

  @@index([advisorId])
  @@map("notifications")
}
```

- [ ] **Step 2: Add relations to the existing `Student` model**

Inside the `Student` model block, after the existing `interventions Intervention[]` line, add:

```prisma
  dnaResults       DnaResult[]
  sharedDnaReports SharedDnaReport[]
```

- [ ] **Step 3: Add relations to the existing `Advisor` model**

Inside the `Advisor` model block, after the existing `interventions Intervention[]` line, add:

```prisma
  dnaResults       DnaResult[]
  sharedDnaReports SharedDnaReport[]
  notifications    Notification[]
```

- [ ] **Step 4: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_dna_sharing_notifications
```

Expected: migration applied, new tables created.

- [ ] **Step 5: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add DnaResult, SharedDnaReport, Notification schema"
```

---

## Task 2: Update DNA Archetypes + Skill-Grading Prompt

**Files:**
- Modify: `backend/src/api/dnaRoutes.ts`

- [ ] **Step 1: Replace the `ARCHETYPES` array**

Find:
```typescript
const ARCHETYPES = [
  'The Wrong Major',
  'The Late Drifter',
  'The Overloader',
  'The Core Avoider',
];
```

Replace with:
```typescript
const ARCHETYPES = [
  'Square Peg',
  'Fading Student',
  'Overcommitter',
  'Selective Student',
  'Underdeliverer',
];
```

- [ ] **Step 2: Replace the entire `DNA_SYSTEM_PROMPT` constant**

Find the whole `const DNA_SYSTEM_PROMPT = \`...\`` block and replace with:

```typescript
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
```

- [ ] **Step 3: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/dnaRoutes.ts
git commit -m "feat: update DNA archetypes and add skill grading to prompt"
```

---

## Task 3: Persist DNA Results + Add Share Endpoint

**Files:**
- Modify: `backend/src/api/dnaRoutes.ts`

- [ ] **Step 1: Add the `SkillGrade` and `AdvisorEdit` interfaces at the top of the file (after the imports)**

```typescript
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
```

- [ ] **Step 2: In the existing `POST /students/:studentId/dna` handler, replace the final `res.json(result)` with a block that saves to DB and returns the record with its ID**

Find:
```typescript
    const result = JSON.parse(raw);
    res.json(result);
  } catch (e: any) {
    console.error('[SAGE] DNA error:', e.message);
    res.status(500).json({ error: 'DNA analysis failed: ' + e.message });
  }
```

Replace with:
```typescript
    const result = JSON.parse(raw);

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
```

- [ ] **Step 3: Add the GET latest and POST share endpoints after the existing POST handler (before the closing of the file)**

```typescript
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

    // Block if student already has an active (non-approved) shared report
    const existing = await prisma.sharedDnaReport.findFirst({
      where: { studentId: req.params.studentId, isApproved: false },
    });
    if (existing) {
      return res.status(409).json({ error: 'Student already has a pending shared report awaiting approval' });
    }

    const originalGrades = dnaResult.skillGrades as SkillGrade[];

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
        originalGrades,
        advisorEditedGrades: editedGrades && editedGrades.length > 0 ? editedGrades : null,
        finalGrades,
      },
    });

    res.json(shared);
  } catch (e: any) {
    res.status(500).json({ error: 'Share failed: ' + e.message });
  }
});
```

- [ ] **Step 4: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/dnaRoutes.ts
git commit -m "feat: persist DNA results to DB and add share endpoint"
```

---

## Task 4: Create sharedReportRoutes.ts

**Files:**
- Create: `backend/src/api/sharedReportRoutes.ts`

- [ ] **Step 1: Create the file with all three student endpoints**

```typescript
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

    const finalGrades = report.finalGrades as SkillGrade[];
    const originalGrades = report.originalGrades as SkillGrade[];
    const advisorEdits = report.advisorEditedGrades as AdvisorEdit[] | null;

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

    const history = report.chatMessages as ChatMessage[];

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
        chatMessages: updatedHistory,
        chatMessageCount: { increment: 1 },
        finalGrades: newFinalGrades,
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

    const finalGrades = report.finalGrades as SkillGrade[];
    const originalGrades = report.originalGrades as SkillGrade[];
    const advisorEdits = report.advisorEditedGrades as AdvisorEdit[] | null;

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
```

- [ ] **Step 2: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/sharedReportRoutes.ts
git commit -m "feat: add shared report routes (student get, chat, approve)"
```

---

## Task 5: Create notificationRoutes.ts

**Files:**
- Create: `backend/src/api/notificationRoutes.ts`

- [ ] **Step 1: Create the file**

```typescript
/**
 * SAGE — Notification Routes
 * Advisor endpoints: list, mark read, mark all read
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAdvisor } from '../middleware/auth';

export const notificationRouter = Router();

// GET /api/advisor/notifications
notificationRouter.get('/advisor/notifications', requireAdvisor, async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { advisorId: (req as any).user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + e.message });
  }
});

// PUT /api/advisor/notifications/read-all
notificationRouter.put('/advisor/notifications/read-all', requireAdvisor, async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { advisorId: (req as any).user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ updated: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to mark all read: ' + e.message });
  }
});

// PUT /api/advisor/notifications/:id/read
notificationRouter.put('/advisor/notifications/:id/read', requireAdvisor, async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, advisorId: (req as any).user.id },
      data: { isRead: true },
    });
    res.json({ updated: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to mark read: ' + e.message });
  }
});
```

- [ ] **Step 2: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/notificationRoutes.ts
git commit -m "feat: add notification routes for advisor"
```

---

## Task 6: Mount New Routers in index.ts

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add two imports at the top of index.ts (after the existing imports)**

```typescript
import { sharedReportRouter } from './api/sharedReportRoutes';
import { notificationRouter } from './api/notificationRoutes';
```

- [ ] **Step 2: Mount the two routers (add after the `app.use('/api', dnaRouter)` line)**

```typescript
app.use('/api', sharedReportRouter);  // /api/student/shared-report, /api/shared-reports/:id/...
app.use('/api', notificationRouter);  // /api/advisor/notifications
```

- [ ] **Step 3: Compile check and smoke-test**

```bash
cd backend && npx tsc --noEmit
```

Start the server and verify routes mount without crash:
```bash
npx ts-node src/index.ts &
curl http://localhost:4000/health
# Expected: {"status":"ok","service":"SAGE API","version":"2.0.0"}
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: mount sharedReport and notification routers"
```

---

## Task 7: Frontend API Client Functions

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add the following functions to the end of api.ts**

```typescript
// ─────────────────────────────────────────────
// DNA
// ─────────────────────────────────────────────

export async function runDnaAnalysis(studentId: string): Promise<any> {
  return fetchJSON(`/students/${studentId}/dna`, { method: 'POST' });
}

export async function getLatestDnaResult(studentId: string): Promise<any> {
  return fetchJSON(`/students/${studentId}/dna/latest`);
}

export async function shareDnaReport(
  studentId: string,
  dnaResultId: string,
  data: { advisorNote?: string; editedGrades?: { skillName: string; scoreBefore: number; scoreAfter: number }[] }
): Promise<any> {
  return fetchJSON(`/students/${studentId}/dna/${dnaResultId}/share`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────
// SHARED REPORT (student)
// ─────────────────────────────────────────────

export async function getSharedReport(): Promise<any> {
  return fetchJSON('/student/shared-report');
}

export async function chatWithSage(
  reportId: string,
  message: string
): Promise<{ reply: string; updatedGrade?: { skillName: string; newScore: number }; messagesUsed: number; messagesRemaining: number; limitReached: boolean }> {
  return fetchJSON(`/shared-reports/${reportId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function approveReport(reportId: string): Promise<void> {
  await fetchJSON(`/shared-reports/${reportId}/approve`, { method: 'POST' });
}

// ─────────────────────────────────────────────
// NOTIFICATIONS (advisor)
// ─────────────────────────────────────────────

export async function getAdvisorNotifications(): Promise<any[]> {
  return fetchJSON('/advisor/notifications');
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await fetchJSON(`/advisor/notifications/${notificationId}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetchJSON('/advisor/notifications/read-all', { method: 'PUT' });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add DNA, shared report, and notification API client functions"
```

---

## Task 8: Student Messages Page

**Files:**
- Modify: `frontend/app/academic/messages/page.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { getSharedReport, chatWithSage, approveReport } from '@/lib/api';

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

interface SharedReport {
  id: string;
  advisorNote: string | null;
  originalGrades: SkillGrade[];
  advisorEditedGrades: AdvisorEdit[] | null;
  finalGrades: SkillGrade[];
  chatMessages: ChatMessage[];
  chatMessageCount: number;
  isApproved: boolean;
  approvedAt: string | null;
  dnaResult: {
    archetype: string;
    confidence: number;
    reasoning: string;
    predictedOutcome: string;
    interventions: string[];
  };
}

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--am)';
  if (score >= 55) return 'var(--am)';
  return '#e88';
}

export default function StudentMessagesPage() {
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSharedReport()
      .then((r) => {
        setReport(r);
        setMessages(r.chatMessages ?? []);
        setMessagesUsed(r.chatMessageCount ?? 0);
        setLimitReached((r.chatMessageCount ?? 0) >= 5);
        setApproved(r.isApproved);
      })
      .catch((e) => {
        if (e.message?.includes('No shared report')) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!report || !chatInput.trim() || chatLoading || limitReached || approved) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    // Optimistically add student message
    const now = new Date().toISOString();
    setMessages((prev) => [...prev, { role: 'student', content: msg, timestamp: now }]);

    try {
      const result = await chatWithSage(report.id, msg);
      setMessages((prev) => [...prev, { role: 'sage', content: result.reply, timestamp: now }]);
      setMessagesUsed(result.messagesUsed);
      setLimitReached(result.limitReached);
      if (result.updatedGrade) {
        setReport((prev) => prev ? {
          ...prev,
          finalGrades: prev.finalGrades.map((g) =>
            g.name === result.updatedGrade!.skillName
              ? { ...g, score: result.updatedGrade!.newScore }
              : g
          ),
        } : prev);
      }
    } catch (e: any) {
      setChatError(e.message || 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!report || approving || approved) return;
    setApproving(true);
    try {
      await approveReport(report.id);
      setApproved(true);
    } catch (e: any) {
      setChatError(e.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-body">
        <div className="sage-page-header">
          <div className="sage-page-title">Messages</div>
        </div>
        <div style={{ padding: '24px', color: 'var(--t4)', fontSize: '13px' }}>Loading...</div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="page-body">
        <div className="sage-page-header">
          <div className="sage-page-title">Messages</div>
        </div>
        <div className="sage-card p-6" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--t4)', marginBottom: '6px' }}>No report has been shared with you yet.</div>
          <div style={{ fontSize: '11px', color: 'var(--t5)' }}>Your advisor will share your Academic DNA report when it is ready.</div>
        </div>
      </div>
    );
  }

  const universalGrades = report.finalGrades.filter((g) => g.isUniversal);
  const majorGrades = report.finalGrades.filter((g) => !g.isUniversal);

  return (
    <div className="page-body space-y-4">
      <div className="sage-page-header">
        <div className="sage-page-title">Messages</div>
        <div className="sage-page-sub">Your Academic DNA report from your advisor.</div>
      </div>

      {/* Approved banner */}
      {approved && (
        <div style={{ background: '#1a2e1a', border: '1px solid #4a7a4a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#8e8' }}>
          Report approved. Your final grades have been recorded.
        </div>
      )}

      {/* Advisor note */}
      {report.advisorNote && (
        <div style={{ background: 'var(--ob-1)', borderLeft: '3px solid var(--am)', borderRadius: '0 6px 6px 0', padding: '10px 14px' }}>
          <div style={{ fontSize: '9px', color: 'var(--t4)', letterSpacing: '1px', marginBottom: '3px' }}>NOTE FROM YOUR ADVISOR</div>
          <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>{report.advisorNote}</div>
        </div>
      )}

      {/* Archetype card */}
      <div className="sage-card p-4">
        <div style={{ fontSize: '9px', color: 'var(--t4)', letterSpacing: '1px', marginBottom: '4px' }}>YOUR ACADEMIC ARCHETYPE</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--am)', marginBottom: '4px' }}>{report.dnaResult.archetype}</div>
        <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6, marginBottom: '10px' }}>{report.dnaResult.reasoning}</div>
        <div style={{ fontSize: '10px', color: 'var(--t4)', marginBottom: '2px' }}>Predicted outcome if no change:</div>
        <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5 }}>{report.dnaResult.predictedOutcome}</div>
      </div>

      {/* Skill grades */}
      <div className="sage-card p-4 space-y-3">
        <div style={{ fontSize: '10px', color: 'var(--t4)', letterSpacing: '1px' }}>SKILL GRADES</div>

        <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '1px', marginBottom: '4px' }}>UNIVERSAL</div>
        {universalGrades.map((g) => {
          const edit = report.advisorEditedGrades?.find((e) => e.skillName === g.name);
          return (
            <div key={g.name} style={{
              background: 'var(--ob-1)',
              border: edit ? '1px solid var(--am)33' : '1px solid transparent',
              borderRadius: '6px', padding: '8px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--t1)' }}>{g.name}</div>
                  {edit && (
                    <div style={{ fontSize: '9px', color: 'var(--t4)', marginTop: '2px' }}>
                      Advisor adjusted:{' '}
                      <span style={{ color: '#e88', textDecoration: 'line-through' }}>{edit.scoreBefore}</span>
                      {' → '}
                      <span style={{ color: '#8e8' }}>{edit.scoreAfter}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '80px', height: '4px', background: 'var(--ob-3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${g.score}%`, height: '100%', background: scoreColor(g.score), borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor(g.score), minWidth: '30px', textAlign: 'right' }}>{g.score}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '1px', marginTop: '8px', marginBottom: '4px' }}>MAJOR-SPECIFIC</div>
        {majorGrades.map((g) => {
          const edit = report.advisorEditedGrades?.find((e) => e.skillName === g.name);
          return (
            <div key={g.name} style={{
              background: 'var(--ob-1)',
              border: edit ? '1px solid var(--am)33' : '1px solid transparent',
              borderRadius: '6px', padding: '8px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--t1)' }}>{g.name}</div>
                  {edit && (
                    <div style={{ fontSize: '9px', color: 'var(--t4)', marginTop: '2px' }}>
                      Advisor adjusted:{' '}
                      <span style={{ color: '#e88', textDecoration: 'line-through' }}>{edit.scoreBefore}</span>
                      {' → '}
                      <span style={{ color: '#8e8' }}>{edit.scoreAfter}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '80px', height: '4px', background: 'var(--ob-3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${g.score}%`, height: '100%', background: scoreColor(g.score), borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor(g.score), minWidth: '30px', textAlign: 'right' }}>{g.score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SAGE chat */}
      {!approved && (
        <div className="sage-card p-4 space-y-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--t4)', letterSpacing: '1px' }}>DISCUSS WITH SAGE</div>
            <div style={{ fontSize: '9px', color: 'var(--t5)' }}>{messagesUsed} of 5 messages used</div>
          </div>

          {messages.length === 0 && (
            <div style={{ fontSize: '11px', color: 'var(--t5)', padding: '8px 0' }}>
              You can challenge any of your skill grades. SAGE will adjust a score if your argument is supported by evidence from your academic record.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'student' ? 'flex-end' : 'flex-start',
                background: m.role === 'student' ? 'var(--am)22' : 'var(--ob-2)',
                border: m.role === 'student' ? '1px solid var(--am)33' : 'none',
                borderRadius: m.role === 'student' ? '8px 8px 0 8px' : '8px 8px 8px 0',
                padding: '8px 12px', maxWidth: '82%',
              }}>
                {m.role === 'sage' && (
                  <div style={{ fontSize: '9px', color: 'var(--am)', marginBottom: '3px', fontWeight: 700 }}>SAGE</div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--t2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--ob-2)', borderRadius: '8px 8px 8px 0', padding: '8px 12px' }}>
                <div style={{ fontSize: '9px', color: 'var(--am)', marginBottom: '3px', fontWeight: 700 }}>SAGE</div>
                <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Thinking...</div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {chatError && (
            <div style={{ fontSize: '11px', color: '#e88' }}>{chatError}</div>
          )}

          {!limitReached ? (
            <>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="sage-input"
                  style={{ flex: 1, fontSize: '12px' }}
                  placeholder="Ask SAGE about your grades…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={chatLoading}
                />
                <button className="btn btn-amber" onClick={handleSend} disabled={chatLoading || !chatInput.trim()}>
                  Send
                </button>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--t5)' }}>
                {5 - messagesUsed} message{5 - messagesUsed !== 1 ? 's' : ''} remaining. Scores can shift up to ±10 if your argument is valid.
              </div>
            </>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--t4)', padding: '4px 0' }}>Message limit reached.</div>
          )}
        </div>
      )}

      {/* Approve button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0 24px' }}>
        {approved ? (
          <div style={{ fontSize: '13px', color: '#8e8', fontWeight: 600 }}>Report Approved</div>
        ) : (
          <>
            <button
              className="btn btn-amber"
              style={{ padding: '10px 32px', fontSize: '13px', fontWeight: 700 }}
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? 'Approving...' : 'Approve Report'}
            </button>
            <div style={{ fontSize: '9px', color: 'var(--t5)' }}>
              Approving confirms you have reviewed your Academic DNA report. This cannot be undone.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/academic/messages/page.tsx
git commit -m "feat: build student messages page with DNA report, chat, and approve flow"
```

---

## Task 9: Advisor Share Panel on Student Information Page

**Files:**
- Modify: `frontend/app/advisor/student-information/page.tsx`

- [ ] **Step 1: Add new imports at the top of the file**

Find the existing import block:
```typescript
import {
  analyzeStudent,
  getAdvisorEnrollments,
  getStudentReports,
  getStudents,
  getMajors,
  lookupAdvisorStudentById,
} from '@/lib/api';
```

Replace with:
```typescript
import {
  analyzeStudent,
  getAdvisorEnrollments,
  getStudentReports,
  getStudents,
  getMajors,
  lookupAdvisorStudentById,
  runDnaAnalysis,
  getLatestDnaResult,
  shareDnaReport,
} from '@/lib/api';
```

- [ ] **Step 2: Add new state variables inside `AdvisorStudentInformationPage`, after the existing state declarations (after `const [pageError, setPageError] = useState<string | null>(null);`)**

```typescript
  // DNA + share panel state
  const [dnaResult, setDnaResult] = useState<any | null>(null);
  const [runningDna, setRunningDna] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editedScores, setEditedScores] = useState<Record<string, number>>({});
  const [advisorNote, setAdvisorNote] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
```

- [ ] **Step 3: Add handler functions inside the component, after `runDriftDetection`**

```typescript
  const runDna = async () => {
    if (!selectedStudent) return;
    setRunningDna(true);
    setPageError(null);
    setDnaResult(null);
    setShareSuccess(false);
    setPanelOpen(false);
    try {
      const result = await runDnaAnalysis(selectedStudent.studentId);
      setDnaResult(result);
      // Pre-fill editedScores with AI scores
      const initial: Record<string, number> = {};
      for (const g of result.skill_grades ?? []) {
        initial[g.name] = g.score;
      }
      setEditedScores(initial);
    } catch (err: any) {
      setPageError(err?.message || 'DNA analysis failed');
    } finally {
      setRunningDna(false);
    }
  };

  const handleShare = async () => {
    if (!selectedStudent || !dnaResult) return;
    setSharing(true);
    setShareError(null);
    try {
      const originalGrades: { name: string; score: number }[] = dnaResult.skill_grades ?? [];
      const editedGrades = originalGrades
        .filter((g) => editedScores[g.name] !== undefined && editedScores[g.name] !== g.score)
        .map((g) => ({ skillName: g.name, scoreBefore: g.score, scoreAfter: editedScores[g.name] }));

      await shareDnaReport(selectedStudent.studentId, dnaResult.id, {
        advisorNote: advisorNote.trim() || undefined,
        editedGrades: editedGrades.length > 0 ? editedGrades : undefined,
      });
      setShareSuccess(true);
      setPanelOpen(false);
    } catch (err: any) {
      setShareError(err?.message || 'Share failed');
    } finally {
      setSharing(false);
    }
  };
```

- [ ] **Step 4: Add the DNA section to the JSX — insert it inside the `{selectedStudent && (...)}` block, after the existing `<div className="flex flex-wrap gap-2">` action links section**

Find the closing `</div>` that ends the `selectedStudent &&` card (the one that contains the `InfoRow` grid and action links). Just before the card's closing `</div>`, insert:

```tsx
            {/* DNA Analysis */}
            <div style={{ borderTop: '1px solid var(--ob-3)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--t4)', letterSpacing: '1px' }}>ACADEMIC DNA</div>
                <button className="btn btn-ghost-light btn-sm" onClick={runDna} disabled={runningDna}>
                  {runningDna ? 'Analyzing...' : dnaResult ? 'Re-run DNA' : 'Run Academic DNA'}
                </button>
              </div>

              {dnaResult && (
                <div style={{ position: 'relative', display: 'flex', gap: 0 }}>
                  {/* DNA result panel */}
                  <div style={{ flex: 1, paddingRight: panelOpen ? '16px' : 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--am)', marginBottom: '2px' }}>{dnaResult.archetype}</div>
                    <div style={{ fontSize: '10px', color: 'var(--t4)', marginBottom: '10px' }}>Confidence {Math.round(dnaResult.confidence * 100)}%</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5, marginBottom: '12px' }}>{dnaResult.reasoning}</div>

                    <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '1px', marginBottom: '6px' }}>SKILL GRADES</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                      {(dnaResult.skill_grades ?? []).map((g: any) => (
                        <div key={g.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: 'var(--t3)' }}>{g.name}{!g.is_universal ? ' ·' : ''}</span>
                          <span style={{ color: g.score >= 70 ? 'var(--am)' : '#e88', fontWeight: 600 }}>{g.score}</span>
                        </div>
                      ))}
                    </div>

                    {shareSuccess ? (
                      <div style={{ fontSize: '11px', color: '#8e8' }}>Report shared with student.</div>
                    ) : (
                      <button
                        className="btn btn-amber btn-sm"
                        onClick={() => setPanelOpen((o) => !o)}
                      >
                        {panelOpen ? 'Close panel' : 'Share with Student →'}
                      </button>
                    )}
                  </div>

                  {/* Slide-in edit panel */}
                  <div style={{
                    width: panelOpen ? '220px' : 0,
                    overflow: 'hidden',
                    transition: 'width 0.25s ease',
                    flexShrink: 0,
                  }}>
                    <div style={{ width: '220px', paddingLeft: '16px', borderLeft: '1px solid var(--ob-3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--am)' }}>Before sending</div>
                        <button style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: '14px' }} onClick={() => setPanelOpen(false)}>✕</button>
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '10px' }}>Adjust scores if needed (optional)</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                        {(dnaResult.skill_grades ?? []).map((g: any) => (
                          <div key={g.name}>
                            <div style={{ fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.5px', marginBottom: '3px' }}>{g.name.toUpperCase()}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--t5)' }}>AI: {g.score}</span>
                              <span style={{ fontSize: '10px', color: 'var(--t5)' }}>→</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="sage-input"
                                style={{ width: '52px', fontSize: '12px', padding: '3px 6px', color: editedScores[g.name] !== g.score ? 'var(--am)' : 'var(--t2)' }}
                                value={editedScores[g.name] ?? g.score}
                                onChange={(e) => setEditedScores((prev) => ({ ...prev, [g.name]: Number(e.target.value) }))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.5px', marginBottom: '4px' }}>NOTE TO STUDENT (optional)</div>
                        <textarea
                          className="sage-input"
                          style={{ width: '100%', fontSize: '11px', resize: 'none', height: '60px', boxSizing: 'border-box' }}
                          placeholder="Add a personal note…"
                          value={advisorNote}
                          onChange={(e) => setAdvisorNote(e.target.value)}
                        />
                      </div>

                      {shareError && <div style={{ fontSize: '10px', color: '#e88', marginBottom: '6px' }}>{shareError}</div>}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button className="btn btn-amber btn-sm" onClick={handleShare} disabled={sharing} style={{ width: '100%' }}>
                          {sharing ? 'Sending...' : 'Send to Student'}
                        </button>
                        <button className="btn btn-ghost-light btn-sm" onClick={() => setPanelOpen(false)} style={{ width: '100%' }}>Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/advisor/student-information/page.tsx
git commit -m "feat: add DNA run + slide-in share panel to student information page"
```

---

## Task 10: Advisor Notifications Page + AdvisorLayout Update

**Files:**
- Create: `frontend/app/advisor/notifications/page.tsx`
- Modify: `frontend/components/AdvisorLayout.tsx`

- [ ] **Step 1: Create the notifications page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getAdvisorNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  studentId: string | null;
  reportId: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export default function AdvisorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdvisorNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  return (
    <div className="page-body">
      <div className="sage-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="sage-page-title">Notifications</div>
            <div className="sage-page-sub">Student approvals and system alerts.</div>
          </div>
          {unread.length > 0 && (
            <button className="btn btn-ghost-light btn-sm" onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading && <div style={{ padding: '16px', fontSize: '13px', color: 'var(--t4)' }}>Loading...</div>}

      {!loading && notifications.length === 0 && (
        <div className="sage-card p-6" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--t4)' }}>
          No notifications yet.
        </div>
      )}

      {unread.length > 0 && (
        <div className="sage-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', fontSize: '9px', color: 'var(--t5)', letterSpacing: '1px', borderBottom: '1px solid var(--ob-3)' }}>
            UNREAD
          </div>
          {unread.map((n) => (
            <div
              key={n.id}
              style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--ob-2)', background: 'var(--ob-1)' }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--am)', marginTop: '4px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{n.title}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t5)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt)}</div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '3px', lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ marginTop: '8px' }}>
                  <button
                    style={{ fontSize: '9px', color: 'var(--am)', border: '1px solid var(--am)44', borderRadius: '4px', padding: '3px 8px', background: 'none', cursor: 'pointer' }}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    Mark read
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {read.length > 0 && (
        <div className="sage-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', fontSize: '9px', color: 'var(--t5)', letterSpacing: '1px', borderBottom: '1px solid var(--ob-3)' }}>
            EARLIER
          </div>
          {read.map((n) => (
            <div
              key={n.id}
              style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--ob-2)', opacity: 0.55 }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ob-4)', marginTop: '4px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{n.title}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t5)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt)}</div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '3px', lineHeight: 1.4 }}>{n.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AdvisorLayout.tsx to add the Notifications nav item**

Find the import line:
```typescript
import {
  Sidebar, HomeIcon, UsersIcon, LayersIcon, CalendarIcon,
  MessageIcon, UserIcon, SparkleIcon, UserPlusIcon, SendIcon, BookOpenIcon,
} from '@/components/Sidebar';
```

Replace with:
```typescript
import {
  Sidebar, HomeIcon, UsersIcon, LayersIcon, CalendarIcon,
  MessageIcon, UserIcon, SparkleIcon, UserPlusIcon, SendIcon, BookOpenIcon,
  BellIcon,
} from '@/components/Sidebar';
```

- [ ] **Step 3: Add BellIcon to Sidebar.tsx if it doesn't exist**

Open `frontend/components/Sidebar.tsx` and check whether `BellIcon` is exported. If it isn't, add it:

```typescript
export function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
```

- [ ] **Step 4: Add unread count state and the Notifications nav item to AdvisorLayout.tsx**

In `AdvisorLayout.tsx`, add a `notifCount` state alongside the existing `pendingCount` state:

```typescript
  const [notifCount, setNotifCount] = useState(0);
```

In the existing `useEffect`, add a call to fetch the unread notification count:

```typescript
    getAdvisorNotifications()
      .then((list) => setNotifCount(list.filter((n: any) => !n.isRead).length))
      .catch(() => {});
```

Add the import for `getAdvisorNotifications` to the existing api import line:

```typescript
import { getAdvisorAppointments, getAdvisorNotifications } from '@/lib/api';
```

In the `mainItems` array, add the Notifications entry (after the `Comments` entry):

```typescript
    { href: '/advisor/notifications', label: 'Notifications', icon: <BellIcon />, count: notifCount },
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/advisor/notifications/page.tsx frontend/components/AdvisorLayout.tsx frontend/components/Sidebar.tsx
git commit -m "feat: add advisor notifications page and sidebar nav item"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 5 new archetypes (no "The") — Task 2
- ✅ 10 skill grades (5 universal + 5 major-specific, Claude-determined) — Task 2
- ✅ DnaResult persisted (immutable) — Task 3
- ✅ Advisor edits scores (optional), adds note (optional) — Task 3 + Task 9
- ✅ Student sees before/after diff for advisor edits — Task 8
- ✅ Student SAGE chat (max 5 messages, SAGE persona only) — Task 4
- ✅ Grade shift ±10 max, one adjustment per skill per session — Task 4
- ✅ Student approve (mandatory) — Task 4 + Task 8
- ✅ Advisor notification on approval — Task 4
- ✅ Advisor notifications page with unread/read sections — Task 10
- ✅ Notifications nav item with unread badge — Task 10
- ✅ 409 conflict if student already has pending shared report — Task 3
