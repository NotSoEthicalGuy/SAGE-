# S.A.G.E. — Student Academic Guidance Engine

**GitHub Repository:** [https://github.com/NotSoEthicalGuy/SAGE-](https://github.com/NotSoEthicalGuy/SAGE-)

---

## Overview

S.A.G.E. (Student Academic Guidance Engine) is a full-stack **Student Information System (SIS)** with an integrated AI-powered academic advising engine, built for universities. As a SIS, it centralizes all aspects of student academic life — enrollment, grade management, course scheduling, attendance, degree progress, payment tracking, and advisor communication — into a single unified platform.

On top of the core SIS functionality, S.A.G.E. layers an AI advisory engine powered by Anthropic's Claude model. This engine analyzes each student's complete academic record to detect academic drift, recommend interventions, simulate graduation pathways, and suggest alternative majors when students are at risk of falling behind.

The platform supports three distinct user roles:

- **Admin** — manages all university data including students, advisors, courses, sections, enrollments, grades, and payments (full SIS administration)
- **Advisor** — monitors assigned students, runs AI drift analysis, logs interventions, schedules appointments, and communicates with students
- **Student** — views their own academic record, GPA, enrolled courses, grades, degree plan, payment obligations, and books appointments with their advisor

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk` |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Handling | Multer, pdf-parse, officeparser |
| Validation | Zod |

---

## Key Features

### SIS Core (Admin Panel)
- **Student Records Management** — Create, update, and manage full student profiles including personal info, GPA, enrollment year, and academic standing
- **Course & Section Management** — Define courses with prerequisites, credit hours, difficulty, and skills; create class sections with instructor, schedule, and capacity
- **Enrollment Management** — Enroll students in sections, track enrollment status (registered, in-progress, completed, withdrawn, failed, dropped)
- **Grade Management** — Record and manage exam results (midterms, finals, quizzes, projects) per student per course
- **Degree & Major Management** — Define majors with required credit hours, assign advisors, and map Program of Study (POS) requirements per semester
- **Attendance Tracking** — Track per-session attendance (present, absent, late) linked to enrollments
- **Payment Records** — Manage tuition payment slips in LBP and USD with status tracking (pending, paid, overdue)
- **Course Material Uploads** — Upload PDFs and PowerPoint files with automatic text extraction for AI reference
- **User Management** — Create and manage admin, advisor, and student accounts with role-based access control

### Advisor Portal
- **Drift Analysis** — AI-powered academic drift scoring (0–1 scale) with signals such as GPA decline, core course underperformance, withdrawal rate, and prerequisite violations
- **Semester Triage** — Bulk detection of at-risk students with configurable thresholds
- **Graduation Pathway Simulator** — AI-generated semester-by-semester graduation plans for current and alternative majors, with transferable credit estimates
- **Intervention Tracking** — Log interventions (academic coaching, tutoring, peer mentoring, etc.) and measure effectiveness via before/after drift scores
- **Intervention Insights** — Aggregated analytics on which intervention types are most effective
- **Flag & Hold System** — Flag students as At Risk, Follow Up, Academic Hold, or Positive Progress
- **Appointment Management** — Confirm or cancel student appointment requests
- **Messaging** — Send targeted messages or broadcast to filtered student cohorts
- **SAGE Chat** — AI assistant for ad-hoc advising queries

### Student Self-Service Portal
- View full academic record: enrolled courses, exam grades, cumulative GPA
- Track Program of Study (POS) completion and remaining requirements toward graduation
- View academic standing and recommended next courses
- Submit enrollment and drop requests for course sections
- Book appointments with assigned advisor
- View advisor-sent messages and active flags/holds
- Check payment obligations and due dates (LBP/USD)

---

## Project Structure

```
S.A.G.E. V1/
├── backend/
│   ├── src/
│   │   ├── api/              # 15 route files (auth, admin, advisor, student, AI)
│   │   ├── services/
│   │   │   ├── intelligenceEngine.ts   # Computes IntelligenceProfile from raw DB data
│   │   │   ├── aiOrchestrator.ts       # Orchestrates Claude calls using the profile
│   │   │   ├── prerequisiteService.ts  # Detects prerequisite violations
│   │   │   └── interventionService.ts  # Intervention tracking logic
│   │   ├── middleware/        # JWT auth & role-based access control
│   │   ├── schemas/           # Zod validation schemas
│   │   └── db/                # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma      # Full database schema (~530 lines)
│   │   ├── seed.ts            # Demo data seeder
│   │   └── migrations/
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   ├── dashboard/         # Student dashboard
│   │   ├── advisor/           # Advisor dashboard, students, SAGE chat, appointments
│   │   ├── admin/             # Admin panel (students, courses, sections, payments, etc.)
│   │   ├── grades/
│   │   ├── schedules/
│   │   └── registration/
│   ├── components/
│   ├── lib/
│   │   ├── api.ts             # API client (70+ typed functions)
│   │   └── auth.ts            # JWT helpers
│   └── package.json
│
└── shared/
    └── types.ts               # Shared TypeScript interfaces
```

---

## Database Schema Highlights

The PostgreSQL schema (managed via Prisma) includes:

- `students`, `advisors` — user accounts with role-based access
- `majors`, `courses`, `sections`, `enrollments` — full academic catalog
- `exams` — midterms, finals, quizzes, and project records
- `ai_reports` — AI drift analysis results per student
- `student_flags` — hold and flag records
- `interventions`, `intervention_outcomes` — advisor actions and effectiveness tracking
- `triage_runs` — batch at-risk detection results
- `student_plans`, `degree_requirements` — graduation pathway data
- `appointment_requests`, `advisor_comments` — communication layer
- `course_materials`, `course_skills` — course content metadata
- `payment_slips` — financial records (LBP/USD)

---

## AI Integration

SAGE's AI subsystem is split into two layers: a local **Intelligence Engine** that computes quantitative metrics, and an **AI Orchestrator** that feeds those metrics to Claude for qualitative analysis. Raw database records are never sent directly to the model.

### Layer 1 — Intelligence Engine (`intelligenceEngine.ts`)

Before calling Claude, the Intelligence Engine builds a structured `IntelligenceProfile` for the student entirely from database records. This profile contains:

| Metric | Description |
|--------|-------------|
| `driftScore` | Weighted composite score (0–1) combining all risk factors |
| `riskLevel` | Categorical label — `on_track`, `early_warning`, `drifting`, or `critical` |
| `gpaTrend` | Linear slope of semester-by-semester GPA averages |
| `performanceVolatility` | Normalized standard deviation of all course grades (0–1) |
| `attendanceScore` | Fraction of sessions marked present |
| `prerequisiteViolations` | Courses taken without completing required prerequisites |
| `courseDifficultyMismatch` | Performance gap between easy and hard courses |
| `strengths` / `weaknesses` | Top topic domains by average grade, derived from course metadata |
| `semesterAverages` | Per-semester grade averages for trend visualization |
| `failureRate` | Ratio of failed/withdrawn courses to total attempted |

**Drift Score Formula:**

```
driftScore =
  slopeComponent    × 0.30   (declining GPA slope)
  + failureRate     × 0.25
  + prereqComponent × 0.20   (prerequisite violations)
  + difficultyMismatch × 0.15
  + volatility      × 0.10
```

The engine also runs `simulateStudentScenarios()`, producing projected drift scores and GPA estimates under four hypothetical interventions: current trajectory, improved attendance, improved grades, and reduced course load.

### Layer 2 — AI Orchestrator (`aiOrchestrator.ts`)

The orchestrator receives the `IntelligenceProfile` and scenario projections, formats them into a structured text prompt, and calls Claude. Claude is instructed to use the pre-computed metrics as grounding evidence and apply qualitative reasoning to identify specific drift signal types, explain them in advisor-readable language, and produce a validated JSON report.

**Analysis pipeline:**

1. Load core student info and all majors from the database (in parallel with the intelligence profile build)
2. Run `buildStudentIntelligence()` to compute the full `IntelligenceProfile`
3. Run `simulateStudentScenarios()` to generate intervention projections
4. Build a structured prompt from the profile — no raw DB records are included
5. Call `claude-sonnet-4-20250514` via the Anthropic SDK
6. Parse and validate the JSON response with Zod
7. Store the report in the `ai_reports` table

**Output fields per analysis:**

| Field | Description |
|-------|-------------|
| `drift_score` | 0.0 – 1.0 score aligned with the pre-computed value |
| `drift_level` | `on_track` / `early_warning` / `drifting` / `critical` |
| `trajectory_summary` | 2–4 sentence narrative for the advisor |
| `drift_signals` | Specific risk indicators with type, severity, and evidence |
| `strengths` / `weaknesses` | Domain-level performance breakdown with supporting courses |
| `is_reroute_recommended` | Boolean flag for major change recommendation |
| `recommendations` | Alternative majors with match scores and transferable credit estimates |
| `confidence` | Model self-assessed confidence (0–1) |
| `data_gaps` | Flags for missing data that may affect accuracy |

**Drift signal types Claude detects:**

- `gpa_decline` — Cumulative GPA trending downward over semesters
- `core_underperformance` — Consistently low grades in major-core courses
- `elective_vs_core_gap` — Much stronger performance in electives than core
- `prereq_grade_decay` — Lower grades in advanced courses than in prerequisites
- `repeated_topic_weakness` — Persistent failure in specific topic areas
- `semester_over_semester` — Each semester average lower than the previous
- `high_withdrawal_rate` — Multiple course withdrawals
- `skill_domain_mismatch` — Student's strengths lie outside their declared major

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 13+ (running locally)
- An Anthropic API key

### 1. Clone the Repository

```bash
git clone https://github.com/NotSoEthicalGuy/SAGE-
cd "S.A.G.E. V1"
```

### 2. Configure Environment Variables

**Backend** — create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:<your-password>@localhost:5432/sage"
JWT_SECRET=<any-long-random-string>
ANTHROPIC_API_KEY=sk-ant-<your-key>
PORT=4000
```

**Frontend** — create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (separate terminal)
cd frontend
npm install
```

### 4. Set Up the Database

```bash
cd backend
npx prisma migrate dev    # Apply schema migrations
npm run seed              # Seed demo data
```

### 5. Start the Application

```bash
# Backend (terminal 1)
cd backend
npm run dev        # Starts on http://localhost:4000

# Frontend (terminal 2)
cd frontend
npm run dev        # Starts on http://localhost:3000
```

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@sage.edu` | `admin123` |
| Advisor | Created via admin panel | Set on creation |
| Student | Created via admin panel | Set on creation |

> Use the Admin account to create advisors and students, or run `npm run seed` to populate demo data automatically.

---

## API Overview

The REST API is organized into domain-specific route files, all prefixed with `/api`:

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, password change |
| `/api/students/:id` | Student profile, AI analysis, appointments, chat |
| `/api/advisor/` | Advisor student list, flags, interventions, triage, graduation planner |
| `/api/admin/` | Admin CRUD for users, students, courses, sections |
| `/api/courses/` | Course management and material uploads |
| `/api/sage/chat` | AI chat interface for advisors |
| `/api/majors/` | Major listing and course requirements |

All protected routes require a Bearer token in the `Authorization` header.

---

## License

This project was developed as an academic project. All rights reserved.
