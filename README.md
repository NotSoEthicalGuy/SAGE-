# S.A.G.E. — Student Academic Guidance Engine

**GitHub Repository:** [https://github.com/NotSoEthicalGuy/SAGE-](https://github.com/NotSoEthicalGuy/SAGE-)

---

## Overview

S.A.G.E. (Student Academic Guidance Engine) is a full-stack AI-powered academic advising platform built for universities. The system helps advisors detect academic drift early, plan student interventions, and guide students toward timely graduation. It integrates Anthropic's Claude AI model to analyze student academic records and generate structured drift analysis reports.

The platform supports three distinct user roles:

- **Admin** — manages university data, users, courses, sections, enrollments, and payments
- **Advisor** — monitors student progress, runs AI drift analysis, schedules interventions, and communicates with students
- **Student** — views academic progress, GPA, grades, schedule, degree plan, and books appointments with their advisor

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| AI | Anthropic Claude (claude-sonnet-4) via `@anthropic-ai/sdk` |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Handling | Multer, pdf-parse, officeparser |
| Validation | Zod |

---

## Key Features

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

### Student Portal
- View enrolled courses, final grades, and GPA trend
- Track Program of Study (POS) completion toward graduation
- View academic standing and recommended courses
- Book appointments with assigned advisor
- View advisor messages and flags
- Check payment obligations (LBP/USD)

### Admin Panel
- Create and manage students, advisors, courses, sections, majors
- Upload course materials (PDF, PowerPoint) with automatic text extraction
- Assign advisors to majors
- View system-wide statistics and drift level distribution
- Manage enrollments, grades, and payment records

---

## Project Structure

```
S.A.G.E. V1/
├── backend/
│   ├── src/
│   │   ├── api/              # 15 route files (auth, admin, advisor, student, AI)
│   │   ├── services/         # aiOrchestrator, prerequisiteService, interventionService
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

The core AI service (`backend/src/services/aiOrchestrator.ts`) uses Anthropic's Claude model to:

1. Load a student's full academic record (enrollments, exam scores, GPA, withdrawal history)
2. Build a structured prompt describing the student's academic context
3. Call the Claude API with a defined JSON output schema (validated with Zod)
4. Parse and store the result in the `ai_reports` table

**Output fields per analysis:**
- `drift_score` (0.0 – 1.0)
- `drift_level` (on_track / early_warning / drifting / critical)
- `trajectory_summary` — advisor-readable narrative
- `drift_signals` — specific risk indicators with evidence
- `strengths` and `weaknesses` — domain-level performance breakdown
- `is_reroute_recommended` — boolean flag for major change recommendation
- `recommendations` — alternative majors with match scores and transferable credits
- `confidence` and `data_gaps` — model metadata

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
