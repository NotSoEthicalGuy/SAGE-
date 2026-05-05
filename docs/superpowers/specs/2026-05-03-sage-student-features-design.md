# SAGE — Student Features Design
**Date:** 2026-05-03
**Scope:** Student portal only. No changes to advisor view, admin view, or AI orchestrator except where explicitly noted (advisor appointments page and advisor sidebar count).

---

## Architectural Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| New backend routes | New `studentAnalyticsRoutes.ts` | `studentSisRoutes.ts` is already 229 lines; analytics routes have a distinct character |
| Database migrations | One migration covering both new tables | Features ship together; single rollback unit |
| Dashboard data fetching | `Promise.allSettled` in `dashboard/page.tsx` | Matches existing inline style; failures are isolated per section |

---

## Section 1: Database Schema

### New model: `StudentFlag`

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
```

### New enum: `AppointmentStatus`

```prisma
enum AppointmentStatus {
  pending
  confirmed
  cancelled
}
```

### New model: `AppointmentRequest`

```prisma
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

### Relations to add to existing models

- `Student`: add `flags StudentFlag[]` and `appointments AppointmentRequest[]`
- `Advisor`: add `flags StudentFlag[]` and `appointments AppointmentRequest[]`

### Seed additions

Two `StudentFlag` records on existing seeded students with `isVisibleToStudent = true` and `resolvedAt = null` so Feature 6 is immediately demonstrable.

### No changes to any existing model or table.

---

## Section 2: Backend

### New file: `backend/src/api/studentAnalyticsRoutes.ts`

Mounted in `index.ts` at `/api/students/:studentId` — the same path prefix used by the existing `routes.ts` entries. Express merges multiple routers on the same mount path correctly; no conflict as long as both are registered.

| Method | Path | Feature | Returns |
|--------|------|---------|---------|
| `GET` | `/api/students/:studentId/pos-progress` | F1 | `{ completedCredits, totalCredits, pct, graduationEstimate, onTrack }` |
| `GET` | `/api/students/:studentId/academic-standing` | F2 | `{ standing, label, colorKey }` |
| `GET` | `/api/students/:studentId/grade-trend` | F3 | `{ semesters: [{ label, avgGrade }], hasEnoughData }` |
| `GET` | `/api/students/:studentId/recommended-courses` | F4 | `{ courses: [{ code, name, credits, recommendedSemester }] }` |
| `GET` | `/api/students/:studentId/prerequisite-violations` | F5 | `{ violations: [{ courseName, missingPrereq }] }` |
| `GET` | `/api/students/:studentId/advisor-messages` | F6 | `{ flags: [{ flagId, note, createdAt }] }` |
| `GET` | `/api/students/:studentId/appointments` | F7 | Array of `AppointmentRequest` |
| `POST` | `/api/students/:studentId/appointments` | F7 | Created `AppointmentRequest` |

#### Logic details

**pos-progress:**
- Fetch `ProgramOfStudyItem[]` for student's major (include `course.credits`)
- Fetch student's enrollments
- Map enrollments to completed/in-progress by courseId
- `completedCredits` = sum of credits for completed POS items
- `totalCredits` = `major.minimumCredits`
- `pct` = `completedCredits / totalCredits * 100`
- `avgCreditsPerSemester` = `completedCredits / distinctSemesterCount` (only semesters with at least one completed course)
- `remainingCredits` = `totalCredits - completedCredits`
- `semestersLeft` = `Math.ceil(remainingCredits / avgCreditsPerSemester)` (or null if no history)
- `onTrack`: `completedCredits >= Math.floor((totalCredits / 8) * currentSemester * 0.9)` — uses program-level expectation (8 standard semesters) rather than the student's own history to avoid a circular check where a consistently slow student always passes
- `graduationEstimate`: add `semestersLeft * 6` months to current date; map to "S1 YYYY" if landing in months 1–6, "S2 YYYY" if months 7–12

**academic-standing:**
- Read `cumulativeGpa` from student record
- `>= 3.7` → `{ standing: "deans_list", label: "Dean's List", colorKey: "dark" }`
- `>= 2.0` → `{ standing: "good", label: "Good Standing", colorKey: "green" }`
- `>= 1.5` → `{ standing: "warning", label: "Academic Warning", colorKey: "amber" }`
- `< 1.5` → `{ standing: "probation", label: "Academic Probation", colorKey: "red" }`

