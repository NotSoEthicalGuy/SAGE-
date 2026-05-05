# Advisor New Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new advisor tabs to SAGE — New Student Registration, Broadcast Comments, and Course Offering — with full backend persistence in PostgreSQL.

**Architecture:** Three new Next.js pages under `/advisor/`, three new Express endpoints added to `advisorSisRoutes.ts`, and a single Prisma migration to add `phoneNumber` to the Student model. Frontend pages use the existing `fetchJSON` + `useState`/`useEffect` pattern. No new packages required.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Express, Prisma 5, PostgreSQL, bcryptjs (already installed)

---

## File Map

| Status | File | Change |
|---|---|---|
| Modify | `backend/prisma/schema.prisma` | Add `phoneNumber` field to `Student` model |
| Modify | `backend/src/api/advisorSisRoutes.ts` | Add 3 new endpoints |
| Modify | `frontend/lib/api.ts` | Add 3 new API client functions |
| Modify | `frontend/components/Sidebar.tsx` | Add 3 new icon components |
| Modify | `frontend/components/AdvisorLayout.tsx` | Add 3 new nav entries |
| Create | `frontend/app/advisor/new-student/page.tsx` | New Student Registration page |
| Create | `frontend/app/advisor/broadcast/page.tsx` | Broadcast Comments page |
| Create | `frontend/app/advisor/course-offering/page.tsx` | Course Offering page |

---

## Task 1: Prisma Migration — Add phoneNumber to Student

**Files:**
- Modify: `backend/prisma/schema.prisma` (Student model, around line 141)

- [ ] **Step 1: Add the field to the Student model**

In `backend/prisma/schema.prisma`, in the `Student` model, add `phoneNumber` after `studentNumber`:

```prisma
model Student {
  studentId       String   @id @default(uuid()) @map("student_id")
  majorId         String   @map("major_id")
  advisorId       String?  @map("advisor_id")
  passwordHash    String?  @map("password_hash")
  role            UserRole @default(student)
  name            String
  email           String   @unique
  studentNumber   String?  @unique @map("student_number")
  phoneNumber     String?  @map("phone_number")
  enrollmentYear  Int      @map("enrollment_year")
  currentSemester Int      @default(1) @map("current_semester")
  cumulativeGpa   Float?   @map("cumulative_gpa")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  // ... relations unchanged
```

- [ ] **Step 2: Run the migration**

```bash
cd backend
npx prisma migrate dev --name add_phone_number_to_student
```

Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "sage" at "localhost:5432"

Applying migration `20260502_add_phone_number_to_student`

The following migration(s) have been applied:

migrations/
  └─ 20260502..._add_phone_number_to_student/
    └─ migration.sql

Your database is now in sync with your schema.
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add phoneNumber field to Student model"
```

---

## Task 2: Backend — POST /advisor/students

**Files:**
- Modify: `backend/src/api/advisorSisRoutes.ts`

- [ ] **Step 1: Add bcrypt import**

At the top of `backend/src/api/advisorSisRoutes.ts`, add after the existing imports:

```typescript
import bcrypt from 'bcryptjs';
```

- [ ] **Step 2: Add the endpoint**

At the bottom of `backend/src/api/advisorSisRoutes.ts` (after the last `advisorSisRouter.get('/comments/:studentId', ...)` block), add:

```typescript
advisorSisRouter.post('/students', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const { name, email, studentNumber, phoneNumber, password, majorId, enrollmentYear, currentSemester } = req.body;
    if (!name || !email || !studentNumber || !phoneNumber || !password || !majorId || !enrollmentYear) {
      return res.status(400).json({ error: 'name, email, studentNumber, phoneNumber, password, majorId, and enrollmentYear are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: {
        name,
        email,
        studentNumber,
        phoneNumber,
        passwordHash,
        majorId,
        enrollmentYear: Number(enrollmentYear),
        currentSemester: currentSemester ? Number(currentSemester) : 1,
      },
      select: {
        studentId: true,
        name: true,
        email: true,
        studentNumber: true,
        phoneNumber: true,
        majorId: true,
        enrollmentYear: true,
        currentSemester: true,
        createdAt: true,
      },
    });
    res.status(201).json(student);
  } catch (e: any) {
    if (e.code === 'P2002') {
      const field = e.meta?.target?.includes('email') ? 'email' : 'student ID';
      return res.status(409).json({ error: `A student with this ${field} already exists` });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
});
```

- [ ] **Step 3: Restart the backend and manually test with curl**

```bash
curl -X POST http://localhost:4000/api/advisor/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <advisor_jwt_token>" \
  -d '{"name":"Test Student","email":"test.s@example.com","studentNumber":"S999","phoneNumber":"+96170000000","password":"pass123","majorId":"<valid_major_id>","enrollmentYear":2024,"currentSemester":1}'
