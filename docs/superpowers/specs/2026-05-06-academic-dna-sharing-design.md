# Academic DNA Skill Grading + Student Share Flow

**Date:** 2026-05-06
**Status:** Approved

---

## Overview

Extends the existing Academic DNA analysis with 10 skill grades (5 universal + 5 major-specific). Advisors can optionally edit grades, add a note, and share the report with a student. Students view the report in their Messages tab, can optionally chat with SAGE about their grades (max 5 messages, ±10 grade shift per skill), and must click Approve Report to confirm. Approval triggers a notification in the advisor's new Notifications tab.

---

## Archetypes

The five archetypes replace the previous four. Judgmental but not cruel — honest assessments of academic pattern, suitable for showing directly to students.

| Archetype | Pattern |
|---|---|
| Square Peg | Skills and major point in opposite directions. Performs better outside their declared field. |
| Fading Student | Started with ability. Performance declining semester over semester with no recovery. |
| Overcommitter | Takes on more than they can perform under. Grades reflect poor capacity judgment, not lack of ability. |
| Selective Student | Engages when it suits them. Excels in chosen courses, underperforms in required major coursework. |
| Underdeliverer | No single dramatic pattern. Consistent broad gap between program demands and output. |

---

## Skill Grades

Every DNA analysis produces 10 skill grades (0–100).

**Universal (5) — same for all students regardless of major:**
- Critical Thinking
- Resilience
- Consistency
- Self-Management
- Motivation

**Major-specific (5) — Claude determines dynamically based on the student's declared major.** For example, a CS student might receive: Algorithmic Thinking, Problem Decomposition, Logical Reasoning, Technical Precision, Debugging Instinct. A Business student might receive: Strategic Reasoning, Quantitative Aptitude, Communication, Initiative, Analytical Thinking.

Grades are inferred entirely from the student's academic record (grades, attendance, semester trends, course difficulty). Claude does not ask for self-reported data.

---

## End-to-End Flow

```
1. Advisor runs DNA analysis on a student
2. Claude returns: archetype + confidence + reasoning + predicted outcome +
   interventions + 10 skill grades (5 universal + 5 major-specific)
3. Result saved to DnaResult table (original, never modified)
4. Advisor reviews result
5. [Optional] Advisor edits skill grade scores, adds a note
6. Advisor clicks Share → SharedDnaReport record created
7. Student opens Messages tab → sees archetype, skill grades,
   advisor edit diff (if any), advisor note (if any)
8. [Optional] Student chats with SAGE (max 5 messages)
   - SAGE stays in SAGE persona only — no general-purpose responses
   - If student makes a valid argument, a single skill score shifts ±10 max
   - Each skill can only be adjusted once per chat session
9. Student clicks Approve Report (mandatory)
10. SharedDnaReport marked approved, finalGrades locked
11. Notification created → appears in advisor's Notifications tab
```

Advisor editing scores: **optional**
Student chatting: **optional**
Student approving: **mandatory**

---

## Data Model (3 new Prisma tables)