**grade-trend:**
- Fetch enrollments where `finalGrade != null`, ordered by `year asc, semester asc`
- Group by `(year, semester)` → compute average `finalGrade` per group
- Label format: `S{semester} {year}` (e.g. "S1 2023")
- `hasEnoughData` = distinct semester groups >= 2

**recommended-courses:**
- Fetch all POS items for student's major (include `course` with `prerequisites`, `credits`, `semesterOffered`)
- Fetch student's enrollments → build set of completed course codes and in-progress course codes
- Filter POS items: not completed, not in-progress
- Filter further: every code in `course.prerequisites[]` is in the completed set
- Sort by `posItem.semester` ascending
- Return top 4, mapping to `{ code, name, credits, recommendedSemester: posItem.semester }`

**prerequisite-violations:**
- Fetch in-progress enrollments (include `course` with `prerequisites`)
- Fetch completed enrollments → build set of completed course codes
- For each in-progress course: find any prerequisite code NOT in completed set
- Return `{ courseName: course.name, missingPrereq: prereqCode }` per violation

**advisor-messages:**
- `prisma.studentFlag.findMany({ where: { studentId, isVisibleToStudent: true, resolvedAt: null }, orderBy: { createdAt: 'desc' } })`
- Return only `flagId`, `note`, `createdAt` (not `flagType`, not `advisorId`)

**appointments GET:**
- `prisma.appointmentRequest.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } })`

**appointments POST:**
- Validate: `topic`, `requestedDate` required; `notes` optional
- `topic` must be one of: `Academic Planning`, `Course Selection`, `Grade Concern`, `Major Change`, `Other`
- Create record with `status: 'pending'`

### Advisor-side appointments (added to `advisorSisRoutes.ts`)

- `GET /api/advisor/appointments` — fetch all `AppointmentRequest` for students in advisor's major, joined with student name; optional `?status=pending` filter for sidebar count
- `PUT /api/advisor/appointments/:id` — validate advisor owns the student's major; accept `{ status, advisorResponse?, cancellationReason? }`; set `advisorId` to advisor's JWT id on first update

### Academic standing in advisor student profile

The existing `GET /advisor/students/:studentId` response is extended to include `academicStanding` computed the same way as the student-facing endpoint. No new endpoint — the field is added to the existing query response.

---

## Section 3: Frontend — Dashboard

**File:** `frontend/app/dashboard/page.tsx`

### Data fetching

`Promise.allSettled` over 5 new calls alongside existing `getStudent`:
1. `GET /api/students/:id/pos-progress`
2. `GET /api/students/:id/grade-trend`
3. `GET /api/students/:id/recommended-courses`
4. `GET /api/students/:id/advisor-messages`
5. `GET /api/students/:id/appointments` (for pending count only, to inform Feature 7 state)

Each `allSettled` result is checked: `status === 'fulfilled'` → set state to `result.value`; `status === 'rejected'` → set state to `null`. No rejection cascades.

### Left column (top to bottom)

1. **Grade Trend by Semester** (new `sage-card`)
2. **Schedule This Week** (existing)
3. **Suggested for Next Semester** (new `sage-card`)
4. **Current Grades** (existing)

### Right column (top to bottom)

Wrapper: `position: sticky; top: 24px; align-self: start`
On mobile (`max-width: 768px`): `position: static`, columns stack to single column.

1. **Student Info card** (existing) — Academic Standing label inserted below major field
2. **Degree Completion Ring** (new `sage-card`)
3. **From Your Advisor** (new `sage-card`)
4. **Holds** (existing)
5. **Financial** (existing)

### Feature 1 — Degree Completion Ring

Pure SVG inside a `sage-card`. No external library.

```
cx=60 cy=60 r=48
circumference = 2π × 48 ≈ 301.6
strokeDasharray = circumference
strokeDashoffset = circumference × (1 - pct/100)
```

- Track circle: `stroke: var(--border)`, `strokeWidth: 8`, `fill: none`
- Progress circle: `stroke: var(--am)`, `strokeWidth: 8`, `fill: none`, `strokeLinecap: round`
- Percentage text: centered, `fontSize: 22px`, `fontWeight: 900`, `fill: var(--t1)`
- No drop shadow, no gradient
- Below ring: one line of plain text — "On track to graduate in [S1 2027]" or "Graduation may be delayed — speak with your advisor." Font size `12px`, color `--t3` if on track, `--am-2` if delayed.