```

Expected: `201` with student object (no passwordHash).

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/advisorSisRoutes.ts
git commit -m "feat: add POST /advisor/students endpoint"
```

---

## Task 3: Backend — POST /advisor/comments/broadcast

**Files:**
- Modify: `backend/src/api/advisorSisRoutes.ts`

- [ ] **Step 1: Add the endpoint**

At the bottom of `backend/src/api/advisorSisRoutes.ts`, add:

```typescript
advisorSisRouter.post('/comments/broadcast', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const { studentIds, filter, message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const advisorId = req.user!.id;
    let targetIds: string[] = [];

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      targetIds = studentIds;
    } else if (filter && typeof filter === 'object') {
      const { semester, gpaMin, gpaMax, driftStatus } = filter;
      const majorId = await getAdvisorMajorId(advisorId);
      if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

      const where: any = { majorId, isActive: true };
      if (semester !== undefined) where.currentSemester = Number(semester);
      if (gpaMin !== undefined || gpaMax !== undefined) {
        where.cumulativeGpa = {};
        if (gpaMin !== undefined) where.cumulativeGpa.gte = Number(gpaMin);
        if (gpaMax !== undefined) where.cumulativeGpa.lte = Number(gpaMax);
      }

      let students = await prisma.student.findMany({ where, select: { studentId: true } });
      let ids = students.map((s) => s.studentId);

      if (driftStatus) {
        const reports = await prisma.aIReport.findMany({
          where: { studentId: { in: ids } },
          orderBy: { generatedAt: 'desc' },
          select: { studentId: true, driftLevel: true },
        });
        const latestByStudent = new Map<string, string>();
        for (const r of reports) {
          if (!latestByStudent.has(r.studentId)) {
            latestByStudent.set(r.studentId, r.driftLevel);
          }
        }
        ids = ids.filter((id) => latestByStudent.get(id) === driftStatus);
      }

      targetIds = ids;
    } else {
      return res.status(400).json({ error: 'Either studentIds or filter is required' });
    }

    if (targetIds.length === 0) return res.json({ sent: 0 });

    await prisma.advisorComment.createMany({
      data: targetIds.map((studentId) => ({ advisorId, studentId, message: message.trim() })),
    });

    res.json({ sent: targetIds.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to broadcast comment' });
  }
});
```

- [ ] **Step 2: Test with curl (select mode)**

```bash
curl -X POST http://localhost:4000/api/advisor/comments/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <advisor_jwt_token>" \
  -d '{"studentIds":["<student_id_1>","<student_id_2>"],"message":"Reminder: midterms next week."}'
```

Expected: `{ "sent": 2 }`

- [ ] **Step 3: Test with curl (filter mode)**

```bash
curl -X POST http://localhost:4000/api/advisor/comments/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <advisor_jwt_token>" \
  -d '{"filter":{"semester":3},"message":"Hello semester 3 students."}'
```

Expected: `{ "sent": N }` where N is the number of semester-3 students in the major.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/advisorSisRoutes.ts
git commit -m "feat: add POST /advisor/comments/broadcast endpoint"
```

---

## Task 4: Backend — GET /advisor/courses/all + fix POST /advisor/sections to accept isOpen

**Files:**
- Modify: `backend/src/api/advisorSisRoutes.ts`

- [ ] **Step 1: Add the GET /advisor/courses/all endpoint**

At the bottom of `backend/src/api/advisorSisRoutes.ts`, add:

```typescript
advisorSisRouter.get('/courses/all', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: { major: { select: { majorId: true, name: true } } },
      orderBy: [{ major: { name: 'asc' } }, { code: 'asc' }],
    });
    res.json(courses);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});
