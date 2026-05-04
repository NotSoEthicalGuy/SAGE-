# S.A.G.E. — Student Academic Guidance Engine

**GitHub Repository:** https://github.com/NotSoEthicalGuy/SAGE-

---

## Overview

**S.A.G.E. (Student Academic Guidance Engine)** is an AI-first Student Information System (SIS) designed for universities. Unlike traditional systems that store academic data, S.A.G.E. continuously interprets it to generate actionable academic intelligence.

The platform enables advisors to detect academic drift early, understand underlying performance patterns, simulate intervention outcomes, and guide students toward timely graduation.

At its core, S.A.G.E. combines a full institutional SIS with an internal intelligence layer and an external AI reasoning engine (Anthropic Claude), forming a complete decision-support system for academic advising.

---

## System Architecture

S.A.G.E. is built around a layered intelligence pipeline:


Student Information System (SIS)
↓

S.A.G.E. Intelligence Engine (Feature Engineering + Analysis)
↓

AI Reasoning Layer (Claude API)
↓

Structured Advisory Insights & Reports


### Key Principle

> Claude does not generate intelligence from raw data.  
> S.A.G.E. constructs structured academic intelligence, and Claude operates on top of it to produce explainable advisory decisions.

---

## User Roles

The system supports three distinct roles:

- **Admin** — manages institutional data, users, courses, enrollments, and payments  
- **Advisor** — monitors student performance, runs AI analysis, plans interventions, and communicates with students  
- **Student** — views academic progress, GPA trends, degree plans, and schedules advisor meetings  

---

## Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| AI Reasoning | Claude (Anthropic API) |
| Intelligence Layer | Custom Feature Engineering (TypeScript services) |
| Auth | JWT, bcryptjs |
| File Processing | Multer, pdf-parse, officeparser |
| Validation | Zod |

---

## Core Features

### Advisor Portal

- **Academic Drift Detection**  
  Drift scoring (0–1) based on GPA trends, course performance, prerequisite violations, and behavioral signals  

- **Semester Triage**  
  Bulk identification of at-risk students using configurable thresholds  

- **Graduation Pathway Simulator**  
  AI-generated semester plans for current and alternative majors  

- **Intervention Tracking**  
  Log advisory actions and measure effectiveness through before/after analysis  

- **Intervention Insights**  
  Identify which interventions produce the best academic outcomes  

- **Flag & Hold System**  
  Track student status (At Risk, Follow-Up, Academic Hold, Positive Progress)  

- **Messaging & Appointments**  
  Advisor–student communication and scheduling  

- **S.A.G.E. Chat**  
  AI assistant for contextual advising queries  

---

### Student Portal

- View GPA trends, grades, and course history  
- Track degree progress and required courses  
- Book advisor appointments  
- View flags, messages, and recommendations  
- Monitor financial obligations  

---

### Admin Panel

- Manage students, advisors, courses, and majors  
- Upload course materials with automatic text extraction  
- Assign advisors and monitor system-wide analytics  
- Manage enrollments, grades, and payments  

---

## S.A.G.E. Intelligence Engine

The Intelligence Engine is the core innovation of the system.

Before invoking any external AI, S.A.G.E. processes raw academic data into structured indicators.

### Generated Intelligence Includes:

- GPA trend slope and performance velocity  
- Academic volatility and consistency metrics  
- Core course performance analysis  
- Prerequisite violation detection  
- Course difficulty mismatch  
- Behavioral indicators (attendance, withdrawals)  

This transforms raw records into meaningful academic signals.

---

## Counterfactual Simulation (Advanced Feature)

S.A.G.E. introduces a **What-If Simulation Engine** that evaluates how changes in student behavior or academic decisions affect outcomes.

### Example:


Current Drift Score: 0.78 (Critical)

If attendance improves → 0.52
If exam scores improve → 0.41
If major changes → 0.30


This enables advisors to move from passive analysis to proactive decision-making.

---

## AI Orchestration Pipeline

The AI workflow is structured as follows:

1. Load student academic records (grades, enrollments, exams, history)  
2. Generate structured intelligence using the S.A.G.E. Intelligence Engine  
3. Construct a controlled prompt using engineered features  
4. Invoke Claude API with a strict JSON schema  
5. Validate output using Zod  
6. Store results in `ai_reports`  

---

## AI Output Schema

Each analysis produces:

- `drift_score` (0.0 – 1.0)  
- `drift_level` (on_track / early_warning / drifting / critical)  
- `trajectory_summary`  
- `drift_signals`  
- `strengths` and `weaknesses`  
- `recommendations` (majors with compatibility scores)  
- `confidence` and `data_gaps`  

---

## Project Structure


S.A.G.E. V1/
├── backend/
│ ├── src/
│ │ ├── api/
│ │ ├── services/
│ │ │ ├── aiOrchestrator.ts
│ │ │ ├── intelligenceEngine.ts
│ │ │ ├── interventionService.ts
│ │ ├── middleware/
│ │ ├── schemas/
│ │ └── db/
│ ├── prisma/
│ └── package.json
│
├── frontend/
│ ├── app/
│ ├── components/
│ ├── lib/
│ └── package.json
│
└── shared/


---

## Database Highlights

Key tables include:

- `students`, `advisors`  
- `courses`, `sections`, `enrollments`  
- `ai_reports`  
- `interventions`, `intervention_outcomes`  
- `triage_runs`  
- `student_plans`, `degree_requirements`  
- `student_flags`, `appointments`  
- `course_materials`, `course_skills`  

---

## Setup & Installation

### Prerequisites

- Node.js 18+  
- PostgreSQL 13+  
- Anthropic API key  

### 1. Clone Repository

```bash
git clone https://github.com/NotSoEthicalGuy/SAGE-
cd "S.A.G.E. V1"
2. Configure Environment Variables

Backend (backend/.env)

DATABASE_URL="postgresql://postgres:<your-password>@localhost:5432/sage"
JWT_SECRET=<your-secret>
ANTHROPIC_API_KEY=sk-ant-<your-key>
PORT=4000

Frontend (frontend/.env.local)

NEXT_PUBLIC_API_URL=http://localhost:4000/api
3. Install Dependencies
cd backend
npm install

cd frontend
npm install
4. Database Setup
cd backend
npx prisma migrate dev
npm run seed
5. Run Application
cd backend
npm run dev

cd frontend
npm run dev
Default Credentials
Role	Email	Password
Admin	admin@sage.edu
	admin123
API Overview
Route	Description
/api/auth	Authentication
/api/students/:id	Student data & AI analysis
/api/advisor	Advisor tools
/api/admin	Admin management
/api/courses	Course operations
/api/sage/chat	AI assistant
/api/majors	Degree requirements
Final Note

S.A.G.E. is not just an academic reporting tool. It is an AI-driven decision-support system that transforms institutional data into continuous academic intelligence, enabling proactive and informed advising.

License

Academic project. All rights reserved.
