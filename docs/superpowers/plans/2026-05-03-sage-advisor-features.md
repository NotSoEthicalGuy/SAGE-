# SAGE Advisor Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five advisor-facing features to SAGE: Graduation Pathway Simulator, Semester Triage Dashboard, Hold & Flag System, Prerequisite Violation Detection, and Intervention Effectiveness Scoring.

**Architecture:** All new advisor endpoints go into a new `advisorAnalyticsRoutes.ts` (existing `advisorSisRoutes.ts` is already 579 lines). Two new service files hold extracted / shared logic. Frontend modifies three existing advisor pages and adds panels to the student profile page. No student portal changes. No admin view changes.

**Tech Stack:** Express.js + TypeScript + Prisma (PostgreSQL) · Next.js 14 + React 18 · Anthropic Claude API (`claude-sonnet-4-20250514`) · Zod · bcryptjs

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modify | 5 new models + RequirementType enum + back-relations |
| `backend/prisma/seed.ts` | Modify | Wipe + seed all new tables |
| `backend/src/api/advisorAnalyticsRoutes.ts` | **Create** | All new advisor analytics endpoints |
| `backend/src/api/advisorSisRoutes.ts` | Modify | Add `prerequisiteViolations` to GET /students/:studentId |
| `backend/src/api/studentAnalyticsRoutes.ts` | Modify | Replace inline prereq logic with service call |
| `backend/src/api/routes.ts` | Modify | Call `updateInterventionOutcomes` after drift analysis saves |
| `backend/src/index.ts` | Modify | Mount `advisorAnalyticsRouter` |
| `backend/src/services/prerequisiteService.ts` | **Create** | `detectPrerequisiteViolations(studentId)` |
| `backend/src/services/interventionService.ts` | **Create** | `updateInterventionOutcomes(studentId, driftScore, reportDate)` |
| `frontend/lib/api.ts` | Modify | 12 new API client functions |
| `frontend/app/advisor/students/[studentId]/page.tsx` | Modify | Tab strip, prereq warning, FlagsPanel, InterventionsPanel, Pathway tab |
| `frontend/app/advisor/students/page.tsx` | Modify | Triage button, triage table view, on-mount latest fetch |
| `frontend/app/advisor/dashboard/page.tsx` | Modify | Intervention Insights table below student table |

---

## Task 1: Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Run: `npx prisma migrate dev --name advisor-features`

- [ ] **Step 1: Add RequirementType enum and 5 new models to schema.prisma**

Open `backend/prisma/schema.prisma`. After the `AppointmentStatus` enum block (around line 77), add:

```prisma
enum RequirementType {
  core
  elective
}
```

After the `AppointmentRequest` model (end of file), add these 5 models:

```prisma
model DegreeRequirement {
  id                  String          @id @default(uuid())
  majorId             String          @map("major_id")
  courseId            String          @map("course_id")
  requirementType     RequirementType @map("requirement_type")
  recommendedSemester Int             @map("recommended_semester")
  createdAt           DateTime        @default(now()) @map("created_at")

  major  Major  @relation(fields: [majorId], references: [majorId])
  course Course @relation(fields: [courseId], references: [courseId])

  @@index([majorId])
  @@map("degree_requirements")
}

model StudentPlan {
  id            String   @id @default(uuid())
  studentId     String   @map("student_id")
  advisorId     String?  @map("advisor_id")
  semesterPlans Json     @map("semester_plans")
  generatedAt   DateTime @default(now()) @map("generated_at")
  isAiGenerated Boolean  @default(false) @map("is_ai_generated")
  notes         String?

  student Student  @relation(fields: [studentId], references: [studentId])
  advisor Advisor? @relation(fields: [advisorId], references: [advisorId])

  @@index([studentId])
  @@map("student_plans")
}

model TriageRun {
  id        String   @id @default(uuid())
  advisorId String   @map("advisor_id")
  semester  Int
  year      Int
  result    Json
  runAt     DateTime @default(now()) @map("run_at")
  createdAt DateTime @default(now()) @map("created_at")

  advisor Advisor @relation(fields: [advisorId], references: [advisorId])

  @@index([advisorId])
  @@map("triage_runs")
}

model Intervention {
  id               String   @id @default(uuid())
  studentId        String   @map("student_id")
  advisorId        String   @map("advisor_id")
  interventionType String   @map("intervention_type")
  notes            String?
  interventionDate DateTime @map("intervention_date")
  createdAt        DateTime @default(now()) @map("created_at")

  student Student              @relation(fields: [studentId], references: [studentId])
  advisor Advisor              @relation(fields: [advisorId], references: [advisorId])
  outcome InterventionOutcome?

  @@index([studentId])
  @@index([advisorId])
  @@map("interventions")
}

model InterventionOutcome {
  id                 String    @id @default(uuid())
  interventionId     String    @unique @map("intervention_id")
  driftScoreBefore   Float     @map("drift_score_before")
  driftScoreAfter    Float?    @map("drift_score_after")
  effectivenessScore Float?    @map("effectiveness_score")
  measuredAt         DateTime? @map("measured_at")

  intervention Intervention @relation(fields: [interventionId], references: [id])

  @@map("intervention_outcomes")
}
```

- [ ] **Step 2: Add back-relations to existing models**

In the `Major` model (around line 98, after the `sections` relation), add:
```prisma
  degreeRequirements DegreeRequirement[]
```

In the `Course` model (around line 127, after the `programOfStudyItems` relation), add:
```prisma
  degreeRequirements DegreeRequirement[]
```

In the `Student` model (around line 157, after the `appointments` relation), add:
```prisma
  plans         StudentPlan[]
  interventions Intervention[]
```

In the `Advisor` model (around line 249, after the `appointments` relation), add:
```prisma
  studentPlans  StudentPlan[]
  triageRuns    TriageRun[]
  interventions Intervention[]
```

- [ ] **Step 3: Validate schema**

```bash
cd backend
npx prisma validate
```

Expected: no errors printed, exits 0.

- [ ] **Step 4: Run migration**

```bash
cd backend
npx prisma migrate dev --name advisor-features
```

Expected output includes: `The following migration(s) have been applied: ... advisor-features`

- [ ] **Step 5: Regenerate client**

```bash
cd backend
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add 5 advisor-features models to Prisma schema"
```

---

## Task 2: Extract prerequisiteService

**Files:**
- Create: `backend/src/services/prerequisiteService.ts`
- Modify: `backend/src/api/studentAnalyticsRoutes.ts:190-220`

- [ ] **Step 1: Create the service file**

Create `backend/src/services/prerequisiteService.ts`:

```typescript
import { prisma } from '../db/client';

const COMPLETED_STATUSES = ['completed'];
const ACTIVE_STATUSES = ['in_progress', 'registered', 'approved', 'pending'];

function isCompleted(e: { status: string; finalGrade: number | null }): boolean {
  return e.finalGrade !== null || COMPLETED_STATUSES.includes(e.status);
}

function isActive(e: { status: string; finalGrade: number | null }): boolean {
  return ACTIVE_STATUSES.includes(e.status) && e.finalGrade === null;
}

export async function detectPrerequisiteViolations(studentId: string): Promise<
  { courseName: string; missingPrerequisiteCode: string }[]
> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: {
      status: true,
      finalGrade: true,
      course: { select: { name: true, code: true, prerequisites: true } },
    },
  });

  const completedCodes = new Set(
    enrollments.filter(isCompleted).map(e => e.course.code)
  );

  const violations: { courseName: string; missingPrerequisiteCode: string }[] = [];
  for (const e of enrollments.filter(isActive)) {
    for (const prereq of e.course.prerequisites) {
      if (!completedCodes.has(prereq)) {
        violations.push({ courseName: e.course.name, missingPrerequisiteCode: prereq });
      }
    }
  }

  return violations;
}
```