```

- [ ] **Step 2: Update POST /advisor/sections to accept isOpen**

In the existing `advisorSisRouter.post('/sections', ...)` handler (around line 194), the `prisma.section.create` call currently does not include `isOpen`. Update the destructuring and create call to accept it:

Change the destructuring line from:
```typescript
const {
  courseId,
  semester,
  instructorName,
  capacity,
  scheduleDays,
  scheduleStartTime,
  scheduleEndTime,
  scheduleRoom,
} = req.body;
```

To:
```typescript
const {
  courseId,
  semester,
  instructorName,
  capacity,
  scheduleDays,
  scheduleStartTime,
  scheduleEndTime,
  scheduleRoom,
  isOpen,
} = req.body;
```

And update the `prisma.section.create` data block to include `isOpen`:
```typescript
const section = await prisma.section.create({
  data: {
    courseId,
    majorId,
    advisorId: req.user!.id,
    semester,
    instructorName,
    capacity: Number(capacity),
    scheduleDays: scheduleDays || [],
    scheduleStartTime: scheduleStartTime || '',
    scheduleEndTime: scheduleEndTime || '',
    scheduleRoom: scheduleRoom || '',
    isOpen: isOpen !== undefined ? Boolean(isOpen) : false,
  },
});
```

- [ ] **Step 3: Test GET /advisor/courses/all with curl**

```bash
curl http://localhost:4000/api/advisor/courses/all \
  -H "Authorization: Bearer <advisor_jwt_token>"
```

Expected: JSON array of courses, each with `{ courseId, code, name, credits, major: { majorId, name }, ... }`.

- [ ] **Step 4: Test POST /advisor/sections with isOpen: true**

```bash
curl -X POST http://localhost:4000/api/advisor/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <advisor_jwt_token>" \
  -d '{"courseId":"<valid_course_id>","semester":"Fall 2025","instructorName":"Dr. Test","capacity":30,"scheduleDays":["Mon","Wed"],"scheduleStartTime":"09:00","scheduleEndTime":"10:30","scheduleRoom":"B201","isOpen":true}'
```

Expected: `201` with section object where `isOpen: true`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/advisorSisRoutes.ts
git commit -m "feat: add GET /advisor/courses/all endpoint and isOpen support in POST /advisor/sections"
```

---

## Task 5: Frontend API Client Functions

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add three functions to the ADVISOR SIS section**

In `frontend/lib/api.ts`, after the `getAdvisorComments` function (around line 433), add:

```typescript
export async function createAdvisorStudent(data: {
  name: string;
  email: string;
  studentNumber: string;
  phoneNumber: string;
  password: string;
  majorId: string;
  enrollmentYear: number;
  currentSemester: number;
}): Promise<any> {
  return fetchJSON('/advisor/students', { method: 'POST', body: JSON.stringify(data) });
}

export async function broadcastAdvisorComment(data: {
  studentIds?: string[];
  filter?: { semester?: number; gpaMin?: number; gpaMax?: number; driftStatus?: string };
  message: string;
}): Promise<{ sent: number }> {
  return fetchJSON('/advisor/comments/broadcast', { method: 'POST', body: JSON.stringify(data) });
}

export async function getAllCoursesForAdvisor(): Promise<any[]> {
  return fetchJSON('/advisor/courses/all');
}
```

- [ ] **Step 2: Verify TypeScript compiles without errors**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add advisor API client functions for new tabs"
```

---

## Task 6: Sidebar Icons + AdvisorLayout Navigation

**Files:**
- Modify: `frontend/components/Sidebar.tsx`
- Modify: `frontend/components/AdvisorLayout.tsx`

- [ ] **Step 1: Add three icon components to Sidebar.tsx**

At the bottom of `frontend/components/Sidebar.tsx` (after `SurveyIcon`), add:

```typescript
export function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function BookOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}
```

- [ ] **Step 2: Update AdvisorLayout.tsx imports and nav items**

Replace the entire content of `frontend/components/AdvisorLayout.tsx` with:

```typescript
'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import {
  Sidebar, HomeIcon, UsersIcon, LayersIcon, CalendarIcon,
  MessageIcon, UserIcon, SparkleIcon, UserPlusIcon, SendIcon, BookOpenIcon,
} from '@/components/Sidebar';

