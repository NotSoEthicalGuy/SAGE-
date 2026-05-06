/**
 * SAGE — Student SIS Routes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireSelf } from '../middleware/auth';

export const studentSisRouter = Router();

studentSisRouter.get('/profile', requireSelf, async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { studentId: req.user!.id },
      include: { major: true, advisor: { select: { advisorId: true, name: true, email: true } } },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

studentSisRouter.get('/schedule', requireSelf, async (req, res) => {
  try {
    const studentId = req.user!.id;

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { majorId: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [enrollments, allSections] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId, status: { notIn: ['dropped', 'completed'] } },
        include: { course: true, section: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.section.findMany({
        where: { isOpen: true },
        include: { course: { include: { major: { select: { majorId: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const enrolledSectionIds = new Set(enrollments.map(e => e.sectionId).filter(Boolean));
    const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));

    // Exclude sections already enrolled in (by section or course)
    const availableSections = allSections.filter(
      s => !enrolledSectionIds.has(s.sectionId) && !enrolledCourseIds.has(s.courseId)
    );

    res.json({
      availableSections,
      registeredCourses: enrollments,
      studentMajorId: student.majorId,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

studentSisRouter.post('/enrollments/batch', requireSelf, async (req, res) => {
  try {
    const { sectionIds } = req.body;
    if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
      return res.status(400).json({ error: 'sectionIds must be a non-empty array' });
    }

    const studentId = req.user!.id;

    const [sections, student, completedEnrollments] = await Promise.all([
      prisma.section.findMany({
        where: { sectionId: { in: sectionIds } },
        include: { course: true },
      }),
      prisma.student.findUnique({
        where: { studentId },
        select: { currentSemester: true },
      }),
      prisma.enrollment.findMany({
        where: { studentId, finalGrade: { not: null } },
        include: { course: { select: { code: true } } },
      }),
    ]);

    if (sections.length !== sectionIds.length) {
      return res.status(400).json({ error: 'One or more sections not found' });
    }

    // Check each section is open and has capacity
    for (const section of sections) {
      if (!section.isOpen) {
        return res.status(400).json({ error: `${section.course.code}: section is closed for registration` });
      }
      if (section.enrolledCount >= section.capacity) {
        return res.status(400).json({ error: `${section.course.code}: section is at full capacity` });
      }
    }

    // Check prerequisites against student's completed courses
    const completedCodes = new Set(
      completedEnrollments
        .filter(e => (e.finalGrade ?? 0) >= 60)
        .map(e => e.course.code.toLowerCase())
    );
    const prereqErrors: string[] = [];
    for (const section of sections) {
      for (const prereq of section.course.prerequisites) {
        if (!completedCodes.has(prereq.toLowerCase())) {
          prereqErrors.push(`${section.course.code} requires ${prereq}`);
        }
      }
    }
    if (prereqErrors.length > 0) {
      return res.status(400).json({ error: 'Prerequisite not met', details: prereqErrors });
    }

    // Create all enrollments as pending in a transaction
    const year = new Date().getFullYear();
    const semester = student?.currentSemester ?? 1;
    const enrollments = await prisma.$transaction(
      sections.map(section =>
        prisma.enrollment.create({
          data: {
            studentId,
            sectionId: section.sectionId,
            courseId: section.courseId,
            semester,
            year,
            status: 'pending',
            requestedAt: new Date(),
          },
        })
      )
    );

    res.status(201).json({
      enrollments,
      message: 'Registration submitted. Awaiting advisor approval.',
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit registration' });
  }
});

studentSisRouter.get('/pos', requireSelf, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { studentId: req.user!.id },
      select: { majorId: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [program, enrollments, major] = await Promise.all([
      prisma.programOfStudyItem.findMany({
        where: { majorId: student.majorId },
        include: { course: true },
        orderBy: [{ semester: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.enrollment.findMany({
        where: { studentId: req.user!.id },
        include: { course: true },
      }),
      prisma.major.findUnique({ where: { majorId: student.majorId } }),
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
      majorId: student.majorId,
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

studentSisRouter.get('/grades', requireSelf, async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id, finalGrade: { not: null } },
      include: { course: true, section: true },
      orderBy: [{ year: 'asc' }, { semester: 'asc' }],
    });
    res.json(enrollments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

studentSisRouter.get('/exams', requireSelf, async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: { course: true, section: true },
    });
    const exams = enrollments
      .filter((enrollment) => enrollment.section?.finalExamDate)
      .map((enrollment) => ({
        course: enrollment.course,
        section: enrollment.section,
      }));
    res.json(exams);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

studentSisRouter.get('/payments', requireSelf, async (req, res) => {
  try {
    const slips = await prisma.paymentSlip.findMany({
      where: { studentId: req.user!.id },
      orderBy: { dueDate: 'asc' },
    });
    res.json(slips);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

studentSisRouter.get('/payments/:paymentSlipId/pdf', requireSelf, async (req, res) => {
  try {
    const slip = await prisma.paymentSlip.findUnique({
      where: { paymentSlipId: req.params.paymentSlipId },
    });
    if (!slip || slip.studentId !== req.user!.id) {
      return res.status(404).json({ error: 'Payment slip not found' });
    }
    if (!slip.pdfUrl) return res.status(404).json({ error: 'PDF not available' });
    return res.redirect(slip.pdfUrl);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment PDF' });
  }
});

studentSisRouter.get('/comments', requireSelf, async (req, res) => {
  try {
    const comments = await prisma.advisorComment.findMany({
      where: { studentId: req.user!.id },
      include: { advisor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

studentSisRouter.put('/comments/:commentId/read', requireSelf, async (req, res) => {
  try {
    const comment = await prisma.advisorComment.update({
      where: { commentId: req.params.commentId },
      data: { isRead: true },
    });
    if (comment.studentId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(comment);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Comment not found' });
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

studentSisRouter.post('/enrollments', requireSelf, async (req, res) => {
  try {
    const { sectionId } = req.body;
    if (!sectionId) {
      return res.status(400).json({ error: 'sectionId is required' });
    }

    const [section, student] = await Promise.all([
      prisma.section.findUnique({
        where: { sectionId },
        select: { courseId: true, isOpen: true, capacity: true, enrolledCount: true },
      }),
      prisma.student.findUnique({
        where: { studentId: req.user!.id },
        select: { currentSemester: true },
      }),
    ]);

    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (!section.isOpen) return res.status(400).json({ error: 'Section is not open for registration' });
    if (section.enrolledCount >= section.capacity) {
      return res.status(400).json({ error: 'Section is at full capacity' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: req.user!.id,
        sectionId,
        courseId: section.courseId,
        semester: student?.currentSemester ?? 1,
        year: new Date().getFullYear(),
        status: 'pending',
        requestedAt: new Date(),
      },
    });
    res.status(201).json(enrollment);
  } catch (e) {
    res.status(500).json({ error: 'Failed to request registration' });
  }
});

studentSisRouter.delete('/enrollments/:enrollmentId', requireSelf, async (req, res) => {
  try {
    const enrollment = await prisma.enrollment.findUnique({ where: { enrollmentId: req.params.enrollmentId } });
    if (!enrollment || enrollment.studentId !== req.user!.id) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const updated = await prisma.enrollment.update({
      where: { enrollmentId: req.params.enrollmentId },
      data: { status: 'dropped' },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to drop enrollment' });
  }
});
