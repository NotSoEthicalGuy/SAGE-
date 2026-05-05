/**
 * SAGE — Advisor SIS Routes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { detectPrerequisiteViolations } from '../services/prerequisiteService';

export const advisorSisRouter = Router();

async function getAdvisorMajorId(advisorId: string) {
  const advisor = await prisma.advisor.findUnique({
    where: { advisorId },
    select: { majorId: true },
  });
  return advisor?.majorId || null;
}

function computeStanding(gpa: number | null): { standing: string; label: string; colorKey: string } {
  const g = gpa ?? 0;
  if (g >= 3.7) return { standing: 'deans_list', label: "Dean's List", colorKey: 'dark' };
  if (g >= 2.0) return { standing: 'good', label: 'Good Standing', colorKey: 'green' };
  if (g >= 1.5) return { standing: 'warning', label: 'Academic Warning', colorKey: 'amber' };
  return { standing: 'probation', label: 'Academic Probation', colorKey: 'red' };
}

advisorSisRouter.get('/students', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.json([]);

    const students = await prisma.student.findMany({
      where: { majorId, isActive: true },
      include: { major: true, advisor: { select: { advisorId: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

advisorSisRouter.get('/students/by-id/:studentId', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const advisorMajorId = await getAdvisorMajorId(req.user!.id);
    if (!advisorMajorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

    const student = await prisma.student.findUnique({
      where: { studentId: req.params.studentId },
      select: {
        studentId: true,
        studentNumber: true,
        name: true,
        email: true,
        isActive: true,
        majorId: true,
        major: { select: { majorId: true, name: true } },
        advisor: { select: { advisorId: true, name: true } },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const activeRegistrationCount = await prisma.enrollment.count({
      where: {
        studentId: student.studentId,
        status: { in: ['registered', 'approved', 'in_progress', 'pending'] },
      },
    });

    res.json({
      ...student,
      majorMatch: student.majorId === advisorMajorId,
      isRegistered: activeRegistrationCount > 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to lookup student' });
  }
});

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

advisorSisRouter.get('/students/:studentId/history', requireRole('advisor'), async (req, res) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.params.studentId },
      include: { course: true, section: true },
      orderBy: [{ year: 'asc' }, { semester: 'asc' }],
    });
    res.json(enrollments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch academic history' });
  }
});

advisorSisRouter.get('/students/:studentId/pos', requireRole('advisor'), async (req, res) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

    const student = await prisma.student.findUnique({
      where: { studentId: req.params.studentId },
      select: { majorId: true },
    });
    if (!student || student.majorId !== majorId) return res.status(404).json({ error: 'Student not found' });

    const [program, enrollments, major] = await Promise.all([
      prisma.programOfStudyItem.findMany({
        where: { majorId },
        include: { course: true },
        orderBy: [{ semester: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.enrollment.findMany({
        where: { studentId: req.params.studentId },
        include: { course: true },
      }),
      prisma.major.findUnique({ where: { majorId } }),
    ]);

    const statusByCourse = new Map<string, string>();
    for (const enrollment of enrollments) {
      if (enrollment.finalGrade !== null || enrollment.status === 'completed') {
        statusByCourse.set(enrollment.courseId, 'completed');
      } else if (['in_progress', 'registered', 'approved', 'pending'].includes(enrollment.status)) {
        statusByCourse.set(enrollment.courseId, 'in_progress');
      }
    }

    const completed: any[] = [];
    const inProgress: any[] = [];
    const remaining: any[] = [];
    let completedCredits = 0;
    let inProgressCredits = 0;
    let remainingCredits = 0;

    for (const item of program) {
      const status = statusByCourse.get(item.courseId);
      if (status === 'completed') {
        completed.push(item);
        completedCredits += item.course.credits;
      } else if (status === 'in_progress') {
        inProgress.push(item);
        inProgressCredits += item.course.credits;
      } else {
        remaining.push(item);
        remainingCredits += item.course.credits;
      }
    }

    res.json({
      majorId,
      minimumCredits: major?.minimumCredits ?? 90,
      completed,
      inProgress,
      remaining,
      totals: { completedCredits, inProgressCredits, remainingCredits },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch program of study' });
  }
});

advisorSisRouter.get('/sections', requireRole('advisor'), async (req, res) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.json([]);

    const sections = await prisma.section.findMany({
      where: { majorId },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sections);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

advisorSisRouter.post('/sections', requireRole('advisor'), async (req, res) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });

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

    if (!courseId || !semester || !instructorName || !capacity) {
      return res.status(400).json({ error: 'courseId, semester, instructorName, and capacity are required' });
    }

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
        isOpen: isOpen !== undefined ? Boolean(isOpen) : true,
      },
    });
    res.status(201).json(section);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to create section' });
  }
});

advisorSisRouter.put('/sections/:id', requireRole('advisor'), async (req, res) => {
  try {
    const { instructorName, capacity, scheduleDays, scheduleStartTime, scheduleEndTime, scheduleRoom } = req.body;
    const section = await prisma.section.update({
      where: { sectionId: req.params.id },
      data: {
        instructorName,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        scheduleDays,
        scheduleStartTime,
        scheduleEndTime,
        scheduleRoom,
      },
    });
    res.json(section);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Section not found' });
    res.status(500).json({ error: 'Failed to update section' });
  }
});

advisorSisRouter.put('/sections/:id/open', requireRole('advisor'), async (req, res) => {
  try {
    const { isOpen } = req.body;
    const section = await prisma.section.update({
      where: { sectionId: req.params.id },
      data: { isOpen: isOpen !== undefined ? Boolean(isOpen) : undefined },
    });
    res.json(section);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Section not found' });
    res.status(500).json({ error: 'Failed to update section' });
  }
});

advisorSisRouter.put('/sections/:id/exam', requireRole('advisor'), async (req, res) => {
  try {
    const { finalExamDate, finalExamTime, finalExamRoom } = req.body;
    const section = await prisma.section.update({
      where: { sectionId: req.params.id },
      data: {
        finalExamDate: finalExamDate ? new Date(finalExamDate) : undefined,
        finalExamTime,
        finalExamRoom,
      },
    });
    res.json(section);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Section not found' });
    res.status(500).json({ error: 'Failed to update exam schedule' });
  }
});

advisorSisRouter.get('/enrollments', requireRole('advisor'), async (req, res) => {
  try {
    const majorId = await getAdvisorMajorId(req.user!.id);
    if (!majorId) return res.json([]);

    const enrollments = await prisma.enrollment.findMany({
      where: { course: { majorId } },
      include: { student: true, course: true, section: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(enrollments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

advisorSisRouter.put('/enrollments/:id/approve', requireRole('advisor'), async (req, res) => {
  try {
    const enrollment = await prisma.enrollment.update({
      where: { enrollmentId: req.params.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user!.id,
      },
    });
    res.json(enrollment);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Enrollment not found' });
    res.status(500).json({ error: 'Failed to approve enrollment' });
  }
});

advisorSisRouter.post('/enrollments', requireRole('advisor'), async (req, res) => {
  try {
    const { studentId, sectionId, courseId, semester, year } = req.body;
    if (!studentId || !sectionId || !courseId || !semester || !year) {
      return res.status(400).json({ error: 'studentId, sectionId, courseId, semester, and year are required' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        sectionId,
        courseId,
        semester: Number(semester),
        year: Number(year),
        status: 'registered',
        approvedAt: new Date(),
        approvedBy: req.user!.id,
      },
    });
    res.status(201).json(enrollment);
  } catch (e) {
    res.status(500).json({ error: 'Failed to register enrollment' });
  }
});

advisorSisRouter.put('/enrollments/:id/attendance', requireRole('advisor'), async (req, res) => {
  try {
    const { records } = req.body; // [{ date, status }]
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records must be an array' });
    }

    await prisma.enrollmentAttendance.deleteMany({ where: { enrollmentId: req.params.id } });
    await prisma.enrollmentAttendance.createMany({
      data: records.map((record: any) => ({
        enrollmentId: req.params.id,
        date: new Date(record.date),
        status: record.status,
      })),
    });

    res.json({ status: 'updated' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

advisorSisRouter.post('/comments', requireRole('advisor'), async (req, res) => {
  try {
    const { studentId, message } = req.body;
    if (!studentId || !message) return res.status(400).json({ error: 'studentId and message are required' });

    const comment = await prisma.advisorComment.create({
      data: { advisorId: req.user!.id, studentId, message },
    });
    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: 'Failed to send comment' });
  }
});

advisorSisRouter.get('/comments/:studentId', requireRole('advisor'), async (req, res) => {
  try {
    const comments = await prisma.advisorComment.findMany({
      where: { studentId: req.params.studentId, advisorId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

advisorSisRouter.post('/students', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const { name, email, studentNumber, phoneNumber, password, majorId, enrollmentYear, currentSemester } = req.body;
    if (!name || !email || !studentNumber || !phoneNumber || !password || !majorId || !enrollmentYear) {
      return res.status(400).json({ error: 'name, email, studentNumber, phoneNumber, password, majorId, and enrollmentYear are required' });
    }
    if (!/^S\d{7}$/.test(studentNumber)) {
      return res.status(400).json({ error: 'Student ID must start with S followed by exactly 7 digits (e.g. S1234567)' });
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

advisorSisRouter.post('/comments/broadcast', requireRole('advisor'), async (req: Request, res: Response) => {
  try {
    const { studentIds, filter, message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const advisorId = req.user!.id;
    let targetIds: string[] = [];

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const majorId = await getAdvisorMajorId(advisorId);
      if (!majorId) return res.status(403).json({ error: 'Advisor has no major assigned' });
      const owned = await prisma.student.findMany({
        where: { studentId: { in: studentIds }, majorId, isActive: true },
        select: { studentId: true },
      });
      targetIds = owned.map((s) => s.studentId);
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