- [ ] **Step 2: Update studentAnalyticsRoutes.ts to use the service**

In `backend/src/api/studentAnalyticsRoutes.ts`, replace the inline prereq logic in the `GET /prerequisite-violations` handler (lines 190–221) with a call to the service. Also add the import at the top.

Add this import after the existing imports (line 3):
```typescript
import { detectPrerequisiteViolations } from '../services/prerequisiteService';
```

Replace the entire `studentAnalyticsRouter.get('/prerequisite-violations', ...)` handler:
```typescript
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
```

You can delete the now-unused `isCompleted` and `isActive` helpers from `studentAnalyticsRoutes.ts` — the service owns them. Keep the ones used in other handlers (`pos-progress`, `recommended-courses`, `grade-trend`) — actually those handlers still need `isCompleted` / `isActive` locally, so keep those helpers in `studentAnalyticsRoutes.ts`. Only remove the inline violation loop.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: 0 errors related to files you touched.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/prerequisiteService.ts backend/src/api/studentAnalyticsRoutes.ts
git commit -m "refactor: extract detectPrerequisiteViolations into shared service"
```

---

## Task 3: advisorAnalyticsRoutes.ts — Flags CRUD + Router Mount

**Files:**
- Create: `backend/src/api/advisorAnalyticsRoutes.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create advisorAnalyticsRoutes.ts with Flags endpoints**

Create `backend/src/api/advisorAnalyticsRoutes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireRole } from '../middleware/auth';

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
    } catch (e) {
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
```

- [ ] **Step 2: Mount the router in index.ts**

In `backend/src/index.ts`, add the import after the existing advisor imports:

```typescript
import { advisorAnalyticsRouter } from './api/advisorAnalyticsRoutes';
```

Add the mount line after line 41 (`app.use('/api/advisor', advisorSisRouter);`):

```typescript
app.use('/api/advisor', advisorAnalyticsRouter);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 4: Smoke-test flags endpoints (restart server first)**

```bash
# Login as advisor1 first and grab the token, replace TOKEN and STUDENT_ID
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"advisor1@sage.edu","password":"advisor123"}' | jq '.token'

# Create a flag (replace TOKEN and STUDENT_ID with real values)
curl -s -X POST http://localhost:4000/api/advisor/students/STUDENT_ID/flags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"flagType":"At Risk","note":"Missing assignments","isVisibleToStudent":false}' | jq .

# List flags
curl -s http://localhost:4000/api/advisor/students/STUDENT_ID/flags \
  -H "Authorization: Bearer TOKEN" | jq .
```

Expected: 201 on create, array on list.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/advisorAnalyticsRoutes.ts backend/src/index.ts
git commit -m "feat: add advisorAnalyticsRoutes with Flags CRUD endpoints"
```

---

## Task 4: Prerequisite Violations on Advisor Backend

**Files:**
- Modify: `backend/src/api/advisorSisRoutes.ts:82-102`

- [ ] **Step 1: Import the prerequisiteService in advisorSisRoutes.ts**

In `backend/src/api/advisorSisRoutes.ts`, add after the existing imports (line 8):

```typescript
import { detectPrerequisiteViolations } from '../services/prerequisiteService';
```

- [ ] **Step 2: Update GET /students/:studentId to include prerequisiteViolations**

Replace the `GET /students/:studentId` handler (lines 82–102) with:

```typescript
advisorSisRouter.get('/students/:studentId', requireRole('advisor'), async (req, res) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

    const [student, violations] = await Promise.all([
      prisma.student.findUnique({
        where: { studentId: req.params.studentId },
        include: {
          major: true,
          advisor: { select: { advisorId: true, name: true, email: true } },
          enrollments: { include: { course: true, section: true }, orderBy: { createdAt: 'desc' } },
        },
      }),
      detectPrerequisiteViolations(req.params.studentId),
    ]);

    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.majorId !== majorId) return res.status(403).json({ error: 'Access denied' });

    res.json({
      ...student,
      academicStanding: computeStanding(student.cumulativeGpa),
      prerequisiteViolations: violations,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

- [ ] **Step 4: Smoke test**

```bash
curl -s http://localhost:4000/api/advisor/students/STUDENT_ID \
  -H "Authorization: Bearer TOKEN" | jq '.prerequisiteViolations'
```

Expected: array (empty or with violation objects containing `courseName` and `missingPrerequisiteCode`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/advisorSisRoutes.ts
git commit -m "feat: add prerequisiteViolations to advisor student profile endpoint"
```

---

## Task 5: Graduation Pathway Simulator Backend

**Files:**
- Modify: `backend/src/api/advisorAnalyticsRoutes.ts`

The pathway endpoints generate a semester-by-semester graduation plan via Claude and store it as a `StudentPlan`. A GET endpoint returns the latest stored plan.

- [ ] **Step 1: Add Zod + Anthropic imports to advisorAnalyticsRoutes.ts**

At the top of `backend/src/api/advisorAnalyticsRoutes.ts`, add imports:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
```

After the existing imports add:

```typescript
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
```

- [ ] **Step 2: Add GET /students/:id/graduation-pathway endpoint**

Append to `advisorAnalyticsRoutes.ts`:

```typescript
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
      res.json(plan ?? null);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch graduation pathway' });
    }
  }
);
```

- [ ] **Step 3: Add POST /students/:id/graduation-pathway endpoint**

Append to `advisorAnalyticsRoutes.ts`:

```typescript
advisorAnalyticsRouter.post(
  '/students/:id/graduation-pathway',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
      const student = await prisma.student.findUnique({
        where: { studentId: req.params.id },
        include: {
          major: { include: { courses: { select: { code: true, name: true, credits: true, prerequisites: true, semesterOffered: true } } } },
          enrollments: {
            include: { course: { select: { code: true, name: true, credits: true } } },
            orderBy: [{ year: 'asc' }, { semester: 'asc' }],
          },
        },
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });

      const completedCourses = student.enrollments
        .filter(e => e.finalGrade !== null || e.status === 'completed')
        .map(e => ({ code: e.course.code, name: e.course.name, credits: e.course.credits }));

      const inProgressCourses = student.enrollments
        .filter(e => ['in_progress', 'registered', 'approved', 'pending'].includes(e.status) && e.finalGrade === null)
        .map(e => ({ code: e.course.code, name: e.course.name, credits: e.course.credits }));

      const completedCredits = completedCourses.reduce((s, c) => s + c.credits, 0);
      const remainingCredits = student.major.totalCredits - completedCredits;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentSemester = now.getMonth() < 6 ? 1 : 2;

      const prompt = `You are an academic advisor system. Generate a graduation pathway for this student.

Student: ${student.name}
Major: ${student.major.name} (${student.major.totalCredits} total credits required)
Current Semester: ${student.currentSemester}
Cumulative GPA: ${student.cumulativeGpa ?? 'N/A'}
Credits Completed: ${completedCredits}
Credits Remaining: ${remainingCredits}
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
- recoveryPlan is required if onTrack is false (recommended makeup schedule)`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = (message.content[0] as any).text;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(502).json({ error: 'Claude returned non-JSON response' });

      const parsed = PathwaySchema.parse(JSON.parse(jsonMatch[0]));

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
      if (e?.name === 'ZodError') return res.status(502).json({ error: 'Claude response failed validation', details: e.errors });
      res.status(500).json({ error: 'Failed to generate graduation pathway' });
    }
  }
);
```

- [ ] **Step 4: Add POST /students/:id/graduation-pathway/alternative endpoint**

Append to `advisorAnalyticsRoutes.ts`:

```typescript
advisorAnalyticsRouter.post(
  '/students/:id/graduation-pathway/alternative',
  requireRole('advisor'),
  async (req: Request, res: Response) => {
    try {
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
          include: { courses: { select: { code: true, name: true, credits: true, prerequisites: true, semesterOffered: true } } },
        }),
      ]);

      if (!student) return res.status(404).json({ error: 'Student not found' });
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
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = (message.content[0] as any).text;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(502).json({ error: 'Claude returned non-JSON response' });

      const parsed = AlternativePathwaySchema.parse(JSON.parse(jsonMatch[0]));
      res.json(parsed);
    } catch (e: any) {
      if (e?.name === 'ZodError') return res.status(502).json({ error: 'Claude response failed validation', details: e.errors });
      res.status(500).json({ error: 'Failed to generate alternative pathway' });
    }
  }
);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

