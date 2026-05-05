# SAGE Student Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 student-facing features — degree ring, academic standing, grade trend, recommended courses, prerequisite violations, advisor messages, and appointment requests — without touching the advisor/admin views or existing tables.

**Architecture:** New `StudentFlag` and `AppointmentRequest` Prisma models (one migration). All student analytics served from a new `studentAnalyticsRoutes.ts` router mounted alongside the existing `/api` routes. The dashboard fetches all new data with `Promise.allSettled` so any single failure degrades gracefully.

**Tech Stack:** Express.js + TypeScript + Prisma (PostgreSQL) · Next.js 14 + React 18 + inline SVG (no chart library) · JWT auth via `requireSelf` middleware

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `backend/prisma/schema.prisma` | Modify | Add `StudentFlag`, `AppointmentRequest`, `AppointmentStatus` enum, and relations |
| `backend/prisma/seed.ts` | Modify | Wipe new tables + seed 2 visible flags + 2 appointment records |
| `backend/src/api/studentAnalyticsRoutes.ts` | **Create** | 8 student analytics endpoints |
| `backend/src/api/advisorSisRoutes.ts` | Modify | Add 2 advisor appointment endpoints; extend student profile with `academicStanding` |
| `backend/src/index.ts` | Modify | Mount `studentAnalyticsRoutes` |
| `frontend/lib/api.ts` | Modify | Add 10 new API client functions |
| `frontend/app/dashboard/page.tsx` | Modify | Features 1–4, 6: ring, standing, trend, recommended, advisor messages |
| `frontend/app/schedules/mine/page.tsx` | Modify | Feature 5: prerequisite violation warning |
| `frontend/app/appointments/layout.tsx` | **Create** | Wrap appointments page in `LayoutShell` |
| `frontend/app/appointments/page.tsx` | **Create** | Feature 7 student side: history table + request form |
| `frontend/app/advisor/appointments/page.tsx` | **Create** | Feature 7 advisor side: respond to appointment requests |
| `frontend/components/LayoutShell.tsx` | Modify | Add Appointments to student nav `links` array |
| `frontend/components/Sidebar.tsx` | Modify | Add `count?: number` to `NavItem` interface; render as plain `--t3` text |
| `frontend/components/AdvisorLayout.tsx` | Modify | Add Appointments to `mainItems`; fetch pending count on mount |

---

## Task 1: Prisma Schema — Add StudentFlag and AppointmentRequest

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the `AppointmentStatus` enum and two new models**

Open `backend/prisma/schema.prisma`. After the last existing enum (`AttendanceStatus`), add:

```prisma
enum AppointmentStatus {
  pending
  confirmed
  cancelled
}
```

After the last existing model (`EnrollmentAttendance`), add:

```prisma
model StudentFlag {
  flagId             String    @id @default(uuid()) @map("flag_id")
  studentId          String    @map("student_id")
  advisorId          String    @map("advisor_id")
  note               String
  flagType           String    @map("flag_type")
  isVisibleToStudent Boolean   @default(false) @map("is_visible_to_student")
  resolvedAt         DateTime? @map("resolved_at")
  createdAt          DateTime  @default(now()) @map("created_at")

  student Student @relation(fields: [studentId], references: [studentId])
  advisor Advisor @relation(fields: [advisorId], references: [advisorId])

  @@index([studentId])
  @@map("student_flags")
}

model AppointmentRequest {
  appointmentId      String            @id @default(uuid()) @map("appointment_id")
  studentId          String            @map("student_id")
  advisorId          String?           @map("advisor_id")
  topic              String
  requestedDate      DateTime          @map("requested_date")
  notes              String?
  status             AppointmentStatus @default(pending)
  advisorResponse    String?           @map("advisor_response")
  cancellationReason String?           @map("cancellation_reason")
  createdAt          DateTime          @default(now()) @map("created_at")

  student Student  @relation(fields: [studentId], references: [studentId])
  advisor Advisor? @relation(fields: [advisorId], references: [advisorId])

  @@index([studentId])
  @@index([advisorId])
  @@map("appointment_requests")
}
```

- [ ] **Step 2: Add relations to `Student` and `Advisor` models**

In the `Student` model, after `paymentSlips PaymentSlip[]`, add:
```prisma
  flags        StudentFlag[]
  appointments AppointmentRequest[]
```

In the `Advisor` model, after `comments AdvisorComment[]`, add:
```prisma
  flags        StudentFlag[]
  appointments AppointmentRequest[]
```

- [ ] **Step 3: Verify schema parses**

```bash
cd backend && npx prisma validate
```
Expected: `The schema at ... is valid.`

---

## Task 2: Run Migration

**Files:**
- Creates: `backend/prisma/migrations/[timestamp]_add_student_flags_and_appointments/`

- [ ] **Step 1: Generate and apply migration**

```bash
cd backend && npx prisma migrate dev --name add_student_flags_and_appointments
```
Expected output includes:
```
✔ Generated Prisma Client
The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ [timestamp]_add_student_flags_and_appointments/
    └─ migration.sql
```

- [ ] **Step 2: Regenerate Prisma client**

```bash
cd backend && npx prisma generate
```
Expected: `✔ Generated Prisma Client`

- [ ] **Step 3: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add StudentFlag and AppointmentRequest schema"
```

---

## Task 3: Seed Additions

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Add new tables to the wipe section**

Find the wipe block (starts with `await prisma.enrollmentAttendance.deleteMany()`). Add two lines **before** `await prisma.student.deleteMany()`:

```typescript
  await prisma.appointmentRequest.deleteMany();
  await prisma.studentFlag.deleteMany();
```

- [ ] **Step 2: Add seed records at the end of `main()`, before the final `console.log`**

Find the last `console.log` call near the bottom of `main()`. Before it, add:

```typescript
  // ── Advisor-visible flags (Feature 6 demo) ──────────────
  await prisma.studentFlag.create({
    data: {
      studentId: lara.studentId,
      advisorId: advisor1.advisorId,
      note: 'Great improvement in CS301 this semester. Keep up the momentum heading into semester 6.',
      flagType: 'academic',
      isVisibleToStudent: true,
    },
  });

  await prisma.studentFlag.create({
    data: {
      studentId: omar.studentId,
      advisorId: advisor1.advisorId,
      note: 'Please book an appointment to discuss your course selection for next semester before registration opens.',
      flagType: 'academic',
      isVisibleToStudent: true,
    },
  });

  // ── Demo appointment requests (Feature 7 demo) ───────────
  await prisma.appointmentRequest.create({
    data: {
      studentId: lara.studentId,
      topic: 'Academic Planning',
      requestedDate: new Date('2026-05-15T10:00:00Z'),
      notes: 'Would like to discuss course selection for my final semester.',
      status: 'confirmed',
      advisorId: advisor1.advisorId,
      advisorResponse: 'Confirmed for May 15 at 10am. See you then.',
    },
  });

  await prisma.appointmentRequest.create({
    data: {
      studentId: omar.studentId,
      topic: 'Grade Concern',
      requestedDate: new Date('2026-05-20T14:00:00Z'),
      notes: 'Want to talk about my CS202 result.',
      status: 'pending',
    },
  });
