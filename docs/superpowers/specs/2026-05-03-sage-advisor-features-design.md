# SAGE Advisor Features Design Spec

## Goal

Add five advisor-facing features to the existing SAGE platform: Graduation Pathway Simulator, Semester Triage Dashboard, Hold & Flag System, Prerequisite Violation Detection, and Intervention Effectiveness Scoring. No changes to the student portal, admin view, or AI drift detection logic.

## Architecture

All new advisor analytics endpoints live in a new `advisorAnalyticsRoutes.ts` (existing `advisorSisRoutes.ts` is 579 lines — over the 200-line threshold). Two new server-side service files extract shared logic. The student profile page gains a left-column tab strip and two new right-column panels. The My Students page gains a triage mode. The advisor dashboard gains an Intervention Insights table.

**Tech Stack:** Express.js + TypeScript + Prisma (PostgreSQL) · Next.js 14 + React 18 · Anthropic Claude API · Zod validation

---

## Database Schema

Single migration named `advisor-features`. Five new models. No existing tables modified.

### New Enums

```prisma
enum RequirementType {
  core
  elective
}
```

### New Models

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

`StudentFlag.flagType` remains `String` — the five valid values (Academic Hold, At Risk, Follow Up Required, Prerequisite Violation, Positive Progress) are validated at the API layer only.

### Back-relations to add to existing models

```prisma
// Major model — add:
degreeRequirements DegreeRequirement[]

// Course model — add:
degreeRequirements DegreeRequirement[]

// Student model — add:
plans         StudentPlan[]
interventions Intervention[]

// Advisor model — add:
studentPlans  StudentPlan[]
triageRuns    TriageRun[]
interventions Intervention[]
```

---

## Backend Architecture

### File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modify | Add 5 new models + RequirementType enum |
| `backend/prisma/seed.ts` | Modify | Wipe + seed all new tables |
| `backend/src/api/advisorAnalyticsRoutes.ts` | **Create** | All new advisor endpoints |
| `backend/src/api/advisorSisRoutes.ts` | Modify | Add `prerequisiteViolations` to GET /students/:studentId |
| `backend/src/api/routes.ts` | Modify | Call `updateInterventionOutcomes` after drift analysis stores |
| `backend/src/index.ts` | Modify | Mount `advisorAnalyticsRouter` |
| `backend/src/services/prerequisiteService.ts` | **Create** | `detectPrerequisiteViolations(studentId)` |
| `backend/src/services/interventionService.ts` | **Create** | `updateInterventionOutcomes(studentId, driftScore, reportDate)` |

### advisorAnalyticsRoutes.ts Endpoints

All routes require `requireRole('advisor')`. Router mounted at `/api/advisor`.

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| POST | `/students/:id/graduation-pathway` | 1 | Generate + store pathway via Claude |
| POST | `/students/:id/graduation-pathway/alternative` | 1 | Alternative major pathway |
| POST | `/students/:id/flags` | 3 | Create flag (advisorId from JWT) |
| GET | `/students/:id/flags` | 3 | List flags; `?active=true` filters `resolvedAt: null` |
| PATCH | `/flags/:id` | 3 | Update resolvedAt / note / isVisibleToStudent |
| DELETE | `/flags/:id` | 3 | Hard delete — only creator may delete |
| POST | `/triage` | 2 | Run semester triage via Claude |
| GET | `/triage/latest` | 2 | Most recent TriageRun or null |
| POST | `/students/:id/interventions` | 5 | Log intervention + create outcome row |
| GET | `/students/:id/interventions` | 5 | List interventions with outcomes |
| GET | `/intervention-effectiveness` | 5 | Aggregated effectiveness by type |

### Zod Schemas

**Graduation Pathway response:**
```typescript
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
```

**Alternative pathway adds:**
```typescript
const AlternativePathwaySchema = PathwaySchema.extend({
  transferableCredits: z.number().int(),
  newCoursesRequired: z.array(z.string()),
});
```

**Triage response:**
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

### prerequisiteService.ts

```typescript
export async function detectPrerequisiteViolations(studentId: string): Promise<
  { courseName: string; missingPrerequisiteCode: string }[]
>
```