- [ ] **Step 6: Smoke test GET (should return null before seed)**

```bash
curl -s http://localhost:4000/api/advisor/students/STUDENT_ID/graduation-pathway \
  -H "Authorization: Bearer TOKEN" | jq .
```

Expected: `null`

- [ ] **Step 7: Commit**

```bash
git add backend/src/api/advisorAnalyticsRoutes.ts
git commit -m "feat: add graduation pathway simulator endpoints (POST + GET + alternative)"
```

---

## Task 6: Semester Triage Dashboard Backend

**Files:**
- Modify: `backend/src/api/advisorAnalyticsRoutes.ts`

- [ ] **Step 1: Add Triage Zod schema at top of advisorAnalyticsRoutes.ts**

After the `AlternativePathwaySchema` declaration, add:

```typescript
const TriageSchema = z.array(z.object({
  studentId: z.string(),
  studentName: z.string(),
  urgencyScore: z.number().int().min(0).max(100),
  urgencyLevel: z.enum(['immediate', 'high', 'monitor', 'healthy']),
  topThreeReasons: z.array(z.string()).length(3),
  recommendedAction: z.string(),
}));
```

- [ ] **Step 2: Add POST /triage endpoint**

Append to `advisorAnalyticsRoutes.ts`:

```typescript
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

      const majorId = await (async () => {
        const advisor = await prisma.advisor.findUnique({
          where: { advisorId: req.user!.id },
          select: { majorId: true },
        });
        return advisor?.majorId || null;
      })();

      if (!majorId) return res.status(400).json({ error: 'Advisor has no major assigned' });

      const students = await prisma.student.findMany({
        where: { majorId, isActive: true },
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
  "studentId": "<exact studentId>",
  "studentName": "<exact name>",
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
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = (message.content[0] as any).text;
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return res.status(502).json({ error: 'Claude returned non-JSON response' });

      const parsed = TriageSchema.parse(JSON.parse(jsonMatch[0]));

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
      if (e?.name === 'ZodError') return res.status(502).json({ error: 'Claude response failed validation', details: e.errors });
      res.status(500).json({ error: 'Failed to run triage' });
    }
  }
);
```

- [ ] **Step 3: Add GET /triage/latest endpoint**

Append to `advisorAnalyticsRoutes.ts`:

```typescript
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/advisorAnalyticsRoutes.ts
git commit -m "feat: add semester triage dashboard endpoints (POST + GET latest)"
```

---

## Task 7: Interventions Backend + interventionService + Analyze Hook

**Files:**
- Create: `backend/src/services/interventionService.ts`
- Modify: `backend/src/api/advisorAnalyticsRoutes.ts`
- Modify: `backend/src/api/routes.ts:127-165`

- [ ] **Step 1: Create interventionService.ts**

Create `backend/src/services/interventionService.ts`:

```typescript
import { prisma } from '../db/client';

export async function updateInterventionOutcomes(
  studentId: string,
  newDriftScore: number,
  reportGeneratedAt: Date
): Promise<void> {
  const pendingOutcomes = await prisma.interventionOutcome.findMany({
    where: {
      driftScoreAfter: null,
      intervention: {
        studentId,
        interventionDate: { lt: reportGeneratedAt },
      },
    },
    include: { intervention: true },
  });

  for (const outcome of pendingOutcomes) {
    await prisma.interventionOutcome.update({
      where: { id: outcome.id },
      data: {
        driftScoreAfter: newDriftScore,
        effectivenessScore: outcome.driftScoreBefore - newDriftScore,
        measuredAt: reportGeneratedAt,
      },
    });
  }
}
```

- [ ] **Step 2: Hook interventionService into the analyze endpoint in routes.ts**

In `backend/src/api/routes.ts`, add the import after line 9 (existing imports):

```typescript
import { updateInterventionOutcomes } from '../services/interventionService';
```

In the `POST /students/:studentId/analyze` handler, after `res.json(mappedResult)` (around line 165), but BEFORE the `res.json` call (since you can't write to the response twice), add the `updateInterventionOutcomes` call before the `res.json`:

Replace the handler's return section:
```typescript
    // EXISTING CODE (don't change the mapping above it):
    res.json(mappedResult);
```

With:
```typescript
    // Fire-and-forget: update intervention outcomes with the new drift score
    updateInterventionOutcomes(req.params.studentId, result.drift_score, new Date()).catch(() => {});

    res.json(mappedResult);
```

- [ ] **Step 3: Add Interventions endpoints to advisorAnalyticsRoutes.ts**

Append to `advisorAnalyticsRoutes.ts`:

```typescript
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

      // Get current drift score for the outcome baseline
      const latestReport = await prisma.aIReport.findFirst({
        where: { studentId: req.params.id },
        orderBy: { generatedAt: 'desc' },
        select: { driftScore: true },
      });

      const intervention = await prisma.intervention.create({
        data: {
          studentId: req.params.id,
          advisorId: req.user!.id,
          interventionType,
          notes: notes ?? null,
          interventionDate: new Date(interventionDate),
        },
      });

      // Always create an outcome row (driftScoreAfter starts null)
      if (latestReport) {
        await prisma.interventionOutcome.create({
          data: {
            interventionId: intervention.id,
            driftScoreBefore: latestReport.driftScore,
          },
        });
      }

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
          intervention: { advisorId: req.user!.id },
        },
        include: { intervention: { select: { interventionType: true } } },
      });

      const byType = new Map<string, { scores: number[]; successes: number }>();
      for (const o of outcomes) {
        const type = o.intervention.interventionType;
        if (!byType.has(type)) byType.set(type, { scores: [], successes: 0 });
        const entry = byType.get(type)!;
        entry.scores.push(o.effectivenessScore!);
        if (o.effectivenessScore! > 0) entry.successes++;
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

- [ ] **Step 5: Smoke test interventions**

```bash
# Log an intervention
curl -s -X POST http://localhost:4000/api/advisor/students/STUDENT_ID/interventions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"interventionType":"Academic Counseling","notes":"Discussed study habits","interventionDate":"2026-05-01"}' | jq .

# List interventions
curl -s http://localhost:4000/api/advisor/students/STUDENT_ID/interventions \
  -H "Authorization: Bearer TOKEN" | jq .

# Effectiveness (empty before seed)
curl -s http://localhost:4000/api/advisor/intervention-effectiveness \
  -H "Authorization: Bearer TOKEN" | jq .
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/interventionService.ts backend/src/api/advisorAnalyticsRoutes.ts backend/src/api/routes.ts
git commit -m "feat: add intervention endpoints, interventionService, and analyze hook"
```

---

## Task 8: API Client Functions

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Append all 12 new advisor analytics functions to api.ts**

At the end of `frontend/lib/api.ts`, append:

```typescript
// ─────────────────────────────────────────────
// ADVISOR ANALYTICS
// ─────────────────────────────────────────────

export async function getStudentGraduationPathway(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/graduation-pathway`);
}

export async function generateGraduationPathway(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/graduation-pathway`, { method: 'POST' });
}