```

- [ ] **Step 3: Run seed and verify**

```bash
cd backend && npx prisma db seed
```
Expected: seed script logs complete without error. Then verify:
```bash
cd backend && npx prisma studio
```
Open `student_flags` table in Studio — should see 2 rows with `is_visible_to_student = true`.

- [ ] **Step 4: Commit**

```bash
cd backend
git add prisma/seed.ts
git commit -m "feat: seed StudentFlag and AppointmentRequest demo records"
```

---

## Task 4: Create studentAnalyticsRoutes.ts Scaffold + Mount

**Files:**
- Create: `backend/src/api/studentAnalyticsRoutes.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create the file with router and a health-check route**

Create `backend/src/api/studentAnalyticsRoutes.ts`:

```typescript
/**
 * SAGE — Student Analytics Routes
 * Mounted at /api/students/:studentId alongside existing routes.
 * All routes use requireSelf — checks req.params.studentId against JWT id.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireSelf } from '../middleware/auth';

export const studentAnalyticsRouter = Router({ mergeParams: true });

const COMPLETED_STATUSES = ['completed'];
const ACTIVE_STATUSES = ['in_progress', 'registered', 'approved', 'pending'];

function isCompleted(e: { status: string; finalGrade: number | null }): boolean {
  return e.finalGrade !== null || COMPLETED_STATUSES.includes(e.status);
}

function isActive(e: { status: string; finalGrade: number | null }): boolean {
  return ACTIVE_STATUSES.includes(e.status) && e.finalGrade === null;
}
```

- [ ] **Step 2: Mount in `backend/src/index.ts`**

In `index.ts`, add the import after the last import line:

```typescript
import { studentAnalyticsRouter } from './api/studentAnalyticsRoutes';
```

Add the mount line before `app.use('/api', router)`:

```typescript
app.use('/api/students/:studentId', studentAnalyticsRouter); // analytics routes
```

- [ ] **Step 3: Restart the backend and verify the server starts**

```bash
cd backend && npx ts-node src/index.ts
```
Expected: `🚀 SAGE API running at http://localhost:4000`

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts src/index.ts
git commit -m "feat: scaffold studentAnalyticsRoutes and mount in index"
```

---

## Task 5: pos-progress Endpoint (Feature 1)

**Files:**
- Modify: `backend/src/api/studentAnalyticsRoutes.ts`

- [ ] **Step 1: Add the route handler at the bottom of the file**

```typescript
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
```

- [ ] **Step 2: Verify with curl (replace TOKEN and STUDENT_ID with real values from login)**

Get a student token:
```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lara.haddad@university.edu","password":"student123"}' | jq .
```
Copy the `token` and `studentId` from the response, then:
```bash
curl -s http://localhost:4000/api/students/STUDENT_ID/pos-progress \
  -H "Authorization: Bearer TOKEN" | jq .
```
Expected shape:
```json
{
  "completedCredits": 18,
  "totalCredits": 90,
  "pct": 20,
  "graduationEstimate": "S1 2028",
  "onTrack": true
}
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts
git commit -m "feat: add pos-progress endpoint"
```

---

## Task 6: academic-standing Endpoint (Feature 2)

**Files:**
- Modify: `backend/src/api/studentAnalyticsRoutes.ts`

- [ ] **Step 1: Add the route handler**

```typescript
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
```

- [ ] **Step 2: Verify with curl (lara has GPA 3.4 → Good Standing)**

```bash
curl -s http://localhost:4000/api/students/STUDENT_ID/academic-standing \
  -H "Authorization: Bearer TOKEN" | jq .
```
Expected for lara (GPA 3.4):
```json
{ "standing": "good", "label": "Good Standing", "colorKey": "green", "gpa": 3.4 }
```
Expected for nadia (GPA 1.9 → login as nadia.khalil@university.edu):
```json
{ "standing": "warning", "label": "Academic Warning", "colorKey": "amber", "gpa": 1.9 }
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts
git commit -m "feat: add academic-standing endpoint"
```

---

## Task 7: grade-trend Endpoint (Feature 3)

**Files:**
- Modify: `backend/src/api/studentAnalyticsRoutes.ts`

- [ ] **Step 1: Add the route handler**

```typescript
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
```

- [ ] **Step 2: Verify with curl**

```bash
curl -s http://localhost:4000/api/students/STUDENT_ID/grade-trend \
  -H "Authorization: Bearer TOKEN" | jq .
```
Expected for lara (enrolled S1 2022, S2 2022, S3 2023, S4 2023):
```json
{
  "semesters": [
    { "label": "S1 2022", "avgGrade": 85 },
    { "label": "S2 2022", "avgGrade": 85 },
    { "label": "S3 2023", "avgGrade": 80 },
    { "label": "S4 2023", "avgGrade": 85 }
  ],
  "hasEnoughData": true
}
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts
git commit -m "feat: add grade-trend endpoint"
```

---

## Task 8: recommended-courses Endpoint (Feature 4)

**Files:**
- Modify: `backend/src/api/studentAnalyticsRoutes.ts`

- [ ] **Step 1: Add the route handler**

```typescript
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
```

- [ ] **Step 2: Verify with curl**

```bash
curl -s http://localhost:4000/api/students/STUDENT_ID/recommended-courses \
  -H "Authorization: Bearer TOKEN" | jq .
```
Expected: array of up to 4 courses whose prerequisites lara has completed (CS401, CS402 are candidates since she completed CS202 and CS301).

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts
git commit -m "feat: add recommended-courses endpoint"
```

---

## Task 9: prerequisite-violations Endpoint (Feature 5)

**Files:**
- Modify: `backend/src/api/studentAnalyticsRoutes.ts`