Queries all active enrollments for the student, checks each course's `prerequisites` array against the student's completed course codes. Returns empty array if none. Extracted from `studentAnalyticsRoutes.ts` — both student and advisor routes call this shared function.

### interventionService.ts

```typescript
export async function updateInterventionOutcomes(
  studentId: string,
  newDriftScore: number,
  reportGeneratedAt: Date
): Promise<void>
```

Finds all `InterventionOutcome` rows for the student where `driftScoreAfter` is null and the linked `Intervention.interventionDate` is before `reportGeneratedAt`. For each: sets `driftScoreAfter = newDriftScore`, `effectivenessScore = driftScoreBefore - newDriftScore`, `measuredAt = reportGeneratedAt`. Positive `effectivenessScore` means improvement (drift went down).

Called at the end of the existing `POST /api/students/:studentId/analyze` handler in `routes.ts` after the new AIReport is saved.

### Semester Auto-Detection (Triage)

```typescript
const now = new Date();
const semester = now.getMonth() < 6 ? 1 : 2;
const year = now.getFullYear();
```

---

## Frontend Architecture

### File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `frontend/app/advisor/students/[studentId]/page.tsx` | Modify | Tab strip, prereq warning, Flags panel, Interventions panel, Pathway tab |
| `frontend/app/advisor/students/page.tsx` | Modify | Triage button, triage table view, on-mount latest fetch |
| `frontend/app/advisor/dashboard/page.tsx` | Modify | Intervention Insights table below student table |
| `frontend/lib/api.ts` | Modify | Add API client functions for all new endpoints |

### Student Profile Page — Layout

```
Page Header: [Student Name] [Major · Semester · GPA · Email]

sage-body (two columns: 1fr | 360px)
├── LEFT COLUMN
│   ├── Prereq violation warning (amber left border, always visible if violations exist)
│   ├── Tab strip: [ Course History ] [ Pathway ]
│   └── Active tab content:
│       ├── Course History: CourseHistoryTable (unchanged)
│       └── Pathway:
│           ├── Inner toggle: [ Current Major ] [ Alternative Major ]
│           ├── Current Major sub-view:
│           │   ├── Summary strip (Credits Completed | Credits Remaining | Projected Graduation)
│           │   ├── Semester plan data-table (Semester | Year | Planned Courses)
│           │   ├── Recovery Plan table (if present)
│           │   └── "Generate Pathway" button (top-right; becomes "Generating pathway..." inline text)
│           └── Alternative Major sub-view:
│               ├── Major selector dropdown + "Generate" text button
│               ├── Comparison strip (Current Major grad date + credits | Alternative grad date + new courses)
│               └── Alternative semester plan data-table
└── RIGHT COLUMN (360px, stacked panels)
    ├── AIReportPanel (unchanged)
    ├── FlagsPanel (new)
    ├── InterventionsPanel (new)
    ├── AcademicDNAPanel (unchanged)
    └── ChatPanel (unchanged)
```

**Tab strip style:** Active tab has `borderBottom: '2px solid var(--am)'`, color `var(--t1)`. Inactive tab has `borderBottom: '2px solid transparent'`, color `var(--t4)`. No backgrounds, no pill shapes.

**Inner Pathway toggle:** Same pattern — plain text labels, underline indicator on active sub-view.

### FlagsPanel

Fetches `GET /advisor/students/:id/flags` on mount. Renders:
- Header: "Flags" title + plain text "Add Flag" button (right-aligned)
- Active flags list:
  - Flag type (fontWeight 500)
  - Note (regular weight below)
  - createdAt date (var(--t4), right side)
  - Plain "Resolve" button → PATCH with current timestamp
  - Plain "Delete" button → DELETE
  - "(visible to student)" in var(--t4) if isVisibleToStudent
- Resolved flags hidden behind "Show resolved (N)" toggle; render with line-through on type, "Resolved [date]" replacing action buttons
- Add Flag modal: flagType dropdown (5 options), notes textarea, isVisibleToStudent checkbox, Save button
- Empty state uses existing pattern

### InterventionsPanel