### Feature 2 — Academic Standing Label

Inserted in the Student Info card, below the major row, before the field list.

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
  <span className="dot" style={{ background: dotColor }} />
  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                 textTransform: 'uppercase', color: 'var(--t3)' }}>
    {label}
  </span>
</div>
```

Color mapping:
- `deans_list` → `var(--ob)` (neutral dark)
- `good` → `var(--green-dot)`
- `warning` → `var(--yellow-dot)`
- `probation` → `var(--red-dot)`

No background, no border. The word "probation" appears only in this small uppercase label.

### Feature 3 — Grade Trend by Semester

Pure SVG inside a `sage-card`. Fixed height card; chart area is a fixed `height: 120px` SVG.

**When `hasEnoughData = false`:** chart area replaced with one line of `.empty-sub` text: "Not enough data yet — trend will appear after your second semester." Card dimensions unchanged.

**When `hasEnoughData = true`:**
- ViewBox: `0 0 400 100`
- Map semester labels to evenly-spaced x positions; map avgGrade (0–100) to y (inverted)
- Single baseline rule: `<line x1="0" y1="100" x2="400" y2="100" stroke="var(--border)" />`
- Polyline segments: all segments before the last two in `var(--t2)`; final segment in `var(--am)` if last grade < second-to-last, `var(--green)` if improving, `var(--t2)` if flat
- Data point circles: `r=4`, `fill` matches their segment color
- X-axis labels: semester label strings below the baseline, `fontSize: 9px`, `fill: var(--t4)`
- Section label above chart: `10px`, `700`, `uppercase`, `--t4` — "GRADE TREND BY SEMESTER"
- No grid lines, no legend, no y-axis labels

### Feature 4 — Suggested for Next Semester

`sage-card` with `data-table`. Columns: Course Code, Course Name, Credits, Recommended Semester. Read-only. Up to 4 rows.

Empty state (no eligible courses): standard `.empty-state` block with `.empty-msg`: "No eligible courses found — your advisor will assist with planning."

If `recommendedCourses` state is `null` (fetch failed): same empty state.

### Feature 6 — From Your Advisor

`sage-card` in right column. If `advisorMessages` is `null` or empty array:

```jsx
<p className="empty-sub" style={{ padding: '14px 20px' }}>No messages from your advisor.</p>
```

If messages exist: plain list. Each item:
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
  <span style={{ fontSize: '13px', color: 'var(--t1)' }}>{note}</span>
  <span style={{ fontSize: '11px', color: 'var(--t4)', marginLeft: '12px', flexShrink: 0 }}>
    {formattedDate}
  </span>
</div>
```

No flag type shown. No action controls.

---

## Section 4: Frontend — Schedule Page (Feature 5)

**File:** `frontend/app/schedules/mine/page.tsx`

### Prerequisite Violation Warning

Fetched via `GET /api/students/:studentId/prerequisite-violations` in a `useEffect` on mount.

Rendered above the course table only when `violations.length > 0`:

```jsx
<div style={{ borderLeft: '2px solid var(--am)', paddingLeft: '16px', marginBottom: '16px' }}>
  {violations.map((v, i) => (
    <div key={i} style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: i < violations.length - 1 ? '6px' : 0 }}>
      You are enrolled in {v.courseName} without completing {v.missingPrereq}. Please contact your advisor.
    </div>
  ))}
</div>
```

No icon, no background, no badge. If fetch fails or returns empty, nothing renders.

---

## Section 5: Frontend — Appointments Pages (Feature 7)

### Student page — `frontend/app/appointments/page.tsx`

**Structure:**

1. `.sage-page-header` — title "Appointments", sub "Request and track advisor meetings."
2. `sage-card` — appointment history `data-table`
   - Columns: Topic, Requested Date, Status, Advisor Response
   - Status: `.dot-status` with `.dot` — `--t1` dot for Confirmed, `--t4` dot for Pending, `--t3` + `text-decoration: line-through` for Cancelled
   - Advisor response or cancellation reason: second `<div>` inline below status cell, `fontSize: 11px`, `color: var(--t4)`
   - Empty state: standard `.empty-state` block