const mainItems = [
  { href: '/advisor/dashboard',           label: 'Dashboard',                icon: <HomeIcon /> },
  { href: '/advisor/students',            label: 'My Students',              icon: <UsersIcon /> },
  { href: '/advisor/sections',            label: 'Sections',                 icon: <LayersIcon /> },
  { href: '/advisor/enrollments',         label: 'Enrollments',              icon: <CalendarIcon /> },
  { href: '/advisor/comments',            label: 'Comments',                 icon: <MessageIcon /> },
  { href: '/advisor/student-information', label: 'Student Information',      icon: <UserIcon /> },
  { href: '/advisor/new-student',         label: 'New Student Registration', icon: <UserPlusIcon /> },
  { href: '/advisor/broadcast',           label: 'Broadcast Comments',       icon: <SendIcon /> },
  { href: '/advisor/course-offering',     label: 'Course Offering',          icon: <BookOpenIcon /> },
];

const intelligenceItems = [
  { href: '/advisor/sage', label: 'Sage AI', icon: <SparkleIcon /> },
];

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useMemo(() => getAuthUser(), []);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  return (
    <div className="sage-shell">
      <Sidebar items={mainItems} intelligenceItems={intelligenceItems} role="advisor" />
      <div className="sage-main">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles without errors**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/Sidebar.tsx frontend/components/AdvisorLayout.tsx
git commit -m "feat: add nav entries and icons for three new advisor tabs"
```

---

## Task 7: New Student Registration Page

**Files:**
- Create: `frontend/app/advisor/new-student/page.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/app/advisor/new-student/page.tsx` with the following content:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getMajors, createAdvisorStudent } from '@/lib/api';

export default function NewStudentPage() {
  const [majors, setMajors] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    studentNumber: '',
    phoneNumber: '',
    password: '',
    majorId: '',
    enrollmentYear: new Date().getFullYear(),
    currentSemester: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMajors().then(setMajors).catch(() => {});
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const student = await createAdvisorStudent({
        ...form,
        enrollmentYear: Number(form.enrollmentYear),
        currentSemester: Number(form.currentSemester),
      });
      setSuccess({ name: student.name, email: student.email });
      setForm({
        name: '',
        email: '',
        studentNumber: '',
        phoneNumber: '',
        password: '',
        majorId: '',
        enrollmentYear: new Date().getFullYear(),
        currentSemester: 1,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create student account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Student Registration</h1>
        <p className="text-gray-600 mt-1">
          Create a student account. The student can log in with their email and the password you set.
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="font-semibold text-green-800">Account created successfully</p>
          <p className="text-green-700 text-sm mt-1">
            <strong>{success.name}</strong> can now log in with <strong>{success.email}</strong>
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
          <input
            type="text"
            value={form.studentNumber}
            onChange={set('studentNumber')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lebanese Phone</label>
          <input
            type="tel"
            value={form.phoneNumber}
            onChange={set('phoneNumber')}
            required
            placeholder="+961XXXXXXXX"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
          <select
            value={form.majorId}
            onChange={set('majorId')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a major</option>
            {majors.map((m) => (
              <option key={m.majorId} value={m.majorId}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Year</label>
          <input
            type="number"
            value={form.enrollmentYear}
            onChange={set('enrollmentYear')}
            required
            min={2000}
            max={2100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Starting Semester</label>
          <select
            value={form.currentSemester}
            onChange={set('currentSemester')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>Semester {n}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Creating Account…' : 'Create Student Account'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Start the dev server and manually test the form in the browser**

```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:3000/advisor/new-student`. Fill in all fields and submit. Verify the green success banner appears and the form resets. Try submitting a duplicate email and verify the inline error appears.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/advisor/new-student/page.tsx
git commit -m "feat: add New Student Registration page for advisor"
```

---

## Task 8: Broadcast Comments Page

**Files:**
- Create: `frontend/app/advisor/broadcast/page.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/app/advisor/broadcast/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAdvisorStudents, broadcastAdvisorComment } from '@/lib/api';

type Mode = 'select' | 'filter';

const DRIFT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'on_track', label: 'On Track' },
  { value: 'early_warning', label: 'Early Warning' },
  { value: 'drifting', label: 'Drifting' },
  { value: 'critical', label: 'Critical' },
];

export default function BroadcastPage() {
  const [mode, setMode] = useState<Mode>('select');
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState({ semester: '', gpaMin: '', gpaMax: '', driftStatus: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdvisorStudents().then(setStudents).catch(() => {});
  }, []);

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentNumber || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const previewCount = (() => {
    if (mode === 'select') return selectedIds.size;
    let count = students.length;
    if (filter.semester) count = students.filter((s) => String(s.currentSemester) === filter.semester).length;
    if (filter.gpaMin || filter.gpaMax) {
      const min = filter.gpaMin ? Number(filter.gpaMin) : 0;
      const max = filter.gpaMax ? Number(filter.gpaMax) : 4;
      count = students.filter((s) => {
        const gpa = s.cumulativeGpa ?? 0;
        return gpa >= min && gpa <= max;
      }).length;
    }
    return count;
  })();

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.studentId)));
    }
  };

  const handleSend = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    if (mode === 'select' && selectedIds.size === 0) { setError('Select at least one student'); return; }
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const payload =
        mode === 'select'
          ? { studentIds: Array.from(selectedIds), message }
          : {
              filter: {
                ...(filter.semester ? { semester: Number(filter.semester) } : {}),
                ...(filter.gpaMin ? { gpaMin: Number(filter.gpaMin) } : {}),
                ...(filter.gpaMax ? { gpaMax: Number(filter.gpaMax) } : {}),
                ...(filter.driftStatus ? { driftStatus: filter.driftStatus } : {}),
              },
              message,
            };
      const res = await broadcastAdvisorComment(payload);
      setResult(res);
      setMessage('');
      setSelectedIds(new Set());
      setFilter({ semester: '', gpaMin: '', gpaMax: '', driftStatus: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Broadcast Comments</h1>
        <p className="text-gray-600 mt-1">Send a message to multiple students at once.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['select', 'filter'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); setResult(null); }}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {m === 'select' ? 'Select Students' : 'Filter Students'}
          </button>
        ))}
      </div>

      {mode === 'select' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search by name or student ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
              <input
                type="checkbox"
                checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                onChange={toggleAll}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-gray-600">
                {selectedIds.size} selected
              </span>
            </div>
            {filteredStudents.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No students found.</p>
            ) : (
              filteredStudents.map((s) => (
                <label key={s.studentId} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.studentId)}
                    onChange={() => toggleStudent(s.studentId)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{s.studentNumber}</span>
                  </div>
                  <span className="text-xs text-gray-400">Sem {s.currentSemester}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {mode === 'filter' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={filter.semester}
                onChange={(e) => setFilter({ ...filter, semester: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>Semester {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drift Status</label>
              <select
                value={filter.driftStatus}
                onChange={(e) => setFilter({ ...filter, driftStatus: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DRIFT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min GPA</label>
              <input
                type="number"
                min={0}
                max={4}
                step={0.1}
                value={filter.gpaMin}
                onChange={(e) => setFilter({ ...filter, gpaMin: e.target.value })}
                placeholder="0.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max GPA</label>
              <input
                type="number"
                min={0}
                max={4}
                step={0.1}
                value={filter.gpaMax}
                onChange={(e) => setFilter({ ...filter, gpaMax: e.target.value })}
                placeholder="4.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Estimated recipients: <strong>{previewCount}</strong> student{previewCount !== 1 ? 's' : ''}
            {filter.driftStatus ? ' (exact count depends on latest AI reports)' : ''}
          </p>
        </div>
      )}

      {/* Message + Send */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Write your message here…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3">
            <p className="text-green-800 text-sm font-medium">
              Message sent to {result.sent} student{result.sent !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Test in browser**

Navigate to `http://localhost:3000/advisor/broadcast`.

- Select mode: check a few students, write a message, click Send. Verify success banner shows `sent: N`.
- Filter mode: choose Semester 1, write a message, click Send. Verify success banner.
- Try sending with no message selected — verify the inline error "Message is required" appears.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/advisor/broadcast/page.tsx
git commit -m "feat: add Broadcast Comments page for advisor"
```

---

## Task 9: Course Offering Page

**Files:**
- Create: `frontend/app/advisor/course-offering/page.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/app/advisor/course-offering/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAllCoursesForAdvisor, createAdvisorSection } from '@/lib/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