Fetches `GET /advisor/students/:id/interventions` on mount. Renders:
- Header: "Interventions" title + plain text "Log Intervention" button (right-aligned)
- Intervention list (ordered by interventionDate descending):
  - interventionType (fontWeight 500)
  - notes (regular weight below)
  - interventionDate (right side)
  - If outcome exists: effectiveness line below notes:
    - `effectivenessScore > 0` → "+{score} improvement" in var(--green)
    - `effectivenessScore < 0` → "{score} worsened" in var(--red)  
    - `effectivenessScore === 0` → "No change"
    - `driftScoreAfter === null` → "Awaiting next analysis" in var(--t4)
- Log Intervention modal: interventionType free-text, notes textarea, date picker (default today), Save button
- Empty state uses existing pattern

### My Students Page — Triage Mode

On mount: calls `GET /advisor/triage/latest`. If result exists, enters triage view automatically.

**Standard view header:** existing search input + "Run Semester Triage" button (right-aligned, `btn btn-ghost btn-sm` style).

**While running:** Single full-width muted line above student table: "Analyzing all assigned students..." No spinner, no overlay.

**Triage view:**
- Above table: "Last triage run: [date] — [N] students analyzed" + plain "Back to standard view" link (left) + plain "Re-run" link (right)
- Table replaces standard student table. Columns: Student (name + top reason + recommended action), Urgency Score, Status (urgencyLevel), and existing columns stripped down
- Row left border: `immediate` → `2px solid var(--red-dot)`, `high` → `2px solid var(--am)`, `monitor` → `2px solid var(--t3)`, `healthy` → none
- Student cell: name in fontWeight 600, topThreeReasons[0] in regular weight below, recommendedAction in var(--t4) below that
- urgencyScore as plain integer in its column
- Sorted by urgencyScore descending

### Advisor Dashboard — Intervention Insights

Below the existing student table, add an "Intervention Insights" section:
- Plain muted line: "Effectiveness is measured as drift score change between intervention and next AI analysis."
- `data-table` with columns: Intervention Type | Times Used | Avg Effectiveness | Success Rate
- Populated from `GET /advisor/intervention-effectiveness`
- Sorted by success rate descending
- Empty state uses existing pattern

### New API Client Functions (frontend/lib/api.ts)

```typescript
getStudentGraduationPathway(studentId)
generateAlternativePathway(studentId, targetMajorId)
getStudentFlags(studentId, activeOnly?)
createStudentFlag(studentId, data)
updateFlag(flagId, data)
deleteFlag(flagId)
runAdvisorTriage()
getLatestTriage()
getStudentInterventions(studentId)
createStudentIntervention(studentId, data)
getInterventionEffectiveness()
getAdvisorMajors()  // GET /api/majors — already exists in routes.ts, just needs a client wrapper
```

---

## Seed Data

Added to `backend/prisma/seed.ts`. Wipe order before student wipe:
`interventionOutcome → intervention → triageRun → studentPlan → degreeRequirement`

**DegreeRequirement:** 3 rows for CS major, 3 rows for Business major — using existing courses from those majors, split between `core` and `elective` with realistic `recommendedSemester` values (1–6).

**StudentPlan:** 1 seeded record for Lara — 3-semester pathway to graduation, `isAiGenerated: true`. Pathway tab shows data without running Claude.

**Intervention + InterventionOutcome:**
- Lara: "Academic Counseling" intervention (3 months ago), outcome with both scores populated (positive effectivenessScore) — effectiveness line visible immediately
- Nadia: "Course Load Reduction" intervention (2 months ago), outcome with `driftScoreAfter: null` — "Awaiting next analysis" line
- Nadia: "Tutoring Referral" intervention (1 month ago), no outcome yet — no outcome line

**StudentFlag** (reuses existing table):
- Lara: `flagType: 'Positive Progress'`, `isVisibleToStudent: true`, unresolved
- Nadia: `flagType: 'At Risk'`, `isVisibleToStudent: false`, unresolved

**TriageRun:** 1 seeded record for advisor1 — realistic JSON result covering all CS students with varied urgency levels, `runAt` set to 7 days ago. My Students page restores this triage view on mount.

---

## Execution Order

1. Schema migration
2. Feature 3 — Flags (simplest backend, no AI)
3. Feature 4 — Prerequisite detection (reuses service)
4. Feature 1 — Pathway Simulator (most complex AI)
5. Feature 2 — Triage Dashboard (second AI feature)
6. Feature 5 — Interventions (most complex data relationships)
7. Seed data