3. `<hr style={{ borderColor: 'var(--border)', margin: '0 32px' }}>`
4. `sage-card` — request form
   - Topic: `.sage-select` with options: Academic Planning, Course Selection, Grade Concern, Major Change, Other
   - Requested Date: `<input type="date" className="sage-input">`
   - Notes: `<textarea className="sage-input" rows={3}>` (optional)
   - If any appointment is pending: plain `.empty-sub` text "You have a pending request. Wait for your advisor to respond before submitting another." Submit button rendered as `disabled`
   - Submit: `.btn.btn-amber`

### Advisor page — `frontend/app/advisor/appointments/page.tsx`

`data-table` with columns: Student Name, Topic, Requested Date, Notes, Status.

- Pending rows sorted to top
- Pending rows: small inline "Respond" text button (`color: var(--am-2)`, no border, cursor pointer). Click expands inline action area below that row: status `<select>`, response/cancellation note `.sage-input`, `.btn.btn-ghost-light` "Save". Only one row expanded at a time. Save calls `PUT /api/advisor/appointments/:id`, collapses on success.
- Confirmed / Cancelled rows: response note or cancellation reason rendered as second line `fontSize: 11px`, `color: var(--t4)`. No controls.

### Advisor sidebar pending count

`AdvisorLayout.tsx` fetches `GET /api/advisor/appointments?status=pending` on mount and passes the result length as a new `count` prop on the Appointments `NavItem`.

`Sidebar.tsx` `NavItem` interface gains `count?: number`. In `renderItem`, after the label `<span>`, add:
```tsx
{item.count != null && item.count > 0 && (
  <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: '6px', fontSize: '12px' }}>
    {item.count}
  </span>
)}
```
No badge shape, no amber background — this is distinct from the existing `badge` prop.

### New navigation entries

- Student sidebar: "Appointments" link → `/appointments`
- Advisor sidebar: "Appointments" link → `/advisor/appointments` with pending count

### `AppointmentRequest` topic values (validated backend and frontend)

`Academic Planning` | `Course Selection` | `Grade Concern` | `Major Change` | `Other`

---

## API Client additions (`frontend/lib/api.ts`)

New functions to add:

```typescript
// Student analytics
getStudentPosProgress(studentId: string)
getStudentAcademicStanding(studentId: string)
getStudentGradeTrend(studentId: string)
getStudentRecommendedCourses(studentId: string)
getStudentPrerequisiteViolations(studentId: string)
getStudentAdvisorMessages(studentId: string)
getStudentAppointments(studentId: string)
createStudentAppointment(studentId: string, data: { topic, requestedDate, notes? })

// Advisor appointments
getAdvisorAppointments(filters?: { status?: string })
updateAdvisorAppointment(appointmentId: string, data: { status, advisorResponse?, cancellationReason? })
```

---

## Files Changed Summary

### Backend
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `StudentFlag`, `AppointmentRequest` models, `AppointmentStatus` enum, relations |
| `prisma/migrations/` | New migration: `add_student_flags_and_appointments` |
| `prisma/seed.ts` | Add 2 visible `StudentFlag` records |
| `src/api/studentAnalyticsRoutes.ts` | **New file** — 8 endpoints |
| `src/api/advisorSisRoutes.ts` | Add 2 advisor appointment endpoints; extend student profile response with `academicStanding` |
| `src/index.ts` | Mount `studentAnalyticsRoutes` |

### Frontend
| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Add Features 1, 2, 3, 4, 6; `Promise.allSettled`; sticky right column |
| `app/schedules/mine/page.tsx` | Add Feature 5 violation warning |
| `app/appointments/page.tsx` | **New file** — Feature 7 student appointments |
| `app/advisor/appointments/page.tsx` | **New file** — Feature 7 advisor appointments |
| `lib/api.ts` | Add 10 new API functions |
| `components/LayoutShell.tsx` | Add Appointments entry to student `links` array |
| `components/AdvisorLayout.tsx` | Add Appointments entry to `mainItems`; fetch pending count on mount |
| `components/Sidebar.tsx` | Add `count?: number` field to `NavItem` interface; render as plain `--t3` text (distinct from existing `badge` amber chip) |