### DnaResult
Stores the raw Claude output. Never modified after creation.

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
  // [{name: string, score: number, isUniversal: boolean}] x10
  generatedAt      DateTime @default(now()) @map("generated_at")

  student         Student          @relation(...)
  advisor         Advisor          @relation(...)
  sharedReports   SharedDnaReport[]

  @@index([studentId])
  @@map("dna_results")
}
```

### SharedDnaReport
Created when an advisor shares a DNA result with a student. Carries the full snapshot so the original is never touched.

```prisma
model SharedDnaReport {
  id                  String    @id @default(uuid())
  dnaResultId         String    @map("dna_result_id")
  studentId           String    @map("student_id")
  advisorId           String    @map("advisor_id")
  advisorNote         String?   @map("advisor_note")
  originalGrades      Json      @map("original_grades")
  // Copy of DnaResult.skillGrades at share time
  advisorEditedGrades Json?     @map("advisor_edited_grades")
  // [{skillName, scoreBefore, scoreAfter}] — null if no edits made
  finalGrades         Json      @map("final_grades")
  // Starts as originalGrades (or editedGrades). Updated by chat.
  chatMessages        Json      @default("[]") @map("chat_messages")
  // [{role: "student"|"sage", content, timestamp}]
  chatMessageCount    Int       @default(0) @map("chat_message_count")
  isApproved          Boolean   @default(false) @map("is_approved")
  approvedAt          DateTime? @map("approved_at")
  sharedAt            DateTime  @default(now()) @map("shared_at")

  dnaResult DnaResult @relation(...)
  student   Student   @relation(...)
  advisor   Advisor   @relation(...)

  @@index([studentId])
  @@map("shared_dna_reports")
}
```

### Notification
Advisor-facing notifications. Supports report approvals and other event types (e.g. appointment requests).

```prisma
model Notification {
  id         String   @id @default(uuid())
  advisorId  String   @map("advisor_id")
  type       String
  // "report_approved" | "appointment_request" | ...
  title      String
  body       String
  studentId  String?  @map("student_id")
  reportId   String?  @map("report_id")
  isRead     Boolean  @default(false) @map("is_read")
  createdAt  DateTime @default(now()) @map("created_at")

  advisor Advisor @relation(...)

  @@index([advisorId])
  @@map("notifications")
}
```

---

## Backend — New / Modified Endpoints

### Modified: `dnaRoutes.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/students/:studentId/dna` | advisor | Run DNA analysis. Now saves result to `DnaResult` and returns full record including `id`. |
| `GET` | `/students/:studentId/dna/latest` | advisor | Return most recent `DnaResult` for a student. |
| `POST` | `/students/:studentId/dna/:dnaResultId/share` | advisor | Create `SharedDnaReport`. Body: `{ advisorNote?, editedGrades? }`. |

### New: `sharedReportRoutes.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/student/shared-report` | student | Get the student's latest `SharedDnaReport` (if any). |
| `POST` | `/shared-reports/:reportId/chat` | student | Send a message to SAGE about the report. Body: `{ message }`. Returns `{ reply, updatedGrades? }`. Enforces 5-message limit. |
| `POST` | `/shared-reports/:reportId/approve` | student | Mark report approved, lock `finalGrades`, create advisor `Notification`. |

### New: `notificationRoutes.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/advisor/notifications` | advisor | List all notifications for the authenticated advisor, ordered by `createdAt` desc. |
| `PUT` | `/advisor/notifications/:id/read` | advisor | Mark a single notification as read. |
| `PUT` | `/advisor/notifications/read-all` | advisor | Mark all notifications as read. |

---

## Backend — SAGE Chat Behavior

The student chat endpoint uses a dedicated system prompt:

- SAGE persona strictly enforced — no off-topic responses
- On each message: Claude receives the full 10 skill grades, the student's message, and the conversation so far
- Claude decides whether the student's argument justifies a score change
- A score can shift by at most ±10 from the current value (not from the original AI value)
- Each skill can only be adjusted once per session
- If the student hits 5 messages, the endpoint returns `{ limitReached: true }` and no further messages are accepted

---

## Frontend — New / Modified Pages

### Modified: `frontend/app/advisor/student-information/page.tsx`
The DNA analysis result is already displayed here. This page gets the share flow added:
- Add **"Share with Student →"** button
- Clicking opens a slide-in right panel (hidden by default, toggled)
- Panel shows all 10 skill scores with editable inputs (`AI: 74 → [input]`)
- Optional note textarea
- "Send to Student" and "Cancel" actions in panel

### Modified: `frontend/app/academic/messages/page.tsx`
Replace placeholder with full shared report view:
1. **Advisor note banner** (amber left border, shown only if note exists)
2. **Archetype card** (name + reasoning paragraph)
3. **Skill grades list** — two sections (Universal / Major-specific)
   - Each row: skill name, progress bar, score
   - Advisor-edited rows highlighted with before → after diff in small text
4. **SAGE chat panel** — message count indicator ("3 of 5 messages used"), chat bubbles, input, remaining messages note
5. **Approve Report button** — amber, full-width, with confirmation note. Disabled after approval.

### New: `frontend/app/advisor/notifications/page.tsx`
- Two sections: "Unread" and "Earlier"
- Each notification: amber dot (unread) or grey dot (read), title, body with inline detail, timestamp, "View Report" / "View Request" action link
- Report approval notifications include: archetype name, whether chat was used, any grade changes

### Modified: `frontend/components/AdvisorLayout.tsx`
- Add **Notifications** nav item with unread count badge (polling or fetched on mount)
- Route: `/advisor/notifications`

---

## Constraints & Rules

- A student can only have one active (non-approved) `SharedDnaReport` at a time
- Advisor can re-run DNA and generate a new `DnaResult` at any time; it does not affect an already-shared report
- Student cannot chat after approving
- Grade adjustments apply to `finalGrades` only — `originalGrades` and `advisorEditedGrades` are immutable after creation
- Notifications for appointment requests already exist in the system; the `Notification` model should handle both types via the `type` field
- If an advisor attempts to share a new report while the student already has an active (non-approved) `SharedDnaReport`, the share endpoint returns a 409 conflict — the advisor must wait for the student to approve or the previous report must be explicitly cancelled (out of scope for this feature)
- Prisma `@relation(...)` placeholders in this spec are schematic; full relation field names will be determined during implementation following the project's existing naming conventions