- [ ] **Step 1: Add the route handler**

```typescript
studentAnalyticsRouter.get('/prerequisite-violations', requireSelf, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      select: {
        courseId: true,
        status: true,
        finalGrade: true,
        course: { select: { name: true, code: true, prerequisites: true } },
      },
    });

    const completedCodes = new Set(
      enrollments.filter(isCompleted).map(e => e.course.code)
    );

    const violations: { courseName: string; missingPrereq: string }[] = [];
    for (const e of enrollments.filter(isActive)) {
      for (const prereq of e.course.prerequisites) {
        if (!completedCodes.has(prereq)) {
          violations.push({ courseName: e.course.name, missingPrereq: prereq });
        }
      }
    }

    res.json({ violations });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check prerequisite violations' });
  }
});
```

- [ ] **Step 2: Verify with curl**

```bash
curl -s http://localhost:4000/api/students/STUDENT_ID/prerequisite-violations \
  -H "Authorization: Bearer TOKEN" | jq .
```
Expected for a clean student (all prereqs met): `{ "violations": [] }`

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts
git commit -m "feat: add prerequisite-violations endpoint"
```

---

## Task 10: advisor-messages Endpoint (Feature 6)

**Files:**
- Modify: `backend/src/api/studentAnalyticsRoutes.ts`

- [ ] **Step 1: Add the route handler**

```typescript
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
```

- [ ] **Step 2: Verify with curl (lara has 1 visible flag from seed)**

```bash
curl -s http://localhost:4000/api/students/LARA_STUDENT_ID/advisor-messages \
  -H "Authorization: Bearer LARA_TOKEN" | jq .
