# Advisor New Tabs — Design Spec
**Date:** 2026-05-02
**Status:** Approved

---

## Overview

Add three new tabs to the SAGE advisor interface:
1. **New Student Registration** — advisor creates student login accounts
2. **Broadcast Comments** — advisor sends one-way messages to selected or filtered students
3. **Course Offering** — advisor opens university courses for student registration with schedule and capacity

All data is persisted in PostgreSQL via Prisma. No local state shortcuts.

---

## 1. Navigation & Routing

Three new entries added to `AdvisorLayout.tsx` sidebar, after existing tabs:

| Tab Label | Route | Icon |
|---|---|---|
| New Student Registration | `/advisor/new-student` | `UserPlus` |
| Broadcast Comments | `/advisor/broadcast` | `MessageSquare` |
| Course Offering | `/advisor/course-offering` | `BookOpen` |

**New files:**
- `frontend/app/advisor/new-student/page.tsx`
- `frontend/app/advisor/broadcast/page.tsx`
- `frontend/app/advisor/course-offering/page.tsx`

---

## 2. New Student Registration

### UI
A single form page. Fields:

| Field | Type | Validation |
|---|---|---|
| Full Name | Text | Required |
| Email | Email | Required, unique |
| Student ID | Text | Required, unique |
| Lebanese Phone | Text | Required, format +961XXXXXXXX |
| Password | Password | Required |
| Major | Dropdown | All majors in university |
| Enrollment Year | Number | Required, e.g. 2024 |
| Starting Semester | Dropdown | 1–8 |

On success: confirmation message with student name and login email.
On failure: inline error (duplicate email or student ID).

### Backend
**New endpoint:** `POST /api/advisor/students`
- Auth: advisor role required
- Mirrors `POST /api/admin/students` logic
- Hashes password with bcrypt before storing
- Creates `Student` record in PostgreSQL with all provided fields
- Returns the created student (without passwordHash)

**Schema change required:** Add `phoneNumber String? @map("phone_number")` to the `Student` model in `schema.prisma` and run a Prisma migration. This is the only schema change in the entire feature set.

---

## 3. Broadcast Comments

### UI
Two modes, toggled at the top of the page:

**Mode 1 — Select Students**
- Searchable checklist of all students in the advisor's major
- Search by name or student ID
- Checkboxes for individual selection

**Mode 2 — Filter Students**
- Semester dropdown (1–8)
- GPA range (min/max number inputs)
- Drift status dropdown (on_track, drifting, early_warning, critical)
- Live preview: "X students will receive this message"

Both modes share:
- Message textarea (required)
- Send button

### Backend
**New endpoint:** `POST /api/advisor/comments/broadcast`
- Auth: advisor role required
- Accepts one of two body shapes:
  ```json
  { "studentIds": ["id1", "id2"], "message": "..." }
  ```
  or
  ```json
  { "filter": { "semester": 3, "gpaMin": 2.0, "gpaMax": 4.0, "driftStatus": "drifting" }, "message": "..." }
  ```
- When `filter` is provided, backend resolves matching student IDs via Prisma query
- Inserts one `AdvisorComment` row per student using `prisma.advisorComment.createMany()`
- Returns count of messages sent

**No schema changes required** — uses existing `AdvisorComment` table.

Students see broadcast messages in their existing comments view, identical to direct comments.

---

## 4. Course Offering

### UI

**Part 1 — Course Catalog Browser**
- Table of all courses across all majors in the university
- Columns: Course Code, Course Name, Credits, Major
- Search by name or code
- Filter by major (dropdown)
- Each row: "Offer This Course" button

**Part 2 — Offering Modal**
Opens when advisor clicks "Offer This Course":

| Field | Type | Validation |
|---|---|---|
| Instructor Name | Text | Required |
| Schedule Days | Multi-select | Mon/Tue/Wed/Thu/Fri |
| Start Time | Time picker | Required |
| End Time | Time picker | Required, must be after start |
| Room | Text | Required |
| Capacity | Number | Required, > 0 |
| Semester | Text | Required, e.g. "Fall 2025" |

On confirm: creates the section, closes modal, shows success toast.

### Backend

**New endpoint:** `GET /api/advisor/courses/all`
- Auth: advisor role required
- Returns all courses across all majors (with major name included)
- Used to populate the course catalog browser

**Reused endpoint:** `POST /api/advisor/sections` (already exists)
- Called with `isOpen: true` so the section is immediately open for registration

**No schema changes required** — existing `Section` model covers all offering fields.

### Student Registration Flow
1. Student visits registration page — sees offered sections where the course is in their program of study
2. Student submits enrollment request → `POST /api/student/enrollments` → status: `pending`
3. Advisor approves in existing **Enrollments** tab → status: `approved` / `registered`
4. Approved course appears in student's schedule
5. If course is NOT in student's program of study, advisor registers it manually via the existing Enrollments tab

---

## 5. What's Not Changing

- Existing Sections tab — untouched, still used for managing already-created sections
- Existing Enrollments tab — untouched, still the approval workflow
- Existing Comments tab — untouched, still shows individual student comments
- Student schedule/registration pages — no changes needed; they already consume sections with `isOpen: true`
- Auth system — no changes

---

## 6. Implementation Summary

| Area | Changes |
|---|---|
| `AdvisorLayout.tsx` | Add 3 nav entries |
| `advisor/new-student/page.tsx` | New form page |
| `advisor/broadcast/page.tsx` | New broadcast page |
| `advisor/course-offering/page.tsx` | New offering page |
| `advisorRoutes.ts` or `advisorSisRoutes.ts` | Add 3 new endpoints |
| `lib/api.ts` (frontend) | Add 3 new API client functions |
| Prisma schema | Add `phoneNumber String?` to Student model + run migration |