type OfferForm = {
  instructorName: string;
  scheduleDays: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleRoom: string;
  capacity: string;
  semester: string;
};

const EMPTY_FORM: OfferForm = {
  instructorName: '',
  scheduleDays: [],
  scheduleStartTime: '',
  scheduleEndTime: '',
  scheduleRoom: '',
  capacity: '',
  semester: '',
};

export default function CourseOfferingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllCoursesForAdvisor()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const majors = Array.from(new Map(courses.map((c) => [c.major.majorId, c.major.name])).entries()).map(
    ([id, name]) => ({ id, name })
  );

  const filtered = courses.filter((c) => {
    const matchesSearch =
      !search ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase());
    const matchesMajor = !majorFilter || c.major.majorId === majorFilter;
    return matchesSearch && matchesMajor;
  });

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      scheduleDays: f.scheduleDays.includes(day)
        ? f.scheduleDays.filter((d) => d !== day)
        : [...f.scheduleDays, day],
    }));
  };

  const handleOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (form.scheduleDays.length === 0) { setError('Select at least one schedule day'); return; }
    if (form.scheduleEndTime <= form.scheduleStartTime) { setError('End time must be after start time'); return; }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await createAdvisorSection({
        courseId: selectedCourse.courseId,
        semester: form.semester,
        instructorName: form.instructorName,
        capacity: Number(form.capacity),
        scheduleDays: form.scheduleDays,
        scheduleStartTime: form.scheduleStartTime,
        scheduleEndTime: form.scheduleEndTime,
        scheduleRoom: form.scheduleRoom,
        isOpen: true,
      });
      setSuccess(`${selectedCourse.code} — ${selectedCourse.name} is now open for registration.`);
      setSelectedCourse(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err.message || 'Failed to create offering');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Course Offering</h1>
        <p className="text-gray-600 mt-1">Select a course from the catalog and open it for student registration.</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="text-green-800 font-medium">{success}</p>
          <p className="text-green-700 text-sm mt-1">Students can now request enrollment from their registration page.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by code or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={majorFilter}
          onChange={(e) => setMajorFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Majors</option>
          {majors.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Course Table */}
      {loading ? (
        <p className="text-gray-500">Loading courses…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Course Name</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Credits</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Major</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No courses found.</td>
                  </tr>
                ) : (
                  filtered.map((course) => (
                    <tr key={course.courseId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{course.code}</td>
                      <td className="py-3 px-4">{course.name}</td>
                      <td className="py-3 px-4 text-center">{course.credits}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{course.major.name}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => { setSelectedCourse(course); setError(null); setSuccess(null); setForm(EMPTY_FORM); }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Offer This Course
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offering Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Offer Course</h2>
              <p className="text-gray-600 text-sm mt-1">
                {selectedCourse.code} — {selectedCourse.name}
              </p>
            </div>

            <form onSubmit={handleOffer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Name</label>
                <input
                  type="text"
                  value={form.instructorName}
                  onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.scheduleDays.includes(day)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.scheduleStartTime}
                    onChange={(e) => setForm({ ...form, scheduleStartTime: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.scheduleEndTime}
                    onChange={(e) => setForm({ ...form, scheduleEndTime: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input
                  type="text"
                  value={form.scheduleRoom}
                  onChange={(e) => setForm({ ...form, scheduleRoom: e.target.value })}
                  required
                  placeholder="e.g. A101"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  required
                  min={1}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <input
                  type="text"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  required
                  placeholder="e.g. Fall 2025"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? 'Offering…' : 'Open for Registration'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedCourse(null); setError(null); }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Test in browser**

Navigate to `http://localhost:3000/advisor/course-offering`.

- Verify the course table loads all courses from all majors.
- Use the search bar and major filter — verify filtering works.
- Click "Offer This Course" on any row — verify the modal opens with the course name in the header.
- Fill in all fields and click "Open for Registration". Verify the modal closes and the green success banner appears.
- Go to the Sections tab and verify the new section appears there with `isOpen: true`.
- Try submitting the modal with no days selected — verify the inline error "Select at least one schedule day" appears.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/advisor/course-offering/page.tsx
git commit -m "feat: add Course Offering page for advisor"
```

---

## Done

All three tabs are implemented and committed. Verify end-to-end:

1. Log in as an advisor. Confirm three new sidebar items appear.
2. Create a student via New Student Registration. Log out, log in as that student — confirm it works.
3. Send a broadcast comment. Log in as a recipient student, go to Comments — confirm the message appears.
4. Offer a course. Log in as a student whose program includes that course, go to Registration — confirm the section is visible to request.