```
Expected:
```json
{
  "flags": [
    {
      "flagId": "...",
      "note": "Great improvement in CS301 this semester...",
      "createdAt": "..."
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts
git commit -m "feat: add advisor-messages endpoint"
```

---

## Task 11: Student Appointments Endpoints (Feature 7)

**Files:**
- Modify: `backend/src/api/studentAnalyticsRoutes.ts`

- [ ] **Step 1: Add GET and POST route handlers**

```typescript
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
```

- [ ] **Step 2: Verify GET**

```bash
curl -s http://localhost:4000/api/students/LARA_ID/appointments \
  -H "Authorization: Bearer LARA_TOKEN" | jq .
```
Expected: array with the confirmed appointment seeded for lara.

- [ ] **Step 3: Verify POST**

```bash
curl -s -X POST http://localhost:4000/api/students/LARA_ID/appointments \
  -H "Authorization: Bearer LARA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Major Change","requestedDate":"2026-06-01","notes":"Considering switching to Business"}' | jq .
```
Expected: created appointment object with `status: "pending"`.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/api/studentAnalyticsRoutes.ts
git commit -m "feat: add student appointment GET and POST endpoints"
```

---

## Task 12: Advisor Appointment Endpoints

**Files:**
- Modify: `backend/src/api/advisorSisRoutes.ts`

- [ ] **Step 1: Add GET endpoint at the bottom of `advisorSisRoutes.ts`**

```typescript
advisorSisRouter.get('/appointments', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

    const appointments = await prisma.appointmentRequest.findMany({
      where: { student: { majorId } },
      include: { student: { select: { name: true, studentNumber: true } } },
    });

    const sorted = [
      ...appointments.filter(a => a.status === 'pending'),
      ...appointments.filter(a => a.status !== 'pending'),
    ];

    if (req.query.status) {
      return res.json(sorted.filter(a => a.status === req.query.status));
    }
    res.json(sorted);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});
```

- [ ] **Step 2: Add PUT endpoint**

```typescript
advisorSisRouter.put('/appointments/:appointmentId', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

    const appt = await prisma.appointmentRequest.findUnique({
      where: { appointmentId: req.params.appointmentId },
      include: { student: { select: { majorId: true } } },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.student.majorId !== majorId) return res.status(403).json({ error: 'Access denied' });

    const { status, advisorResponse, cancellationReason } = req.body;
    const VALID = ['pending', 'confirmed', 'cancelled'];
    if (!status || !VALID.includes(status)) {
      return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled' });
    }

    const updated = await prisma.appointmentRequest.update({
      where: { appointmentId: req.params.appointmentId },
      data: {
        status,
        advisorResponse: advisorResponse ?? null,
        cancellationReason: cancellationReason ?? null,
        advisorId: req.user!.id,
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});
```

- [ ] **Step 3: Verify GET (using advisor1 credentials)**

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"advisor1@sage.edu","password":"advisor123"}' | jq .token
```
Then:
```bash
curl -s http://localhost:4000/api/advisor/appointments \
  -H "Authorization: Bearer ADVISOR_TOKEN" | jq '.[] | {student: .student.name, topic, status}'
```
Expected: omar's pending appointment appears first; lara's confirmed appears second.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/api/advisorSisRoutes.ts
git commit -m "feat: add advisor appointment GET and PUT endpoints"
```

---

## Task 13: Extend Advisor Student Profile with academicStanding

**Files:**
- Modify: `backend/src/api/advisorSisRoutes.ts`

- [ ] **Step 1: Add a helper function before the route handlers**

Add this helper after the `getAdvisorMajorId` function:

```typescript
function computeStanding(gpa: number | null): { standing: string; label: string; colorKey: string } {
  const g = gpa ?? 0;
  if (g >= 3.7) return { standing: 'deans_list', label: "Dean's List", colorKey: 'dark' };
  if (g >= 2.0) return { standing: 'good', label: 'Good Standing', colorKey: 'green' };
  if (g >= 1.5) return { standing: 'warning', label: 'Academic Warning', colorKey: 'amber' };
  return { standing: 'probation', label: 'Academic Probation', colorKey: 'red' };
}
```

- [ ] **Step 2: Extend the `GET /students/:studentId` response**

Find the existing `advisorSisRouter.get('/students/:studentId', ...)` handler. Change the final `res.json(student)` line to:

```typescript
    res.json({ ...student, academicStanding: computeStanding(student.cumulativeGpa) });
```

- [ ] **Step 3: Verify**

```bash
curl -s http://localhost:4000/api/advisor/students/STUDENT_ID \
  -H "Authorization: Bearer ADVISOR_TOKEN" | jq '.academicStanding'
```
Expected for lara:
```json
{ "standing": "good", "label": "Good Standing", "colorKey": "green" }
```

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/api/advisorSisRoutes.ts
git commit -m "feat: add academicStanding to advisor student profile response"
```

---

## Task 14: Frontend API Client Functions

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add 10 new functions to the end of `frontend/lib/api.ts`**

```typescript
// ─────────────────────────────────────────────
// STUDENT ANALYTICS
// ─────────────────────────────────────────────

export async function getStudentPosProgress(studentId: string) {
  return fetchJSON<{
    completedCredits: number;
    totalCredits: number;
    pct: number;
    graduationEstimate: string | null;
    onTrack: boolean;
  }>(`/students/${studentId}/pos-progress`);
}

export async function getStudentAcademicStanding(studentId: string) {
  return fetchJSON<{
    standing: string;
    label: string;
    colorKey: string;
    gpa: number;
  }>(`/students/${studentId}/academic-standing`);
}

export async function getStudentGradeTrend(studentId: string) {
  return fetchJSON<{
    semesters: { label: string; avgGrade: number }[];
    hasEnoughData: boolean;
  }>(`/students/${studentId}/grade-trend`);
}

export async function getStudentRecommendedCourses(studentId: string) {
  return fetchJSON<{
    courses: { code: string; name: string; credits: number; recommendedSemester: number }[];
  }>(`/students/${studentId}/recommended-courses`);
}

export async function getStudentPrerequisiteViolations(studentId: string) {
  return fetchJSON<{
    violations: { courseName: string; missingPrereq: string }[];
  }>(`/students/${studentId}/prerequisite-violations`);
}

export async function getStudentAdvisorMessages(studentId: string) {
  return fetchJSON<{
    flags: { flagId: string; note: string; createdAt: string }[];
  }>(`/students/${studentId}/advisor-messages`);
}

export async function getStudentAppointments(studentId: string) {
  return fetchJSON<any[]>(`/students/${studentId}/appointments`);
}

export async function createStudentAppointment(
  studentId: string,
  data: { topic: string; requestedDate: string; notes?: string }
) {
  return fetchJSON<any>(`/students/${studentId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────
// ADVISOR APPOINTMENTS
// ─────────────────────────────────────────────

export async function getAdvisorAppointments(filters?: { status?: string }) {
  const qs = filters?.status ? `?status=${filters.status}` : '';
  return fetchJSON<any[]>(`/advisor/appointments${qs}`);
}

export async function updateAdvisorAppointment(
  appointmentId: string,
  data: { status: string; advisorResponse?: string; cancellationReason?: string }
) {
  return fetchJSON<any>(`/advisor/appointments/${appointmentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add lib/api.ts
git commit -m "feat: add 10 student analytics and advisor appointment API client functions"
```

---

## Task 15: Dashboard — Promise.allSettled Scaffold + Sticky Right Column

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Add new imports and state variables at the top of the component**

After the existing imports (`getStudent`, `getAuthUser`), add:

```typescript
import {
  getStudentPosProgress,
  getStudentAcademicStanding,
  getStudentGradeTrend,
  getStudentRecommendedCourses,
  getStudentAdvisorMessages,
  getStudentAppointments,
} from '@/lib/api';
```

Inside `DashboardPage`, after the existing `const [student, setStudent] = useState<any>(null)`, add:

```typescript
  const [posProgress, setPosProgress] = useState<any>(null);
  const [standing, setStanding] = useState<any>(null);
  const [gradeTrend, setGradeTrend] = useState<any>(null);
  const [recommendedCourses, setRecommendedCourses] = useState<any>(null);
  const [advisorMessages, setAdvisorMessages] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
```

- [ ] **Step 2: Replace the existing `useEffect` with `Promise.allSettled`**

Replace the entire `useEffect` block with:

```typescript
  useEffect(() => {
    if (!user?.studentId) { setLoading(false); return; }
    const id = user.studentId;

    Promise.allSettled([
      getStudent(id),
      getStudentPosProgress(id),
      getStudentAcademicStanding(id),
      getStudentGradeTrend(id),
      getStudentRecommendedCourses(id),
      getStudentAdvisorMessages(id),
      getStudentAppointments(id),
    ]).then(([r0, r1, r2, r3, r4, r5, r6]) => {
      if (r0.status === 'fulfilled') setStudent(r0.value);
      if (r1.status === 'fulfilled') setPosProgress(r1.value);
      if (r2.status === 'fulfilled') setStanding(r2.value);
      if (r3.status === 'fulfilled') setGradeTrend(r3.value);
      if (r4.status === 'fulfilled') setRecommendedCourses(r4.value);
      if (r5.status === 'fulfilled') setAdvisorMessages(r5.value?.flags ?? []);
      if (r6.status === 'fulfilled') setAppointments(r6.value ?? []);
    }).finally(() => setLoading(false));
  }, [user]);
```

- [ ] **Step 3: Apply sticky right column style**

Find the existing right-column `<div>` (currently starts with `{/* Right column */}`). Change its outer wrapper style from:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
```

to:

```tsx
<div style={{
  display: 'flex', flexDirection: 'column', gap: '16px',
  position: 'sticky', top: '24px', alignSelf: 'start',
}}>
```

Add a `<style>` tag at the end of the component return (just before the last `</>`):

```tsx
<style>{`
  @media (max-width: 768px) {
    .sage-body .dashboard-right-col {
      position: static !important;
    }
    .sage-body > [style] {
      grid-template-columns: 1fr !important;
    }
  }
`}</style>
```

Also add `className="dashboard-right-col"` to the right column wrapper div.

- [ ] **Step 4: Verify the dashboard still loads**

Start frontend: `cd frontend && npm run dev`
Open `http://localhost:3000/dashboard` and log in as lara (lara.haddad@university.edu / student123).
Expected: dashboard loads, existing schedule and grade sections still show correctly.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add app/dashboard/page.tsx
git commit -m "feat: dashboard Promise.allSettled data fetching and sticky right column"
```

---

## Task 16: Academic Standing Label in Student Info Card

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Add the standing dot color helper above the component return**

Inside `DashboardPage`, before the `return (`, add:

```typescript
  const STANDING_DOT: Record<string, string> = {
    deans_list: 'var(--ob)',
    good:       'var(--green-dot)',
    warning:    'var(--yellow-dot)',
    probation:  'var(--red-dot)',
  };
```

- [ ] **Step 2: Insert the standing label into the Student Info card**

Find the Student Info card section. It contains a `div` with padding/gap that renders the field rows (Student ID, College, Major, etc.). Insert the standing label **immediately after the card header `</div>`** and before the field list wrapper:

```tsx
{/* Academic Standing label */}
{standing && (
  <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
    <span className="dot" style={{ background: STANDING_DOT[standing.standing] ?? 'var(--t4)' }} />
    <span style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--t3)',
    }}>
      {standing.label}
    </span>
  </div>
)}
```

- [ ] **Step 3: Verify in browser**

Reload dashboard. The Student Info card should show a dot + label ("Good Standing" for lara, "Academic Warning" for nadia) below the card header, before the field rows.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add app/dashboard/page.tsx
git commit -m "feat: academic standing label in student info card"
```

---

## Task 17: Degree Completion Ring

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Add the ring card to the right column**

In the right column, add a new `sage-card` **after** the existing Student Info card and **before** the Holds card. The right column currently ends before `{/* Right column */}` closes. Insert:

```tsx
{/* Degree Completion Ring */}
<div className="sage-card">
  <div className="sage-card-header">
    <div className="sage-card-title">Degree Progress</div>
  </div>
  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
    {posProgress ? (() => {
      const pct = posProgress.pct;
      const r = 48;
      const circ = 2 * Math.PI * r;
      const offset = circ * (1 - pct / 100);
      return (
        <>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={r}
              fill="none"
              stroke="var(--am)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
            />
            <text
              x="60" y="66"
              textAnchor="middle"
              fontSize="22"
              fontWeight="900"
              fill="var(--t1)"
              fontFamily="Inter, sans-serif"
            >
              {pct}%
            </text>
          </svg>
          <div style={{ fontSize: '12px', color: posProgress.onTrack ? 'var(--t3)' : 'var(--am-2)', textAlign: 'center' }}>
            {posProgress.onTrack
              ? `On track to graduate in ${posProgress.graduationEstimate ?? '—'}`
              : 'Graduation may be delayed — speak with your advisor'}
          </div>
        </>
      );
    })() : (
      <div className="empty-sub" style={{ padding: '20px 0' }}>Progress unavailable.</div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Verify in browser**

Reload dashboard. The right column should show a circular SVG ring with the completion percentage in the center, and the graduation estimate or delay message below.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add app/dashboard/page.tsx
git commit -m "feat: degree completion ring SVG on student dashboard"
```

---

## Task 18: Grade Trend Chart

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Add the trend chart card at the top of the left column**

The left column currently starts with the Schedule card. Insert the trend card **before** it:

```tsx
{/* Grade Trend by Semester */}
<div className="sage-card">
  <div className="sage-card-header">
    <div className="sage-card-title" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)' }}>
      Grade Trend by Semester
    </div>
  </div>
  <div style={{ padding: '16px 24px', height: '148px', display: 'flex', alignItems: 'center' }}>
    {!gradeTrend || !gradeTrend.hasEnoughData ? (
      <p className="empty-sub" style={{ margin: 0 }}>
        Not enough data yet — trend will appear after your second semester.
      </p>
    ) : (() => {
      const { semesters } = gradeTrend;
      const PAD_L = 24, PAD_R = 24, PAD_T = 8, PAD_B = 28;
      const W = 400, H = 120;
      const chartW = W - PAD_L - PAD_R;
      const chartH = H - PAD_T - PAD_B;
      const n = semesters.length;

      const xs = semesters.map((_: any, i: number) =>
        n === 1 ? PAD_L + chartW / 2 : PAD_L + (i / (n - 1)) * chartW
      );
      const ys = semesters.map((s: any) =>
        PAD_T + chartH - (Math.min(100, Math.max(0, s.avgGrade)) / 100) * chartH
      );

      const lastDiff = n >= 2
        ? semesters[n - 1].avgGrade - semesters[n - 2].avgGrade
        : 0;
      const lastColor = lastDiff < 0 ? 'var(--am)' : lastDiff > 0 ? 'var(--green)' : 'var(--t2)';

      const segments = semesters.slice(0, -1).map((_: any, i: number) => ({
        x1: xs[i], y1: ys[i], x2: xs[i + 1], y2: ys[i + 1],
        color: i === n - 2 ? lastColor : 'var(--t2)',
      }));

      const dotColors = semesters.map((_: any, i: number) => {
        if (i === n - 1) return lastColor;
        if (i === n - 2 && n >= 2) return lastColor;
        return 'var(--t2)';
      });

      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
          {/* Baseline */}
          <line
            x1={PAD_L} y1={PAD_T + chartH}
            x2={W - PAD_R} y2={PAD_T + chartH}
            stroke="var(--border)" strokeWidth="1"
          />
          {/* Segments */}
          {segments.map((seg: any, i: number) => (
            <line key={i}
              x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
              stroke={seg.color} strokeWidth="2" strokeLinecap="round"
            />
          ))}
          {/* Data points */}
          {semesters.map((_: any, i: number) => (
            <circle key={i} cx={xs[i]} cy={ys[i]} r="4" fill={dotColors[i]} />
          ))}
          {/* X labels */}
          {semesters.map((s: any, i: number) => (
            <text key={i}
              x={xs[i]} y={PAD_T + chartH + 16}
              textAnchor="middle" fontSize="9" fill="var(--t4)"
              fontFamily="Inter, sans-serif"
            >
              {s.label}
            </text>
          ))}
        </svg>
      );
    })()}
  </div>
</div>
```

- [ ] **Step 2: Verify in browser**

Reload dashboard. The left column should show the Grade Trend card at the top. For lara (4 semesters of data), a line chart should render. The final segment should be amber if the last semester average is lower than the prior one.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add app/dashboard/page.tsx
git commit -m "feat: grade trend SVG line chart on student dashboard"
```

---

## Task 19: Suggested for Next Semester Table

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Add the recommended courses card after the Schedule card**

Insert after the Schedule This Week card and before the Current Grades card:

```tsx
{/* Suggested for Next Semester */}
<div className="sage-card">
  <div className="sage-card-header">
    <div className="sage-card-title">Suggested for Next Semester</div>
  </div>
  {(!recommendedCourses || recommendedCourses.courses.length === 0) ? (
    <div className="empty-state">
      <div className="empty-rule" />
      <div>
        <p className="empty-msg">No eligible courses found — your advisor will assist with planning.</p>
      </div>
    </div>
  ) : (
    <table className="data-table">
      <thead>
        <tr>
          <th>Course</th>
          <th>Name</th>
          <th>Credits</th>
          <th>Rec. Semester</th>
        </tr>
      </thead>
      <tbody>
        {recommendedCourses.courses.map((c: any) => (
          <tr key={c.code}>
            <td style={{ fontWeight: 700, fontSize: '13px' }}>{c.code}</td>
            <td style={{ color: 'var(--t2)' }}>{c.name}</td>
            <td style={{ color: 'var(--t3)' }}>{c.credits}</td>
            <td style={{ color: 'var(--t3)' }}>Semester {c.recommendedSemester}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>
```

- [ ] **Step 2: Verify in browser**

Reload dashboard. The Suggested for Next Semester card should appear with up to 4 courses whose prerequisites lara has completed (e.g., CS401, CS402).

- [ ] **Step 3: Commit**

```bash
cd frontend
git add app/dashboard/page.tsx
git commit -m "feat: suggested for next semester table on student dashboard"
```

---

## Task 20: From Your Advisor Section

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Add the advisor messages card to the right column**

Insert it in the right column **after** the Degree Completion Ring card and **before** the Holds card:

```tsx
{/* From Your Advisor */}
<div className="sage-card">
  <div className="sage-card-header">
    <div className="sage-card-title">From Your Advisor</div>
  </div>
  {(!advisorMessages || advisorMessages.length === 0) ? (
    <p className="empty-sub" style={{ padding: '14px 20px', margin: 0 }}>
      No messages from your advisor.
    </p>
  ) : (
    <div>
      {advisorMessages.map((flag: any, idx: number) => (
        <div key={flag.flagId} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '10px 20px',
          borderBottom: idx < advisorMessages.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--t1)', flex: 1, marginRight: '12px' }}>
            {flag.note}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--t4)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {new Date(flag.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 2: Verify in browser**

Log in as lara. The right column should show the "From Your Advisor" card with the seeded message visible. Log in as a student with no visible flags — the card should show "No messages from your advisor."

- [ ] **Step 3: Commit**

```bash
cd frontend
git add app/dashboard/page.tsx
git commit -m "feat: from your advisor section on student dashboard"
```

---

## Task 21: Prerequisite Violation Warning on Schedule Page

**Files:**
- Modify: `frontend/app/schedules/mine/page.tsx`

- [ ] **Step 1: Read the current file to understand its structure**

```bash
cat "frontend/app/schedules/mine/page.tsx"
```

- [ ] **Step 2: Add import and state**

At the top of `schedules/mine/page.tsx`, add (after existing imports):

```typescript
import { getStudentPrerequisiteViolations } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';
```

Inside the component, add state:

```typescript
const user = useMemo(() => getAuthUser(), []);
const [violations, setViolations] = useState<{ courseName: string; missingPrereq: string }[]>([]);
```

- [ ] **Step 3: Add the useEffect to fetch violations**

```typescript
useEffect(() => {
  if (!user?.studentId) return;
  getStudentPrerequisiteViolations(user.studentId)
    .then(data => setViolations(data.violations))
    .catch(() => {});
}, [user]);
```

- [ ] **Step 4: Add the warning block above the course table**

Find the first return element that contains the course/schedule table. Insert before it:

```tsx
{violations.length > 0 && (
  <div style={{
    borderLeft: '2px solid var(--am)',
    paddingLeft: '16px',
    marginBottom: '16px',
  }}>
    {violations.map((v, i) => (
      <div key={i} style={{
        fontSize: '13px',
        color: 'var(--t2)',
        marginBottom: i < violations.length - 1 ? '6px' : 0,
      }}>
        You are enrolled in {v.courseName} without completing {v.missingPrereq}. Please contact your advisor.
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Verify in browser**

Log in and open the schedule page. For a clean student (no violations), nothing extra renders. To test the warning: temporarily enroll a student in a course whose prerequisite they haven't completed via the advisor registration panel, then check the schedule page.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add app/schedules/mine/page.tsx
git commit -m "feat: prerequisite violation warning on schedule page"
```

---

## Task 22: Student Appointments Page + Layout

**Files:**
- Create: `frontend/app/appointments/layout.tsx`
- Create: `frontend/app/appointments/page.tsx`

- [ ] **Step 1: Create the layout file**

Create `frontend/app/appointments/layout.tsx`:

```typescript
'use client';

import { ReactNode } from 'react';
import LayoutShell from '@/components/LayoutShell';

export default function AppointmentsLayout({ children }: { children: ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>;
}
```

- [ ] **Step 2: Create the appointments page**

Create `frontend/app/appointments/page.tsx`:

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAuthUser } from '@/lib/auth';
import { getStudentAppointments, createStudentAppointment } from '@/lib/api';

const TOPICS = ['Academic Planning', 'Course Selection', 'Grade Concern', 'Major Change', 'Other'] as const;
type Topic = typeof TOPICS[number];

const STATUS_STYLE: Record<string, { dotColor: string; textStyle?: React.CSSProperties }> = {
  confirmed: { dotColor: 'var(--t1)' },
  pending:   { dotColor: 'var(--t4)' },
  cancelled: { dotColor: 'var(--t4)', textStyle: { textDecoration: 'line-through', color: 'var(--t3)' } },
};

export default function AppointmentsPage() {
  const user = useMemo(() => getAuthUser(), []);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [topic, setTopic] = useState<Topic>('Academic Planning');
  const [requestedDate, setRequestedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.studentId) { setLoading(false); return; }
    getStudentAppointments(user.studentId)
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const hasPending = appointments.some(a => a.status === 'pending');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.studentId || !requestedDate) return;
    setSubmitting(true);
    setError('');
    try {
      const appt = await createStudentAppointment(user.studentId, {
        topic,
        requestedDate,
        notes: notes || undefined,
      });
      setAppointments(prev => [appt, ...prev]);
      setRequestedDate('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="sage-body"><div className="loading-state">Loading…</div></div>;

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Appointments</div>
        <div className="sage-page-sub">Request and track advisor meetings.</div>
      </div>

      <div className="sage-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* History table */}
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">Your Requests</div>
          </div>
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">No appointment requests yet.</p>
                <p className="empty-sub">Use the form below to submit your first request.</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Advisor Response</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a: any) => {
                  const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.pending;
                  const responseText = a.advisorResponse || a.cancellationReason;
                  return (
                    <tr key={a.appointmentId}>
                      <td style={{ fontWeight: 600 }}>{a.topic}</td>
                      <td style={{ color: 'var(--t3)' }}>
                        {new Date(a.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className="dot-status" style={s.textStyle}>
                          <span className="dot" style={{ background: s.dotColor }} />
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {responseText ? (
                          <span style={{ fontSize: '12px', color: 'var(--t4)' }}>{responseText}</span>
                        ) : (
                          <span style={{ color: 'var(--t4)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />

        {/* Request form */}
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">New Request</div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {hasPending && (
              <p className="empty-sub" style={{ margin: 0 }}>
                You have a pending request. Wait for your advisor to respond before submitting another.
              </p>
            )}
            {error && (
              <p style={{ fontSize: '13px', color: 'var(--red)', margin: 0 }}>{error}</p>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="input-label">Topic</label>
              <select
                className="sage-select"
                value={topic}
                onChange={e => setTopic(e.target.value as Topic)}
                disabled={hasPending}
              >
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="input-label">Requested Date</label>
              <input
                type="date"
                className="sage-input"
                value={requestedDate}
                onChange={e => setRequestedDate(e.target.value)}
                required
                disabled={hasPending}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="input-label">Notes (optional)</label>
              <textarea
                className="sage-input"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={hasPending}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <button
                type="submit"
                className="btn btn-amber"
                disabled={hasPending || submitting || !requestedDate}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/appointments`. The page should load showing lara's confirmed appointment in the table, and an active form below. Omar's page should show the pending appointment and a disabled form with the pending-request message.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add app/appointments/layout.tsx app/appointments/page.tsx
git commit -m "feat: student appointments page"
```

---

## Task 23: Advisor Appointments Page

**Files:**
- Create: `frontend/app/advisor/appointments/page.tsx`

- [ ] **Step 1: Create the file**

Create `frontend/app/advisor/appointments/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getAdvisorAppointments, updateAdvisorAppointment } from '@/lib/api';

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled'] as const;

export default function AdvisorAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('confirmed');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdvisorAppointments()
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleRespond(appointmentId: string) {
    if (expandedId === appointmentId) {
      setExpandedId(null);
    } else {
      setExpandedId(appointmentId);
      setResponseText('');
      setSelectedStatus('confirmed');
    }
  }

  async function handleSave(appointmentId: string, currentStatus: string) {
    setSaving(true);
    try {
      const payload: any = { status: selectedStatus };
      if (selectedStatus === 'confirmed') payload.advisorResponse = responseText;
      if (selectedStatus === 'cancelled') payload.cancellationReason = responseText;

      const updated = await updateAdvisorAppointment(appointmentId, payload);
      setAppointments(prev => {
        const list = prev.map(a => a.appointmentId === appointmentId ? { ...a, ...updated } : a);
        return [
          ...list.filter(a => a.status === 'pending'),
          ...list.filter(a => a.status !== 'pending'),
        ];
      });
      setExpandedId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="sage-body"><div className="loading-state">Loading…</div></div>;

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Appointments</div>
        <div className="sage-page-sub">Review and respond to student appointment requests.</div>
      </div>

      <div className="sage-body">
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">All Requests</div>
          </div>
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">No appointment requests.</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Topic</th>
                  <th>Requested Date</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a: any) => (
                  <>
                    <tr key={a.appointmentId}>
                      <td style={{ fontWeight: 600 }}>{a.student?.name ?? '—'}</td>
                      <td>{a.topic}</td>
                      <td style={{ color: 'var(--t3)' }}>
                        {new Date(a.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ color: 'var(--t3)', maxWidth: '180px' }}>
                        {a.notes ? (
                          <span style={{ fontSize: '12px' }}>{a.notes}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--t2)' }}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                        {(a.status === 'confirmed' || a.status === 'cancelled') && (a.advisorResponse || a.cancellationReason) && (
                          <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '2px' }}>
                            {a.advisorResponse || a.cancellationReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {a.status === 'pending' && (
                          <button
                            onClick={() => handleRespond(a.appointmentId)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--am-2)', fontSize: '12px', fontWeight: 600,
                              padding: '2px 0', fontFamily: 'inherit',
                            }}
                          >
                            {expandedId === a.appointmentId ? 'Cancel' : 'Respond'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === a.appointmentId && (
                      <tr key={`${a.appointmentId}-expand`}>
                        <td colSpan={6} style={{ background: '#f7f7f8', padding: '12px 22px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                              <label className="input-label">Status</label>
                              <select
                                className="sage-select"
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                style={{ width: '140px' }}
                              >
                                {STATUS_OPTIONS.map(s => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <label className="input-label">
                                {selectedStatus === 'cancelled' ? 'Cancellation Reason' : 'Response Note'}
                              </label>
                              <input
                                type="text"
                                className="sage-input"
                                value={responseText}
                                onChange={e => setResponseText(e.target.value)}
                                placeholder={selectedStatus === 'cancelled' ? 'Reason for cancellation…' : 'Your response…'}
                              />
                            </div>
                            <button
                              className="btn btn-ghost-light"
                              onClick={() => handleSave(a.appointmentId, a.status)}
                              disabled={saving}
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify in browser**

Log in as advisor1 and navigate to `http://localhost:3000/advisor/appointments`. Omar's pending request should appear first with a "Respond" link. Lara's confirmed request shows the advisor response as read-only text. Click "Respond" on Omar's row — the inline form expands. Set status to "Confirmed", add a response note, click Save — the row updates in place and the form collapses.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add app/advisor/appointments/page.tsx
git commit -m "feat: advisor appointments page"
```

---

## Task 24: Student Sidebar — Add Appointments Link

**Files:**
- Modify: `frontend/components/LayoutShell.tsx`

- [ ] **Step 1: Add the Appointments entry to the `links` array**

Find the `links` array in `LayoutShell.tsx`:

```typescript
const links = [
  { label: 'Dashboard',    to: '/dashboard',              icon: <HomeIcon /> },
  { label: 'Academic Life', to: '/academic/holds',         icon: <BookIcon /> },
  { label: 'Registration',  to: '/registration/register',  icon: <ClipboardIcon /> },
  { label: 'Schedules',     to: '/schedules/mine',         icon: <CalendarIcon /> },
  { label: 'Grades',        to: '/grades',                 icon: <GradesIcon /> },
  { label: 'Accounting',    to: '/accounting/statement',   icon: <DollarIcon /> },
  { label: 'Surveys',       to: '/surveys/evaluation',     icon: <SurveyIcon /> },
  { label: 'Profile',       to: '/profile',                icon: <UserIcon /> },
];
```

Change to:

```typescript
const links = [
  { label: 'Dashboard',    to: '/dashboard',              icon: <HomeIcon /> },
  { label: 'Academic Life', to: '/academic/holds',         icon: <BookIcon /> },
  { label: 'Registration',  to: '/registration/register',  icon: <ClipboardIcon /> },
  { label: 'Schedules',     to: '/schedules/mine',         icon: <CalendarIcon /> },
  { label: 'Grades',        to: '/grades',                 icon: <GradesIcon /> },
  { label: 'Appointments',  to: '/appointments',           icon: <CalendarIcon /> },
  { label: 'Accounting',    to: '/accounting/statement',   icon: <DollarIcon /> },
  { label: 'Surveys',       to: '/surveys/evaluation',     icon: <SurveyIcon /> },
  { label: 'Profile',       to: '/profile',                icon: <UserIcon /> },
];
```

- [ ] **Step 2: Verify in browser**

The student sidebar should now show an "Appointments" link. Clicking it should navigate to `/appointments` and the link should become active (amber left border).

- [ ] **Step 3: Commit**

```bash
cd frontend
git add components/LayoutShell.tsx
git commit -m "feat: add Appointments link to student sidebar"
```

---

## Task 25: Advisor Sidebar — count Prop + Appointments Link

**Files:**
- Modify: `frontend/components/Sidebar.tsx`
- Modify: `frontend/components/AdvisorLayout.tsx`

- [ ] **Step 1: Add `count` field to `NavItem` in `Sidebar.tsx`**

Find the `NavItem` interface:

```typescript
export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}
```

Change to:

```typescript
export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  count?: number;
}
```

In the `renderItem` function, find where the `badge` is rendered:

```tsx
{item.badge != null && item.badge > 0 && (
  <span className="sage-nav-badge">{item.badge}</span>
)}
```

Add the `count` render immediately after it:

```tsx
{item.count != null && item.count > 0 && (
  <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: '6px', fontSize: '12px' }}>
    {item.count}
  </span>
)}
```

- [ ] **Step 2: Add Appointments to `mainItems` and fetch the pending count in `AdvisorLayout.tsx`**

Find the `mainItems` array. Add the Appointments entry after the Comments entry:

```typescript
{ href: '/advisor/appointments', label: 'Appointments', icon: <CalendarIcon /> },
```

Add state for pending count. After the existing imports and before `export default function AdvisorLayout`, the component currently uses `useMemo` for `user`. Change the component body to add:

```typescript
export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useMemo(() => getAuthUser(), []);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getAdvisorAppointments({ status: 'pending' })
      .then(list => setPendingCount(list.length))
      .catch(() => {});
  }, [user]);
```

Add the import at the top of `AdvisorLayout.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { getAdvisorAppointments } from '@/lib/api';
```

Update the `mainItems` definition to be inside the component function so it can reference `pendingCount`:

```typescript
  const mainItems = [
    { href: '/advisor/dashboard',           label: 'Dashboard',                icon: <HomeIcon /> },
    { href: '/advisor/students',            label: 'My Students',              icon: <UsersIcon /> },
    { href: '/advisor/sections',            label: 'Sections',                 icon: <LayersIcon /> },
    { href: '/advisor/enrollments',         label: 'Enrollments',              icon: <CalendarIcon /> },
    { href: '/advisor/comments',            label: 'Comments',                 icon: <MessageIcon /> },
    { href: '/advisor/appointments',        label: 'Appointments',             icon: <CalendarIcon />, count: pendingCount },
    { href: '/advisor/student-information', label: 'Student Information',      icon: <UserIcon /> },
    { href: '/advisor/new-student',         label: 'New Student Registration', icon: <UserPlusIcon /> },
    { href: '/advisor/broadcast',           label: 'Broadcast Comments',       icon: <SendIcon /> },
    { href: '/advisor/course-offering',     label: 'Course Offering',          icon: <BookOpenIcon /> },
  ];
```

Remove the old `const mainItems = [...]` from module scope.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Verify in browser**

Log in as advisor1. The advisor sidebar should show "Appointments" link. When there are pending requests (omar's), the number `1` should appear next to the label in muted gray — no badge background. After responding to all pending requests, the number disappears.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add components/Sidebar.tsx components/AdvisorLayout.tsx
git commit -m "feat: add Appointments to advisor sidebar with live pending count"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Covered by Task |
|-----------------|-----------------|
| F1: Degree Completion Ring — SVG, percentage, graduation estimate, on-track text | Tasks 5, 17 |
| F2: Academic Standing label — GPA thresholds, dot colors, in API response for advisor | Tasks 6, 13, 16 |
| F3: Grade Trend — SVG line chart, final-segment coloring, fallback placeholder | Tasks 7, 18 |
| F4: Recommended Courses — backend logic, top 4, table | Tasks 8, 19 |
| F5: Prerequisite Violations — detection logic, amber left-border warning | Tasks 9, 21 |
| F6: Advisor Messages — StudentFlag model, isVisibleToStudent, seed, UI | Tasks 1–3, 10, 20 |
| F7: Appointment Request — full table, form, topic select, notes, pending lock | Tasks 1–3, 11–12, 22–23 |
| Promise.allSettled, no Promise.all on dashboard | Task 15 |
| Sticky right column, mobile static | Task 15 |
| No new frontend libraries — all SVG inline | Tasks 17, 18 |
| requireSelf on all analytics endpoints | Task 4 |
| Seed 2 visible flags | Task 3 |
| Advisor sidebar pending count (plain text, no badge) | Task 25 |
| Appointments nav link in both sidebars | Tasks 24, 25 |
| AppointmentRequest.notes field | Tasks 1, 11, 22 |
| Topic as select with fixed 5 options | Tasks 11, 22 |
| Advisor appointments page — expand only pending, read-only confirmed/cancelled | Task 23 |

All 7 features fully covered. ✓

### Type Consistency

- `isCompleted` / `isActive` helpers defined once in Task 4 and used in Tasks 5–9.
- `VALID_TOPICS` constant defined in Task 11 (backend) and `TOPICS` in Task 22 (frontend) — both contain the same 5 strings.
- API functions defined in Task 14 match endpoint paths defined in Tasks 4–12.
- `standing.standing` colorKey values (`deans_list`, `good`, `warning`, `probation`) used in Task 16 match what the backend returns in Task 6.
- `NavItem.count` added in Task 25 Step 1 before used in Task 25 Step 2.