export async function generateAlternativePathway(studentId: string, targetMajorId: string) {
  return fetchJSON(`/advisor/students/${studentId}/graduation-pathway/alternative`, {
    method: 'POST',
    body: JSON.stringify({ targetMajorId }),
  });
}

export async function getStudentFlags(studentId: string, activeOnly?: boolean) {
  const qs = activeOnly ? '?active=true' : '';
  return fetchJSON(`/advisor/students/${studentId}/flags${qs}`);
}

export async function createStudentFlag(studentId: string, data: { flagType: string; note: string; isVisibleToStudent: boolean }) {
  return fetchJSON(`/advisor/students/${studentId}/flags`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateFlag(flagId: string, data: Partial<{ resolvedAt: string | null; note: string; isVisibleToStudent: boolean }>) {
  return fetchJSON(`/advisor/flags/${flagId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteFlag(flagId: string) {
  return fetchJSON(`/advisor/flags/${flagId}`, { method: 'DELETE' });
}

export async function runAdvisorTriage() {
  return fetchJSON('/advisor/triage', { method: 'POST' });
}

export async function getLatestTriage() {
  return fetchJSON('/advisor/triage/latest');
}

export async function getStudentInterventions(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/interventions`);
}

export async function createStudentIntervention(studentId: string, data: { interventionType: string; notes?: string; interventionDate: string }) {
  return fetchJSON(`/advisor/students/${studentId}/interventions`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getInterventionEffectiveness() {
  return fetchJSON('/advisor/intervention-effectiveness');
}

export async function getAdvisorMajors() {
  return fetchJSON('/majors');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add advisor analytics API client functions"
```

---

## Task 9: Student Profile — Prereq Warning + Tab Strip + FlagsPanel

**Files:**
- Modify: `frontend/app/advisor/students/[studentId]/page.tsx`

This task adds three things to the student profile page:
1. Amber prereq violation warning (left column, always visible if violations exist)
2. Tab strip (Course History | Pathway) replacing the raw CourseHistoryTable
3. FlagsPanel in the right column

- [ ] **Step 1: Add new API imports to page.tsx**

At the top of `frontend/app/advisor/students/[studentId]/page.tsx`, update the import from `../../../../lib/api`:

Replace the existing import line:
```typescript
import { getStudent, analyzeStudent, updateAdvisorNotes, getAcademicDNA, chatAboutStudent } from '../../../../lib/api';
```

With:
```typescript
import {
  getStudent, analyzeStudent, updateAdvisorNotes, getAcademicDNA, chatAboutStudent,
  getStudentFlags, createStudentFlag, updateFlag, deleteFlag,
} from '../../../../lib/api';
```

- [ ] **Step 2: Add FlagsPanel component before the main export**

Add the following component before `export default function StudentProfilePage()`. Insert it after the existing `CourseHistoryTable` component:

```tsx
// ─────────────────────────────────────────────
// Flags Panel
// ─────────────────────────────────────────────
const FLAG_TYPES = ['Academic Hold', 'At Risk', 'Follow Up Required', 'Prerequisite Violation', 'Positive Progress'] as const;

function FlagsPanel({ studentId }: { studentId: string }) {
  const [flags, setFlags] = useState<any[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ flagType: FLAG_TYPES[0], note: '', isVisibleToStudent: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await getStudentFlags(studentId);
      setFlags(Array.isArray(data) ? data : []);
    } catch {}
  }

  useEffect(() => { load(); }, [studentId]);

  const active = flags.filter(f => !f.resolvedAt);
  const resolved = flags.filter(f => f.resolvedAt);

  async function resolve(flagId: string) {
    await updateFlag(flagId, { resolvedAt: new Date().toISOString() });
    load();
  }

  async function remove(flagId: string) {
    await deleteFlag(flagId);
    load();
  }

  async function save() {
    setSaving(true);
    try {
      await createStudentFlag(studentId, form);
      setShowModal(false);
      setForm({ flagType: FLAG_TYPES[0], note: '', isVisibleToStudent: false });
      load();
    } catch {} finally { setSaving(false); }
  }

  return (
    <div className="ai-panel" style={{ marginTop: '12px' }}>
      <div className="sage-card-header">
        <span className="sage-card-title">Flags</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>Add Flag</button>
      </div>

      {active.length === 0 && resolved.length === 0 && (
        <div className="empty-state">
          <div className="empty-rule" />
          <div><p className="empty-msg">No flags.</p></div>
        </div>
      )}

      {active.map(f => (
        <div key={f.flagId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--ob-2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--t1)' }}>{f.flagType}</div>
              {f.note && <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>{f.note}</div>}
              {f.isVisibleToStudent && <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '2px' }}>(visible to student)</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t4)' }}>
                {new Date(f.createdAt).toLocaleDateString()}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={() => resolve(f.flagId)}>Resolve</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--red)' }} onClick={() => remove(f.flagId)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <div style={{ padding: '8px 16px' }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--t4)' }}
            onClick={() => setShowResolved(v => !v)}>
            {showResolved ? 'Hide resolved' : `Show resolved (${resolved.length})`}
          </button>
          {showResolved && resolved.map(f => (
            <div key={f.flagId} style={{ padding: '8px 0', borderBottom: '1px solid var(--ob-2)' }}>
              <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--t4)', textDecoration: 'line-through' }}>{f.flagType}</div>
              <div style={{ fontSize: '11px', color: 'var(--t4)' }}>
                Resolved {new Date(f.resolvedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sage-card" style={{ width: '380px', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px', color: 'var(--t1)' }}>Add Flag</div>
            <div className="form-group">
              <label className="input-label">Flag Type</label>
              <select className="sage-select" value={form.flagType} onChange={e => setForm(f => ({ ...f, flagType: e.target.value as any }))}>
                {FLAG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Note</label>
              <textarea className="sage-input" rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="vis" checked={form.isVisibleToStudent} onChange={e => setForm(f => ({ ...f, isVisibleToStudent: e.target.checked }))} />
              <label htmlFor="vis" className="input-label" style={{ marginBottom: 0 }}>Visible to student</label>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-amber btn-sm" disabled={saving || !form.note} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add prereq warning and tab strip to the page layout**

In the `StudentProfilePage` component's return block, replace the `sage-body` section (starting at line 550):

```tsx
      <div className="sage-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {/* Prereq violation warning */}
            {(student as any).prerequisiteViolations?.length > 0 && (
              <div style={{ borderLeft: '3px solid var(--am)', padding: '10px 14px', marginBottom: '12px', background: 'var(--am-bg, rgba(245,158,11,0.06))', borderRadius: '0 4px 4px 0' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--am)', marginBottom: '4px' }}>Prerequisite Violations</div>
                {(student as any).prerequisiteViolations.map((v: any, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--t2)' }}>
                    {v.courseName} — missing {v.missingPrerequisiteCode}
                  </div>
                ))}
              </div>
            )}

            {/* Tab strip */}
            {(() => {
              const [activeTab, setActiveTab] = useState<'history' | 'pathway'>('history');
              return (
                <>
                  <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--ob-2)', marginBottom: '16px' }}>
                    {(['history', 'pathway'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
                        fontSize: '13px', fontWeight: 500,
                        borderBottom: activeTab === tab ? '2px solid var(--am)' : '2px solid transparent',
                        color: activeTab === tab ? 'var(--t1)' : 'var(--t4)',
                      }}>
                        {tab === 'history' ? 'Course History' : 'Pathway'}
                      </button>
                    ))}
                  </div>
                  {activeTab === 'history' ? (
                    <CourseHistoryTable enrollments={student.enrollments} />
                  ) : (
                    <div style={{ color: 'var(--t3)', fontSize: '13px', padding: '20px 0' }}>
                      Pathway tab — implemented in next task.
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Right column */}
          <div>
            <AIReportPanel
              report={latestReport as AIReport | null}
              studentId={studentId}
              onNoteSaved={load}
            />
            <FlagsPanel studentId={studentId} />
            <AcademicDNAPanel studentId={studentId} />
            <ChatPanel studentId={studentId} />
          </div>
        </div>
      </div>
```

**Note:** React does not allow hooks inside an IIFE inside JSX. The tab strip needs its own component. Extract it:

Replace the entire left column section with a separate `LeftColumn` component added before `StudentProfilePage`:

```tsx
function LeftColumn({ student, studentId }: { student: any; studentId: string }) {
  const [activeTab, setActiveTab] = useState<'history' | 'pathway'>('history');

  return (
    <div>
      {student.prerequisiteViolations?.length > 0 && (
        <div style={{ borderLeft: '3px solid var(--am)', padding: '10px 14px', marginBottom: '12px', background: 'rgba(245,158,11,0.06)', borderRadius: '0 4px 4px 0' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--am)', marginBottom: '4px' }}>Prerequisite Violations</div>
          {student.prerequisiteViolations.map((v: any, i: number) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--t2)' }}>
              {v.courseName} — missing {v.missingPrerequisiteCode}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--ob-2)', marginBottom: '16px' }}>
        {(['history', 'pathway'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
            fontSize: '13px', fontWeight: 500,
            borderBottom: activeTab === tab ? '2px solid var(--am)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--t1)' : 'var(--t4)',
          }}>
            {tab === 'history' ? 'Course History' : 'Pathway'}
          </button>
        ))}
      </div>

      {activeTab === 'history' ? (
        <CourseHistoryTable enrollments={student.enrollments} />
      ) : (
        <PathwayTab studentId={studentId} student={student} />
      )}
    </div>
  );
}
```

And update `StudentProfilePage`'s return block to use `<LeftColumn student={student} studentId={studentId} />` in place of the old left div.

The full updated `sage-body` div becomes:

```tsx
      <div className="sage-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>
          <LeftColumn student={student} studentId={studentId} />
          <div>
            <AIReportPanel
              report={latestReport as AIReport | null}
              studentId={studentId}
              onNoteSaved={load}
            />
            <FlagsPanel studentId={studentId} />
            <AcademicDNAPanel studentId={studentId} />
            <ChatPanel studentId={studentId} />
          </div>
        </div>
      </div>
```

Add a stub `PathwayTab` component before `LeftColumn` (will be replaced in Task 10):

```tsx
function PathwayTab({ studentId, student }: { studentId: string; student: any }) {
  return <div style={{ color: 'var(--t3)', fontSize: '13px', padding: '20px 0' }}>Loading pathway…</div>;
}
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/advisor/students/[studentId]/page.tsx
git commit -m "feat: add prereq warning, tab strip, and FlagsPanel to advisor student profile"
```

---

## Task 10: Student Profile — Pathway Tab

**Files:**
- Modify: `frontend/app/advisor/students/[studentId]/page.tsx`

This task replaces the `PathwayTab` stub with the full Pathway tab UI: summary strip, semester plan table, recovery plan, and alternative pathway toggle.

- [ ] **Step 1: Add pathway API imports**

In the import line from `../../../../lib/api`, add:

```typescript
getStudentGraduationPathway, generateGraduationPathway, generateAlternativePathway, getAdvisorMajors,
```

- [ ] **Step 2: Replace the PathwayTab stub with the full implementation**

Replace the stub `PathwayTab` component with:

```tsx
function PathwayTab({ studentId, student }: { studentId: string; student: any }) {
  const [subTab, setSubTab] = useState<'current' | 'alternative'>('current');
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Alternative pathway state
  const [majors, setMajors] = useState<any[]>([]);
  const [targetMajorId, setTargetMajorId] = useState('');
  const [altPlan, setAltPlan] = useState<any | null>(null);
  const [generatingAlt, setGeneratingAlt] = useState(false);

  useEffect(() => {
    getStudentGraduationPathway(studentId)
      .then(data => setPlan(data?.pathway ?? (data?.semesterPlans ?? null)))
      .catch(() => {})
      .finally(() => setLoading(false));
    getAdvisorMajors().then((data: any[]) => {
      setMajors(Array.isArray(data) ? data.filter((m: any) => m.majorId !== student.majorId) : []);
    }).catch(() => {});
  }, [studentId]);

  async function generate() {
    setGenerating(true);
    try {
      const data = await generateGraduationPathway(studentId);
      setPlan(data?.pathway ?? null);
    } catch {} finally { setGenerating(false); }
  }

  async function generateAlt() {
    if (!targetMajorId) return;
    setGeneratingAlt(true);
    try {
      const data = await generateAlternativePathway(studentId, targetMajorId);
      setAltPlan(data);
    } catch {} finally { setGeneratingAlt(false); }
  }

  const pathway = plan;

  return (
    <div>
      {/* Sub-tab toggle: Current Major | Alternative Major */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {(['current', 'alternative'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            fontSize: '12.5px', fontWeight: 500,
            borderBottom: subTab === t ? '2px solid var(--am)' : '2px solid transparent',
            color: subTab === t ? 'var(--t1)' : 'var(--t4)',
          }}>
            {t === 'current' ? 'Current Major' : 'Alternative Major'}
          </button>
        ))}
      </div>

      {subTab === 'current' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            {generating ? (
              <span style={{ fontSize: '12px', color: 'var(--t4)' }}>Generating pathway…</span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={generate}>
                {pathway ? 'Regenerate Pathway' : 'Generate Pathway'}
              </button>
            )}
          </div>

          {loading && <div style={{ fontSize: '13px', color: 'var(--t4)' }}>Loading…</div>}

          {!loading && !pathway && !generating && (
            <div className="empty-state">
              <div className="empty-rule" />
              <div><p className="empty-msg">No pathway generated yet.</p></div>
            </div>
          )}

          {pathway && (
            <>
              {/* Summary strip */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', padding: '12px', background: 'var(--ob-1)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Credits Remaining</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)' }}>
                    {pathway.semestersRemaining * 15}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Semesters Left</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)' }}>
                    {pathway.semestersRemaining}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Projected Graduation</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: pathway.onTrack ? 'var(--green)' : 'var(--am)' }}>
                    {pathway.projectedGraduationDate}
                  </div>
                </div>
              </div>

              {/* Semester plan table */}
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)', marginBottom: '6px' }}>Semester Plan</div>
              <table className="data-table" style={{ marginBottom: '16px' }}>
                <thead>
                  <tr><th>Semester</th><th>Year</th><th>Planned Courses</th></tr>
                </thead>
                <tbody>
                  {pathway.semesterPlan?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td>S{s.semesterNumber}</td>
                      <td>{s.year}</td>
                      <td style={{ fontSize: '12px' }}>{s.courseCodes?.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Recovery plan */}
              {pathway.recoveryPlan?.length > 0 && (
                <>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--am)', marginBottom: '6px' }}>Recovery Plan</div>
                  <table className="data-table">
                    <thead>
                      <tr><th>Semester</th><th>Year</th><th>Makeup Courses</th></tr>
                    </thead>
                    <tbody>
                      {pathway.recoveryPlan.map((s: any, i: number) => (
                        <tr key={i}>
                          <td>S{s.semesterNumber}</td>
                          <td>{s.year}</td>
                          <td style={{ fontSize: '12px' }}>{s.courseCodes?.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      )}

      {subTab === 'alternative' && (
        <div>
          {/* Major selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <select className="sage-select" style={{ flex: 1 }} value={targetMajorId} onChange={e => setTargetMajorId(e.target.value)}>
              <option value="">Select alternative major…</option>
              {majors.map((m: any) => <option key={m.majorId} value={m.majorId}>{m.name}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" disabled={!targetMajorId || generatingAlt} onClick={generateAlt}>
              {generatingAlt ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {altPlan && (
            <>
              {/* Comparison strip */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '12px', background: 'var(--ob-1)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Transferable Credits</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)' }}>{altPlan.transferableCredits}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>New Courses Required</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)' }}>{altPlan.newCoursesRequired?.length ?? 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--t4)' }}>Projected Graduation</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--am)' }}>{altPlan.projectedGraduationDate}</div>
                </div>
              </div>

              {/* Alt semester plan table */}
              <table className="data-table">
                <thead>
                  <tr><th>Semester</th><th>Year</th><th>Planned Courses</th></tr>
                </thead>
                <tbody>
                  {altPlan.semesterPlan?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td>S{s.semesterNumber}</td>
                      <td>{s.year}</td>
                      <td style={{ fontSize: '12px' }}>{s.courseCodes?.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!altPlan && !generatingAlt && (
            <div className="empty-state">
              <div className="empty-rule" />
              <div><p className="empty-msg">Select a major and generate a comparison pathway.</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/advisor/students/[studentId]/page.tsx
git commit -m "feat: implement full Pathway tab with current/alternative major views"
```

---

## Task 11: Student Profile — InterventionsPanel

**Files:**
- Modify: `frontend/app/advisor/students/[studentId]/page.tsx`

- [ ] **Step 1: Add intervention API imports**

In the api import line, add:

```typescript
getStudentInterventions, createStudentIntervention,
```

- [ ] **Step 2: Add InterventionsPanel component before LeftColumn**

```tsx
// ─────────────────────────────────────────────
// Interventions Panel
// ─────────────────────────────────────────────
function InterventionsPanel({ studentId }: { studentId: string }) {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ interventionType: '', notes: '', interventionDate: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await getStudentInterventions(studentId);
      setInterventions(Array.isArray(data) ? data : []);
    } catch {}
  }

  useEffect(() => { load(); }, [studentId]);

  async function save() {
    if (!form.interventionType || !form.interventionDate) return;
    setSaving(true);
    try {
      await createStudentIntervention(studentId, form);
      setShowModal(false);
      setForm({ interventionType: '', notes: '', interventionDate: new Date().toISOString().split('T')[0] });
      load();
    } catch {} finally { setSaving(false); }
  }

  function effectivenessLine(outcome: any) {
    if (!outcome) return null;
    if (outcome.driftScoreAfter === null) {
      return <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '3px' }}>Awaiting next analysis</div>;
    }
    const score = outcome.effectivenessScore;
    if (score > 0) return <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '3px' }}>+{score.toFixed(2)} improvement</div>;
    if (score < 0) return <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '3px' }}>{score.toFixed(2)} worsened</div>;
    return <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '3px' }}>No change</div>;
  }

  return (
    <div className="ai-panel" style={{ marginTop: '12px' }}>
      <div className="sage-card-header">
        <span className="sage-card-title">Interventions</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>Log Intervention</button>
      </div>

      {interventions.length === 0 && (
        <div className="empty-state">
          <div className="empty-rule" />
          <div><p className="empty-msg">No interventions logged.</p></div>
        </div>
      )}

      {interventions.map(iv => (
        <div key={iv.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--ob-2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--t1)' }}>{iv.interventionType}</div>
              {iv.notes && <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>{iv.notes}</div>}
              {effectivenessLine(iv.outcome)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t4)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
              {new Date(iv.interventionDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sage-card" style={{ width: '380px', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px', color: 'var(--t1)' }}>Log Intervention</div>
            <div className="form-group">
              <label className="input-label">Intervention Type</label>
              <input className="sage-input" value={form.interventionType} onChange={e => setForm(f => ({ ...f, interventionType: e.target.value }))} placeholder="e.g. Academic Counseling" />
            </div>
            <div className="form-group">
              <label className="input-label">Notes</label>
              <textarea className="sage-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="input-label">Date</label>
              <input type="date" className="sage-input" value={form.interventionDate} onChange={e => setForm(f => ({ ...f, interventionDate: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-amber btn-sm" disabled={saving || !form.interventionType} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add InterventionsPanel to the right column**

In `StudentProfilePage`'s right column, add `<InterventionsPanel studentId={studentId} />` after `<FlagsPanel studentId={studentId} />`:

```tsx
          <div>
            <AIReportPanel
              report={latestReport as AIReport | null}
              studentId={studentId}
              onNoteSaved={load}
            />
            <FlagsPanel studentId={studentId} />
            <InterventionsPanel studentId={studentId} />
            <AcademicDNAPanel studentId={studentId} />
            <ChatPanel studentId={studentId} />
          </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/advisor/students/[studentId]/page.tsx
git commit -m "feat: add InterventionsPanel to advisor student profile right column"
```

---

## Task 12: My Students Page — Triage Mode

**Files:**
- Modify: `frontend/app/advisor/students/page.tsx`

- [ ] **Step 1: Rewrite the students page with triage mode**

Replace the entire contents of `frontend/app/advisor/students/page.tsx` with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdvisorStudents, runAdvisorTriage, getLatestTriage } from '@/lib/api';

const URGENCY_BORDER: Record<string, string> = {
  immediate: '2px solid var(--red-dot)',
  high: '2px solid var(--am)',
  monitor: '2px solid var(--t3)',
  healthy: 'none',
};

export default function AdvisorStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Triage state
  const [triageData, setTriageData] = useState<any | null>(null);
  const [triageMode, setTriageMode] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    Promise.all([
      getAdvisorStudents().then(data => setStudents(Array.isArray(data) ? data : [])),
      getLatestTriage().then(data => {
        if (data) {
          setTriageData(data);
          setTriageMode(true);
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function runTriage() {
    setRunning(true);
    try {
      const data = await runAdvisorTriage();
      setTriageData(data);
      setTriageMode(true);
    } catch {} finally { setRunning(false); }
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.studentNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  const triageStudents: any[] = triageData?.students ?? [];
  const sortedTriage = [...triageStudents].sort((a, b) => b.urgencyScore - a.urgencyScore);
  const studentMap = new Map(students.map(s => [s.studentId, s]));

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">My Students</div>
        <div className="sage-page-sub">Students in your assigned major</div>
      </div>

      <div className="sage-body">
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {!triageMode && (
            <div className="sage-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search by name, email, or ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
          <div style={{ flex: 1 }} />
          {!triageMode && (
            <button className="btn btn-ghost btn-sm" onClick={runTriage} disabled={running}>
              {running ? 'Running Triage…' : 'Run Semester Triage'}
            </button>
          )}
        </div>

        {running && (
          <div style={{ fontSize: '13px', color: 'var(--t4)', marginBottom: '12px' }}>
            Analyzing all assigned students…
          </div>
        )}

        {/* Triage header */}
        {triageMode && triageData && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 0', color: 'var(--t4)' }} onClick={() => setTriageMode(false)}>
                ← Back to standard view
              </button>
              <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                Last triage: {new Date(triageData.runAt).toLocaleDateString()} — {sortedTriage.length} students analyzed
              </span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={runTriage} disabled={running}>
              Re-run
            </button>
          </div>
        )}

        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading students…</div>
          ) : triageMode ? (
            /* TRIAGE TABLE */
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Urgency Score</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedTriage.map(ts => {
                  const s = studentMap.get(ts.studentId);
                  return (
                    <tr key={ts.studentId} style={{ borderLeft: URGENCY_BORDER[ts.urgencyLevel] }}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar">
                            {ts.studentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="student-name" style={{ fontWeight: 600 }}>{ts.studentName}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--t3)' }}>{ts.topThreeReasons[0]}</div>
                            <div style={{ fontSize: '11px', color: 'var(--t4)' }}>{ts.recommendedAction}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: '13px' }}>
                        {ts.urgencyScore}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--t2)', textTransform: 'capitalize' }}>
                          {ts.urgencyLevel}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {s && (
                          <Link href={`/advisor/students/${s.studentId}`} className="btn btn-ghost-light btn-sm">
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedTriage.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-rule" />
                        <div><p className="empty-msg">No triage results.</p></div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* STANDARD TABLE */
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Major</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => (
                  <tr key={student.studentId}>
                    <td>
                      <div className="student-cell">
                        <div className="student-avatar">
                          {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="student-name">{student.name}</div>
                          <div className="student-email">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                      {student.studentNumber || student.studentId}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>
                      {student.major?.name || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/advisor/students/${student.studentId}`} className="btn btn-ghost-light btn-sm">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-rule" />
                        <div>
                          <p className="empty-msg">No students found.</p>
                          <p className="empty-sub">
                            {search ? 'Try a different search term.' : 'No students are assigned to you yet.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/advisor/students/page.tsx
git commit -m "feat: add semester triage mode to My Students page"
```

---

## Task 13: Advisor Dashboard — Intervention Insights

**Files:**
- Modify: `frontend/app/advisor/dashboard/page.tsx`

- [ ] **Step 1: Add intervention effectiveness API import**

In `frontend/app/advisor/dashboard/page.tsx`, add to the existing import:

```typescript
import { getStudents, getInterventionEffectiveness } from '../../../lib/api';
```

- [ ] **Step 2: Add interventionData state and effect**

Inside `AdvisorDashboard`, after the existing `useEffect`:

```typescript
  const [interventionData, setInterventionData] = useState<any[]>([]);

  useEffect(() => {
    getInterventionEffectiveness()
      .then(data => setInterventionData(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);
```

- [ ] **Step 3: Add Intervention Insights section below the existing body div**

In the `AdvisorDashboard` return block, after the closing `</div>` of the `sage-body` grid div (around line 355 of the original file), add:

```tsx
      {/* Intervention Insights */}
      <div className="sage-body" style={{ marginTop: '0', paddingTop: '0' }}>
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">Intervention Insights</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t4)', padding: '0 16px 12px' }}>
            Effectiveness is measured as drift score change between intervention and next AI analysis.
          </div>
          {interventionData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">No intervention data yet.</p>
                <p className="empty-sub">Log interventions on student profiles to track effectiveness.</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Intervention Type</th>
                  <th>Times Used</th>
                  <th>Avg Effectiveness</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {interventionData.map((row: any) => (
                  <tr key={row.interventionType}>
                    <td style={{ fontWeight: 500 }}>{row.interventionType}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>{row.timesUsed}</td>
                    <td style={{ fontSize: '12.5px', color: row.avgEffectiveness > 0 ? 'var(--green)' : row.avgEffectiveness < 0 ? 'var(--red)' : 'var(--t3)' }}>
                      {row.avgEffectiveness > 0 ? '+' : ''}{row.avgEffectiveness.toFixed(2)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: row.successRate >= 60 ? 'var(--green)' : row.successRate >= 40 ? 'var(--am)' : 'var(--red)' }}>
                        {row.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/advisor/dashboard/page.tsx
git commit -m "feat: add Intervention Insights table to advisor dashboard"
```

---

## Task 14: Seed Data

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Update wipe order in seed.ts**

In the `main()` function, find the wipe block and add 5 new wipe calls BEFORE `await prisma.studentFlag.deleteMany()`:

```typescript
  await prisma.interventionOutcome.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.triageRun.deleteMany();
  await prisma.studentPlan.deleteMany();
  await prisma.degreeRequirement.deleteMany();
  await prisma.appointmentRequest.deleteMany();  // existing
  await prisma.studentFlag.deleteMany();         // existing
```

- [ ] **Step 2: Add the new import to seed.ts**

At the top of `backend/prisma/seed.ts`, add `RequirementType` to the Prisma import:

```typescript
import { PrismaClient, EnrollmentStatus, ExamType, RequirementType } from '@prisma/client';
```

- [ ] **Step 3: Add all new seed data at end of main() before the console.log lines**

Add the following before the final `console.log` calls at the end of `main()`. The existing variables `advisor1`, `lara`, `nadia`, `omar`, `cs`, `business`, `cs101`, `cs102`, `cs201`, `cs202`, `cs301`, `cs302`, `cs401`, `cs402`, `bus101`, `bus102`, `bus201`, `bus202`, `bus301`, `bus302` are all in scope:

```typescript
  // ─────────────────────────────────────────────
  // DEGREE REQUIREMENTS
  // ─────────────────────────────────────────────
  await prisma.degreeRequirement.createMany({
    data: [
      // CS: 3 core requirements
      { majorId: cs.majorId, courseId: cs101.courseId, requirementType: RequirementType.core, recommendedSemester: 1 },
      { majorId: cs.majorId, courseId: cs201.courseId, requirementType: RequirementType.core, recommendedSemester: 2 },
      { majorId: cs.majorId, courseId: cs202.courseId, requirementType: RequirementType.core, recommendedSemester: 3 },
      // CS: 3 elective requirements
      { majorId: cs.majorId, courseId: cs301.courseId, requirementType: RequirementType.elective, recommendedSemester: 4 },
      { majorId: cs.majorId, courseId: cs302.courseId, requirementType: RequirementType.elective, recommendedSemester: 4 },
      { majorId: cs.majorId, courseId: cs401.courseId, requirementType: RequirementType.elective, recommendedSemester: 5 },
      // Business: 3 requirements
      { majorId: business.majorId, courseId: bus101.courseId, requirementType: RequirementType.core, recommendedSemester: 1 },
      { majorId: business.majorId, courseId: bus102.courseId, requirementType: RequirementType.core, recommendedSemester: 1 },
      { majorId: business.majorId, courseId: bus301.courseId, requirementType: RequirementType.elective, recommendedSemester: 3 },
    ],
  });
  console.log('✅ DegreeRequirements seeded');

  // ─────────────────────────────────────────────
  // STUDENT PLANS (Lara — pre-generated pathway)
  // ─────────────────────────────────────────────
  await prisma.studentPlan.create({
    data: {
      studentId: lara.studentId,
      advisorId: advisor1.advisorId,
      isAiGenerated: true,
      semesterPlans: {
        semestersRemaining: 3,
        projectedGraduationDate: 'S2 2026',
        onTrack: true,
        semesterPlan: [
          { semesterNumber: 1, year: 2026, courseCodes: ['CS401', 'CS402'] },
          { semesterNumber: 2, year: 2026, courseCodes: ['CS402'] },
          { semesterNumber: 1, year: 2027, courseCodes: ['CS499'] },
        ],
        prerequisiteViolations: [],
      },
    },
  });
  console.log('✅ StudentPlan seeded for Lara');

  // ─────────────────────────────────────────────
  // INTERVENTIONS + OUTCOMES
  // ─────────────────────────────────────────────
  // Lara: Academic Counseling 3 months ago, positive outcome
  const laraIntervention = await prisma.intervention.create({
    data: {
      studentId: lara.studentId,
      advisorId: advisor1.advisorId,
      interventionType: 'Academic Counseling',
      notes: 'Discussed study strategies and time management.',
      interventionDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.interventionOutcome.create({
    data: {
      interventionId: laraIntervention.id,
      driftScoreBefore: 0.45,
      driftScoreAfter: 0.22,
      effectivenessScore: 0.23,
      measuredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  });

  // Nadia: Course Load Reduction 2 months ago, awaiting outcome
  const nadiaIntervention1 = await prisma.intervention.create({
    data: {
      studentId: nadia.studentId,
      advisorId: advisor1.advisorId,
      interventionType: 'Course Load Reduction',
      notes: 'Reduced from 5 to 3 courses for this semester.',
      interventionDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.interventionOutcome.create({
    data: {
      interventionId: nadiaIntervention1.id,
      driftScoreBefore: 0.82,
      driftScoreAfter: null,
    },
  });

  // Nadia: Tutoring Referral 1 month ago, no outcome row yet
  await prisma.intervention.create({
    data: {
      studentId: nadia.studentId,
      advisorId: advisor1.advisorId,
      interventionType: 'Tutoring Referral',
      notes: 'Referred to CS department tutoring center.',
      interventionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Interventions and outcomes seeded');

  // ─────────────────────────────────────────────
  // STUDENT FLAGS
  // ─────────────────────────────────────────────
  await prisma.studentFlag.createMany({
    data: [
      {
        studentId: lara.studentId,
        advisorId: advisor1.advisorId,
        flagType: 'Positive Progress',
        note: 'Significant improvement in CS202 and CS301 this semester.',
        isVisibleToStudent: true,
      },
      {
        studentId: nadia.studentId,
        advisorId: advisor1.advisorId,
        flagType: 'At Risk',
        note: 'GPA below 2.0, struggling with core CS courses. Needs immediate attention.',
        isVisibleToStudent: false,
      },
    ],
  });
  console.log('✅ StudentFlags seeded');

  // ─────────────────────────────────────────────
  // TRIAGE RUN (seeded 7 days ago)
  // ─────────────────────────────────────────────
  await prisma.triageRun.create({
    data: {
      advisorId: advisor1.advisorId,
      semester: 1,
      year: 2026,
      runAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      result: [
        {
          studentId: nadia.studentId,
          studentName: 'Nadia Khalil',
          urgencyScore: 88,
          urgencyLevel: 'immediate',
          topThreeReasons: ['GPA below 2.0 — academic probation risk', 'Failed CS102 prerequisite', 'Drift score 82%'],
          recommendedAction: 'Schedule emergency advising session and consider academic leave options.',
        },
        {
          studentId: omar.studentId,
          studentName: 'Omar Nassar',
          urgencyScore: 52,
          urgencyLevel: 'high',
          topThreeReasons: ['Consistently low scores in math-heavy courses', 'Failed CS202 attempt', 'GPA declining trend'],
          recommendedAction: 'Refer to math tutoring center and review course load.',
        },
        {
          studentId: lara.studentId,
          studentName: 'Lara Haddad',
          urgencyScore: 12,
          urgencyLevel: 'healthy',
          topThreeReasons: ['GPA 3.4 — on track', 'No prerequisite violations', 'Positive drift trend'],
          recommendedAction: 'Continue monitoring. Consider recommending honors track.',
        },
      ],
    },
  });
  console.log('✅ TriageRun seeded');
```

- [ ] **Step 4: Run the seed**

```bash
cd backend
npx prisma db seed
```

Expected: all ✅ lines print, no errors.

- [ ] **Step 5: Verify data**

```bash
# Verify flags
curl -s http://localhost:4000/api/advisor/students/LARA_ID/flags \
  -H "Authorization: Bearer TOKEN" | jq 'length'
# Expected: 1

# Verify triage
curl -s http://localhost:4000/api/advisor/triage/latest \
  -H "Authorization: Bearer TOKEN" | jq '.students | length'
# Expected: 3

# Verify interventions
curl -s http://localhost:4000/api/advisor/students/LARA_ID/interventions \
  -H "Authorization: Bearer TOKEN" | jq '.[0].outcome.effectivenessScore'
# Expected: 0.23
```

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat: seed advisor features data (flags, plans, interventions, triage)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Schema: 5 models + RequirementType enum + back-relations (Task 1)
- [x] Feature 3 Flags: POST/GET/PATCH/DELETE (Tasks 3, 9)
- [x] Feature 4 Prereq: shared service + advisor endpoint + frontend warning (Tasks 2, 4, 9)
- [x] Feature 1 Pathway: GET + POST + alternative POST + full UI (Tasks 5, 10)
- [x] Feature 2 Triage: POST + GET latest + triage mode frontend (Tasks 6, 12)
- [x] Feature 5 Interventions: POST/GET endpoints + service hook + panels + dashboard (Tasks 7, 11, 13)
- [x] API client: 12 functions (Task 8)
- [x] Seed: all 5 new tables (Task 14)

**Placeholder scan:** No TBD, no TODO, no "similar to Task N". Every code block is complete.

**Type consistency:**
- `StudentPlan.semesterPlans` is `Json` in schema; read as `plan?.pathway ?? plan?.semesterPlans` in frontend (covers both seed shape and API shape)
- `detectPrerequisiteViolations` returns `{ courseName, missingPrerequisiteCode }[]` in service; student route maps to `{ courseName, missingPrereq }[]` to avoid breaking existing frontend; advisor route returns service response directly
- `updateInterventionOutcomes` is fire-and-forget (`.catch(() => {})`) — analyze endpoint never fails due to it
