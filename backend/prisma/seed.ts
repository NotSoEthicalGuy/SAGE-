/**
 * SAGE — Database Seed Script (v2 — with advisors and role accounts)
 * Run with: npx ts-node prisma/seed.ts
 * Or:       npx prisma db seed
 */

import { PrismaClient, EnrollmentStatus, ExamType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function gradeToLetter(g: number): string {
  if (g >= 90) return 'A';
  if (g >= 85) return 'A-';
  if (g >= 80) return 'B+';
  if (g >= 75) return 'B';
  if (g >= 70) return 'B-';
  if (g >= 65) return 'C+';
  if (g >= 60) return 'C';
  if (g >= 55) return 'C-';
  if (g >= 50) return 'D';
  return 'F';
}

function calcGpa(grades: number[]): number {
  const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
  return Math.round((avg / 25) * 100) / 100;
}

async function main() {
  console.log('🌱 Seeding SAGE database (v2)...\n');

  // Wipe all data in correct dependency order
  await prisma.enrollmentAttendance.deleteMany();
  await prisma.advisorComment.deleteMany();
  await prisma.paymentSlip.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.courseSkill.deleteMany();
  await prisma.courseMaterial.deleteMany();
  await prisma.aIReport.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.programOfStudyItem.deleteMany();
  await prisma.interventionOutcome.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.triageRun.deleteMany();
  await prisma.studentPlan.deleteMany();
  await prisma.degreeRequirement.deleteMany();
  await prisma.appointmentRequest.deleteMany();
  await prisma.studentFlag.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.major.deleteMany();
  await prisma.advisor.deleteMany();

  // ─────────────────────────────────────────────
  // MAJORS
  // ─────────────────────────────────────────────

  const cs = await prisma.major.create({
    data: {
      name: 'Computer Science',
      faculty: 'Faculty of Engineering',
      totalCredits: 120,
      description:
        'The Computer Science program covers foundations of programming, algorithms, ' +
        'data structures, software engineering, operating systems, databases, networking, ' +
        'and AI. Students are expected to develop strong mathematical reasoning and ' +
        'problem-solving skills. Core competencies include systems thinking, ' +
        'algorithmic design, and software development.',
    },
  });

  const business = await prisma.major.create({
    data: {
      name: 'Business Administration',
      faculty: 'Faculty of Business',
      totalCredits: 110,
      description:
        'Business Administration develops students in management, finance, marketing, ' +
        'operations, and organizational behavior. Strong emphasis on analytical thinking, ' +
        'communication, and leadership. Students explore entrepreneurship, strategy, ' +
        'and global markets.',
    },
  });

  // ─────────────────────────────────────────────
  // ADVISORS (assigned to majors)
  // ─────────────────────────────────────────────

  const advisor1 = await prisma.advisor.create({
    data: {
      name: 'Dr. Sarah Mitchell',
      email: 'advisor1@sage.edu',
      passwordHash: await bcrypt.hash('advisor123', 10),
      majorId: cs.majorId, // Computer Science advisor
    },
  });

  const advisor2 = await prisma.advisor.create({
    data: {
      name: 'Prof. James Harrington',
      email: 'advisor2@sage.edu',
      passwordHash: await bcrypt.hash('advisor123', 10),
      majorId: business.majorId, // Business Administration advisor
    },
  });

  console.log('✅ Majors and Advisors created');
  console.log('   admin@sage.edu (admin123)');
  console.log('   advisor1@sage.edu (advisor123) - Computer Science');
  console.log('   advisor2@sage.edu (advisor123) - Business Administration');
  console.log('   student demo password: student123');

  const design = await prisma.major.create({
    data: {
      name: 'Graphic Design',
      faculty: 'Faculty of Fine Arts',
      totalCredits: 105,
      description:
        'Graphic Design combines visual communication, typography, digital tools, ' +
        'branding, and user experience design. Students develop creative portfolios ' +
        'and technical proficiency in industry tools. Strong emphasis on visual ' +
        'storytelling and design thinking.',
    },
  });

  console.log('✅ Majors created');

  // ─────────────────────────────────────────────
  // COURSES — COMPUTER SCIENCE
  // ─────────────────────────────────────────────

  const cs101 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS101', name: 'Introduction to Programming', credits: 3, semesterOffered: 1, difficultyLevel: 1, topicsCovered: ['Variables', 'Control Flow', 'Functions', 'Loops', 'Basic I/O'], syllabusText: 'Introduction to Python programming. Covers variables, data types, conditionals, loops, and functions.', prerequisites: [] } });
  const cs102 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS102', name: 'Discrete Mathematics', credits: 3, semesterOffered: 1, difficultyLevel: 2, topicsCovered: ['Logic', 'Proofs', 'Sets', 'Graph Theory', 'Combinatorics'], syllabusText: 'Mathematical foundations for CS: logic, proof techniques, set theory, relations, functions, graphs.', prerequisites: [] } });
  const cs201 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS201', name: 'Data Structures', credits: 3, semesterOffered: 2, difficultyLevel: 3, topicsCovered: ['Arrays', 'Linked Lists', 'Trees', 'Heaps', 'Hash Tables', 'Graphs'], syllabusText: 'Core data structures with emphasis on time/space complexity analysis.', prerequisites: ['CS101'] } });
  const cs202 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS202', name: 'Algorithms', credits: 3, semesterOffered: 3, difficultyLevel: 4, topicsCovered: ['Sorting', 'Searching', 'Dynamic Programming', 'Greedy Algorithms', 'Complexity'], syllabusText: 'Algorithm design and analysis: divide and conquer, dynamic programming, greedy, graph algorithms.', prerequisites: ['CS201', 'CS102'] } });
  const cs301 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS301', name: 'Operating Systems', credits: 3, semesterOffered: 4, difficultyLevel: 4, topicsCovered: ['Processes', 'Threads', 'Memory Management', 'File Systems', 'Scheduling'], syllabusText: 'OS concepts: process management, scheduling, memory management, file systems.', prerequisites: ['CS201'] } });
  const cs302 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS302', name: 'Database Systems', credits: 3, semesterOffered: 4, difficultyLevel: 3, topicsCovered: ['SQL', 'ER Modeling', 'Normalization', 'Transactions', 'Query Optimization'], syllabusText: 'Relational database design, SQL, normalization, indexing, and transactions.', prerequisites: [] } });
  const cs401 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS401', name: 'Software Engineering', credits: 3, semesterOffered: 5, difficultyLevel: 3, topicsCovered: ['SDLC', 'Agile', 'Design Patterns', 'Testing', 'Version Control'], syllabusText: 'Software development lifecycle, Agile/Scrum, design patterns, testing strategies.', prerequisites: [] } });
  const cs402 = await prisma.course.create({ data: { majorId: cs.majorId, code: 'CS402', name: 'Machine Learning', credits: 3, semesterOffered: 6, difficultyLevel: 5, topicsCovered: ['Regression', 'Classification', 'Neural Networks', 'Clustering', 'Model Evaluation'], syllabusText: 'Supervised and unsupervised learning, neural networks, and practical ML with Python.', prerequisites: ['CS202'] } });

  // ─────────────────────────────────────────────
  // COURSES — BUSINESS
  // ─────────────────────────────────────────────

  const bus101 = await prisma.course.create({ data: { majorId: business.majorId, code: 'BUS101', name: 'Principles of Management', credits: 3, semesterOffered: 1, difficultyLevel: 1, topicsCovered: ['Planning', 'Organizing', 'Leadership', 'Control', 'Motivation'], syllabusText: 'Foundations of management: structures, leadership theories, planning, decision-making.', prerequisites: [] } });
  const bus102 = await prisma.course.create({ data: { majorId: business.majorId, code: 'BUS102', name: 'Financial Accounting', credits: 3, semesterOffered: 1, difficultyLevel: 2, topicsCovered: ['Balance Sheet', 'Income Statement', 'Journal Entries', 'GAAP', 'Cash Flow'], syllabusText: 'Introduction to financial accounting: recording transactions, preparing financial statements.', prerequisites: [] } });
  const bus201 = await prisma.course.create({ data: { majorId: business.majorId, code: 'BUS201', name: 'Marketing Fundamentals', credits: 3, semesterOffered: 2, difficultyLevel: 2, topicsCovered: ['4Ps', 'Market Research', 'Consumer Behavior', 'Branding', 'Digital Marketing'], syllabusText: 'Core marketing concepts: the marketing mix, consumer psychology, branding strategy.', prerequisites: [] } });
  const bus202 = await prisma.course.create({ data: { majorId: business.majorId, code: 'BUS202', name: 'Business Statistics', credits: 3, semesterOffered: 2, difficultyLevel: 3, topicsCovered: ['Descriptive Stats', 'Probability', 'Regression', 'Hypothesis Testing'], syllabusText: 'Statistical tools for business decisions: probability, sampling, regression.', prerequisites: [] } });
  const bus301 = await prisma.course.create({ data: { majorId: business.majorId, code: 'BUS301', name: 'Corporate Finance', credits: 3, semesterOffered: 3, difficultyLevel: 4, topicsCovered: ['Valuation', 'Capital Structure', 'Risk', 'Investment', 'Financial Modeling'], syllabusText: 'Corporate financial management: capital budgeting, valuation, risk management.', prerequisites: ['BUS102'] } });
  const bus302 = await prisma.course.create({ data: { majorId: business.majorId, code: 'BUS302', name: 'Organizational Behavior', credits: 3, semesterOffered: 3, difficultyLevel: 2, topicsCovered: ['Motivation', 'Group Dynamics', 'Culture', 'Conflict Resolution', 'Leadership'], syllabusText: 'Individual and group behavior in organizations: motivation, team dynamics, culture.', prerequisites: [] } });

  // ─────────────────────────────────────────────
  // COURSES — GRAPHIC DESIGN
  // ─────────────────────────────────────────────

  const gd101 = await prisma.course.create({ data: { majorId: design.majorId, code: 'GD101', name: 'Design Principles', credits: 3, semesterOffered: 1, difficultyLevel: 1, topicsCovered: ['Color Theory', 'Typography', 'Composition', 'Visual Hierarchy', 'Grid Systems'], syllabusText: 'Foundations of visual design: color theory, typography, layout, and composition.', prerequisites: [] } });
  const gd102 = await prisma.course.create({ data: { majorId: design.majorId, code: 'GD102', name: 'Digital Tools', credits: 3, semesterOffered: 1, difficultyLevel: 2, topicsCovered: ['Photoshop', 'Illustrator', 'InDesign', 'File Formats', 'Digital Workflow'], syllabusText: 'Proficiency in Adobe Creative Suite: Photoshop, Illustrator, and InDesign.', prerequisites: [] } });
  const gd201 = await prisma.course.create({ data: { majorId: design.majorId, code: 'GD201', name: 'Brand Identity Design', credits: 3, semesterOffered: 2, difficultyLevel: 3, topicsCovered: ['Logo Design', 'Brand Guidelines', 'Visual Identity', 'Storytelling'], syllabusText: 'Brand identity development: logo design, style guides, visual language systems.', prerequisites: ['GD101'] } });
  const gd301 = await prisma.course.create({ data: { majorId: design.majorId, code: 'GD301', name: 'UX/UI Design', credits: 3, semesterOffered: 3, difficultyLevel: 3, topicsCovered: ['User Research', 'Wireframing', 'Prototyping', 'Figma', 'Usability Testing'], syllabusText: 'User experience design: research methods, wireframing, prototyping in Figma.', prerequisites: ['GD101'] } });

  console.log('✅ Courses created');

  // ─────────────────────────────────────────────
  // HELPER: create enrollment + exams
  // ─────────────────────────────────────────────

  async function enroll(
    studentId: string,
    courseId: string,
    semester: number,
    year: number,
    grade: number,
    exams: { type: ExamType; score: number }[]
  ) {
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId,
        semester,
        year,
        finalGrade: grade,
        letterGrade: gradeToLetter(grade),
        status: EnrollmentStatus.completed,
      },
    });

    for (const exam of exams) {
      await prisma.exam.create({
        data: {
          enrollmentId: enrollment.enrollmentId,
          examType: exam.type,
          score: exam.score,
          maxScore: 100,
          examDate: new Date(year, exam.type === ExamType.final ? 4 : 2, 15),
        },
      });
    }

    return enrollment;
  }

  // ─────────────────────────────────────────────
  // STUDENTS — assigned to advisors
  // advisor1 gets students 1-3, advisor2 gets students 4-6
  // ─────────────────────────────────────────────

  // Student 1: Lara Haddad — Healthy CS student (advisor1)
  const lara = await prisma.student.create({
    data: { majorId: cs.majorId, advisorId: advisor1.advisorId, passwordHash: await bcrypt.hash('student123', 10), name: 'Lara Haddad', email: 'lara.haddad@university.edu', enrollmentYear: 2022, currentSemester: 5, cumulativeGpa: 3.4 },
  });
  await enroll(lara.studentId, cs101.courseId, 1, 2022, 88, [{ type: ExamType.midterm, score: 85 }, { type: ExamType.final, score: 90 }]);
  await enroll(lara.studentId, cs102.courseId, 1, 2022, 82, [{ type: ExamType.midterm, score: 78 }, { type: ExamType.final, score: 85 }]);
  await enroll(lara.studentId, cs201.courseId, 2, 2022, 85, [{ type: ExamType.midterm, score: 82 }, { type: ExamType.final, score: 87 }]);
  await enroll(lara.studentId, cs202.courseId, 3, 2023, 80, [{ type: ExamType.midterm, score: 76 }, { type: ExamType.final, score: 83 }]);
  await enroll(lara.studentId, cs301.courseId, 4, 2023, 83, [{ type: ExamType.midterm, score: 80 }, { type: ExamType.final, score: 85 }]);
  await enroll(lara.studentId, cs302.courseId, 4, 2023, 87, [{ type: ExamType.midterm, score: 85 }, { type: ExamType.final, score: 89 }]);

  // Student 2: Omar Nassar — Early drift, math weakness (advisor1)
  const omar = await prisma.student.create({
    data: { majorId: cs.majorId, advisorId: advisor1.advisorId, passwordHash: await bcrypt.hash('student123', 10), name: 'Omar Nassar', email: 'omar.nassar@university.edu', enrollmentYear: 2022, currentSemester: 5, cumulativeGpa: 2.7 },
  });
  await enroll(omar.studentId, cs101.courseId, 1, 2022, 84, [{ type: ExamType.midterm, score: 80 }, { type: ExamType.final, score: 87 }]);
  await enroll(omar.studentId, cs102.courseId, 1, 2022, 61, [{ type: ExamType.midterm, score: 55 }, { type: ExamType.final, score: 64 }]);
  await enroll(omar.studentId, cs201.courseId, 2, 2022, 72, [{ type: ExamType.midterm, score: 68 }, { type: ExamType.final, score: 75 }]);
  await enroll(omar.studentId, cs202.courseId, 3, 2023, 54, [{ type: ExamType.midterm, score: 50 }, { type: ExamType.final, score: 57 }]);
  await enroll(omar.studentId, cs301.courseId, 4, 2023, 58, [{ type: ExamType.midterm, score: 52 }, { type: ExamType.final, score: 62 }]);
  await enroll(omar.studentId, cs302.courseId, 4, 2023, 77, [{ type: ExamType.midterm, score: 75 }, { type: ExamType.final, score: 79 }]);

  // Student 3: Nadia Khalil — Critical drift, creative type in CS (advisor1)
  const nadia = await prisma.student.create({
    data: { majorId: cs.majorId, advisorId: advisor1.advisorId, passwordHash: await bcrypt.hash('student123', 10), name: 'Nadia Khalil', email: 'nadia.khalil@university.edu', enrollmentYear: 2021, currentSemester: 6, cumulativeGpa: 1.9 },
  });
  await enroll(nadia.studentId, cs101.courseId, 1, 2021, 70, [{ type: ExamType.midterm, score: 65 }, { type: ExamType.final, score: 73 }]);
  await enroll(nadia.studentId, cs102.courseId, 1, 2021, 48, [{ type: ExamType.midterm, score: 42 }, { type: ExamType.final, score: 52 }]);
  await enroll(nadia.studentId, cs201.courseId, 2, 2021, 55, [{ type: ExamType.midterm, score: 50 }, { type: ExamType.final, score: 59 }]);
  await enroll(nadia.studentId, cs202.courseId, 3, 2022, 41, [{ type: ExamType.midterm, score: 38 }, { type: ExamType.final, score: 43 }]);
  await enroll(nadia.studentId, cs301.courseId, 4, 2022, 44, [{ type: ExamType.midterm, score: 40 }, { type: ExamType.final, score: 47 }]);
  await enroll(nadia.studentId, cs302.courseId, 4, 2022, 63, [{ type: ExamType.midterm, score: 60 }, { type: ExamType.final, score: 65 }]);
  await enroll(nadia.studentId, cs401.courseId, 5, 2023, 68, [{ type: ExamType.midterm, score: 65 }, { type: ExamType.final, score: 70 }]);

  // Student 4: Kareem Aziz — Business, strong marketing, weak finance (advisor2)
  const kareem = await prisma.student.create({
    data: { majorId: business.majorId, advisorId: advisor2.advisorId, passwordHash: await bcrypt.hash('student123', 10), name: 'Kareem Aziz', email: 'kareem.aziz@university.edu', enrollmentYear: 2022, currentSemester: 4, cumulativeGpa: 2.8 },
  });
  await enroll(kareem.studentId, bus101.courseId, 1, 2022, 85, [{ type: ExamType.midterm, score: 82 }, { type: ExamType.final, score: 87 }]);
  await enroll(kareem.studentId, bus102.courseId, 1, 2022, 58, [{ type: ExamType.midterm, score: 53 }, { type: ExamType.final, score: 62 }]);
  await enroll(kareem.studentId, bus201.courseId, 2, 2022, 90, [{ type: ExamType.midterm, score: 88 }, { type: ExamType.final, score: 92 }]);
  await enroll(kareem.studentId, bus202.courseId, 2, 2022, 55, [{ type: ExamType.midterm, score: 49 }, { type: ExamType.final, score: 60 }]);
  await enroll(kareem.studentId, bus301.courseId, 3, 2023, 50, [{ type: ExamType.midterm, score: 45 }, { type: ExamType.final, score: 54 }]);
  await enroll(kareem.studentId, bus302.courseId, 3, 2023, 88, [{ type: ExamType.midterm, score: 86 }, { type: ExamType.final, score: 90 }]);

  // Student 5: Sara Moussa — Was drifting, now recovering (advisor2)
  const sara = await prisma.student.create({
    data: { majorId: cs.majorId, advisorId: advisor2.advisorId, passwordHash: await bcrypt.hash('student123', 10), name: 'Sara Moussa', email: 'sara.moussa@university.edu', enrollmentYear: 2021, currentSemester: 6, cumulativeGpa: 2.9 },
  });
  await enroll(sara.studentId, cs101.courseId, 1, 2021, 62, [{ type: ExamType.midterm, score: 58 }, { type: ExamType.final, score: 65 }]);
  await enroll(sara.studentId, cs102.courseId, 1, 2021, 58, [{ type: ExamType.midterm, score: 53 }, { type: ExamType.final, score: 62 }]);
  await enroll(sara.studentId, cs201.courseId, 2, 2021, 68, [{ type: ExamType.midterm, score: 65 }, { type: ExamType.final, score: 71 }]);
  await enroll(sara.studentId, cs202.courseId, 3, 2022, 74, [{ type: ExamType.midterm, score: 70 }, { type: ExamType.final, score: 77 }]);
  await enroll(sara.studentId, cs301.courseId, 4, 2022, 79, [{ type: ExamType.midterm, score: 76 }, { type: ExamType.final, score: 81 }]);
  await enroll(sara.studentId, cs302.courseId, 4, 2022, 82, [{ type: ExamType.midterm, score: 80 }, { type: ExamType.final, score: 84 }]);

  // Student 6: Rana Saad — Design student, healthy control (advisor2)
  const rana = await prisma.student.create({
    data: { majorId: design.majorId, advisorId: advisor2.advisorId, passwordHash: await bcrypt.hash('student123', 10), name: 'Rana Saad', email: 'rana.saad@university.edu', enrollmentYear: 2023, currentSemester: 3, cumulativeGpa: 3.8 },
  });
  await enroll(rana.studentId, gd101.courseId, 1, 2023, 94, [{ type: ExamType.midterm, score: 92 }, { type: ExamType.final, score: 96 }]);
  await enroll(rana.studentId, gd102.courseId, 1, 2023, 88, [{ type: ExamType.midterm, score: 85 }, { type: ExamType.final, score: 91 }]);
  await enroll(rana.studentId, gd201.courseId, 2, 2023, 91, [{ type: ExamType.midterm, score: 89 }, { type: ExamType.final, score: 93 }]);
  await enroll(rana.studentId, gd301.courseId, 3, 2024, 87, [{ type: ExamType.midterm, score: 84 }, { type: ExamType.final, score: 90 }]);

  // ─────────────────────────────────────────────
  // SIS: Update Students with studentNumber and role
  // ─────────────────────────────────────────────
  
  await prisma.student.update({
    where: { studentId: lara.studentId },
    data: { studentNumber: 'S1000001', role: 'student' },
  });
  await prisma.student.update({
    where: { studentId: omar.studentId },
    data: { studentNumber: 'S1000002', role: 'student' },
  });
  await prisma.student.update({
    where: { studentId: nadia.studentId },
    data: { studentNumber: 'S1000003', role: 'student' },
  });
  await prisma.student.update({
    where: { studentId: kareem.studentId },
    data: { studentNumber: 'S2000001', role: 'student' },
  });
  await prisma.student.update({
    where: { studentId: sara.studentId },
    data: { studentNumber: 'S1000004', role: 'student' },
  });
  await prisma.student.update({
    where: { studentId: rana.studentId },
    data: { studentNumber: 'S3000001', role: 'student' },
  });

  // ─────────────────────────────────────────────
  // SIS: SECTIONS (Spring 2025-26)
  // ─────────────────────────────────────────────

  const cs101Section = await prisma.section.create({
    data: {
      courseId: cs101.courseId,
      majorId: cs.majorId,
      advisorId: advisor1.advisorId,
      semester: 'Spring 25-26',
      instructorName: 'Dr. Alice Chen',
      scheduleDays: ['Monday', 'Wednesday', 'Friday'],
      scheduleStartTime: '09:00',
      scheduleEndTime: '10:30',
      scheduleRoom: 'Room 101',
      capacity: 30,
      enrolledCount: 2,
      finalExamDate: new Date(2026, 4, 15),
      finalExamTime: '09:00',
      finalExamRoom: 'Room 101',
    },
  });

  const cs201Section = await prisma.section.create({
    data: {
      courseId: cs201.courseId,
      majorId: cs.majorId,
      advisorId: advisor1.advisorId,
      semester: 'Spring 25-26',
      instructorName: 'Dr. Bob Kumar',
      scheduleDays: ['Tuesday', 'Thursday'],
      scheduleStartTime: '10:00',
      scheduleEndTime: '11:30',
      scheduleRoom: 'Room 202',
      capacity: 25,
      enrolledCount: 1,
      finalExamDate: new Date(2026, 4, 20),
      finalExamTime: '10:00',
      finalExamRoom: 'Room 202',
    },
  });

  const bus101Section = await prisma.section.create({
    data: {
      courseId: bus101.courseId,
      majorId: business.majorId,
      advisorId: advisor2.advisorId,
      semester: 'Spring 25-26',
      instructorName: 'Prof. Charlie Davis',
      scheduleDays: ['Monday', 'Wednesday', 'Friday'],
      scheduleStartTime: '13:00',
      scheduleEndTime: '14:30',
      scheduleRoom: 'Hall A',
      capacity: 35,
      enrolledCount: 1,
      finalExamDate: new Date(2026, 4, 16),
      finalExamTime: '13:00',
      finalExamRoom: 'Hall A',
    },
  });

  console.log('✅ SIS Sections created');

  // ─────────────────────────────────────────────
  // SIS: PROGRAM OF STUDY ITEMS
  // ─────────────────────────────────────────────

  // CS Program of Study
  await prisma.programOfStudyItem.create({
    data: {
      majorId: cs.majorId,
      courseId: cs101.courseId,
      semester: 1,
      isRequired: true,
    },
  });
  await prisma.programOfStudyItem.create({
    data: {
      majorId: cs.majorId,
      courseId: cs102.courseId,
      semester: 1,
      isRequired: true,
    },
  });
  await prisma.programOfStudyItem.create({
    data: {
      majorId: cs.majorId,
      courseId: cs201.courseId,
      semester: 2,
      isRequired: true,
    },
  });
  await prisma.programOfStudyItem.create({
    data: {
      majorId: cs.majorId,
      courseId: cs202.courseId,
      semester: 3,
      isRequired: true,
    },
  });

  // Business Program of Study
  await prisma.programOfStudyItem.create({
    data: {
      majorId: business.majorId,
      courseId: bus101.courseId,
      semester: 1,
      isRequired: true,
    },
  });
  await prisma.programOfStudyItem.create({
    data: {
      majorId: business.majorId,
      courseId: bus102.courseId,
      semester: 1,
      isRequired: true,
    },
  });
  await prisma.programOfStudyItem.create({
    data: {
      majorId: business.majorId,
      courseId: bus201.courseId,
      semester: 2,
      isRequired: true,
    },
  });

  console.log('✅ SIS Program of Study items created');

  // ─────────────────────────────────────────────
  // SIS: PAYMENT SLIPS
  // ─────────────────────────────────────────────

  await prisma.paymentSlip.create({
    data: {
      studentId: lara.studentId,
      semester: 'Spring 25-26',
      amountDue: 2500,
      currency: 'USD',
      dueDate: new Date(2026, 3, 1), // April 1, 2026
      status: 'paid',
    },
  });

  await prisma.paymentSlip.create({
    data: {
      studentId: omar.studentId,
      semester: 'Spring 25-26',
      amountDue: 2500,
      currency: 'USD',
      dueDate: new Date(2026, 3, 1),
      status: 'pending',
    },
  });

  await prisma.paymentSlip.create({
    data: {
      studentId: nadia.studentId,
      semester: 'Spring 25-26',
      amountDue: 2500,
      currency: 'USD',
      dueDate: new Date(2026, 2, 15), // March 15, 2026
      status: 'overdue',
    },
  });

  await prisma.paymentSlip.create({
    data: {
      studentId: kareem.studentId,
      semester: 'Spring 25-26',
      amountDue: 2500,
      currency: 'USD',
      dueDate: new Date(2026, 3, 1),
      status: 'paid',
    },
  });

  await prisma.paymentSlip.create({
    data: {
      studentId: sara.studentId,
      semester: 'Spring 25-26',
      amountDue: 2500,
      currency: 'USD',
      dueDate: new Date(2026, 3, 1),
      status: 'pending',
    },
  });

  await prisma.paymentSlip.create({
    data: {
      studentId: rana.studentId,
      semester: 'Spring 25-26',
      amountDue: 2500,
      currency: 'USD',
      dueDate: new Date(2026, 3, 1),
      status: 'pending',
    },
  });

  console.log('✅ SIS Payment slips created');

  // ─────────────────────────────────────────────
  // SIS: ADVISOR COMMENTS
  // ─────────────────────────────────────────────

  await prisma.advisorComment.create({
    data: {
      advisorId: advisor1.advisorId,
      studentId: lara.studentId,
      message: 'Excellent progress this semester! Keep up the strong performance in Data Structures. Consider joining the CS club.',
      isRead: true,
    },
  });

  await prisma.advisorComment.create({
    data: {
      advisorId: advisor1.advisorId,
      studentId: omar.studentId,
      message: 'Math concepts are challenging you. Consider attending tutoring sessions for Discrete Math. We can discuss alternative courses.',
      isRead: false,
    },
  });

  await prisma.advisorComment.create({
    data: {
      advisorId: advisor1.advisorId,
      studentId: nadia.studentId,
      message: 'Your performance in core CS courses suggests this major might not be the best fit. Let\'s discuss alternative programs that suit your strengths.',
      isRead: false,
    },
  });

  await prisma.advisorComment.create({
    data: {
      advisorId: advisor2.advisorId,
      studentId: kareem.studentId,
      message: 'Strong performance in marketing! Your stats course needs more focus. Office hours on Wednesdays can help.',
      isRead: true,
    },
  });

  await prisma.advisorComment.create({
    data: {
      advisorId: advisor2.advisorId,
      studentId: sara.studentId,
      message: 'Great improvement! You\'re showing strong recovery in algorithms. This level of engagement should continue.',
      isRead: false,
    },
  });

  console.log('✅ SIS Advisor comments created');

  // ─────────────────────────────────────────────
  // SIS: ENROLLMENT WITH SECTIONS (for demo)
  // ─────────────────────────────────────────────

  // Note: Creating sample enrollments with sections for the current semester
  // These demonstrate the new SIS enrollment request workflow
  await prisma.enrollment.create({
    data: {
      studentId: lara.studentId,
      courseId: cs101.courseId,
      semester: 5,
      year: 2026,
      sectionId: cs101Section.sectionId,
      finalGrade: null,
      letterGrade: null,
      status: 'pending',
      requestedAt: new Date(),
    },
  });

  console.log('✅ SIS Enrollments created');

  // ── Advisor-visible flags (Feature 6 demo) ──────────────
  await prisma.studentFlag.create({
    data: {
      studentId: lara.studentId,
      advisorId: advisor1.advisorId,
      note: 'Great improvement in CS301 this semester. Keep up the momentum heading into semester 6.',
      flagType: 'Positive Progress',
      isVisibleToStudent: true,
    },
  });

  await prisma.studentFlag.create({
    data: {
      studentId: nadia.studentId,
      advisorId: advisor1.advisorId,
      note: 'Struggling across multiple core CS courses. Immediate advising intervention needed.',
      flagType: 'At Risk',
      isVisibleToStudent: false,
    },
  });

  await prisma.studentFlag.create({
    data: {
      studentId: omar.studentId,
      advisorId: advisor1.advisorId,
      note: 'Please book an appointment to discuss your course selection for next semester before registration opens.',
      flagType: 'academic',
      isVisibleToStudent: true,
    },
  });

  // ── DegreeRequirements ──────────────────────────────────────────────
  await prisma.degreeRequirement.createMany({
    data: [
      // ─── Computer Science ─────────────────────────────────────────
      // University Requirements
      { majorId: cs.majorId, courseId: cs102.courseId, requirementType: 'core',     recommendedSemester: 1, requirementGroup: 'University Requirements' },
      { majorId: cs.majorId, courseId: cs302.courseId, requirementType: 'core',     recommendedSemester: 3, requirementGroup: 'University Requirements' },
      // Department Requirements
      { majorId: cs.majorId, courseId: cs101.courseId, requirementType: 'core',     recommendedSemester: 1, requirementGroup: 'Department Requirements' },
      { majorId: cs.majorId, courseId: cs201.courseId, requirementType: 'core',     recommendedSemester: 2, requirementGroup: 'Department Requirements' },
      { majorId: cs.majorId, courseId: cs202.courseId, requirementType: 'core',     recommendedSemester: 3, requirementGroup: 'Department Requirements' },
      { majorId: cs.majorId, courseId: cs301.courseId, requirementType: 'core',     recommendedSemester: 4, requirementGroup: 'Department Requirements' },
      { majorId: cs.majorId, courseId: cs401.courseId, requirementType: 'core',     recommendedSemester: 5, requirementGroup: 'Department Requirements' },
      { majorId: cs.majorId, courseId: cs402.courseId, requirementType: 'elective', recommendedSemester: 6, requirementGroup: 'Department Requirements' },

      // ─── Business Administration ──────────────────────────────────
      // University Requirements
      { majorId: business.majorId, courseId: bus102.courseId, requirementType: 'core',     recommendedSemester: 1, requirementGroup: 'University Requirements' },
      { majorId: business.majorId, courseId: bus202.courseId, requirementType: 'core',     recommendedSemester: 2, requirementGroup: 'University Requirements' },
      // Department Requirements
      { majorId: business.majorId, courseId: bus101.courseId, requirementType: 'core',     recommendedSemester: 1, requirementGroup: 'Department Requirements' },
      { majorId: business.majorId, courseId: bus201.courseId, requirementType: 'core',     recommendedSemester: 2, requirementGroup: 'Department Requirements' },
      { majorId: business.majorId, courseId: bus301.courseId, requirementType: 'core',     recommendedSemester: 3, requirementGroup: 'Department Requirements' },
      { majorId: business.majorId, courseId: bus302.courseId, requirementType: 'elective', recommendedSemester: 3, requirementGroup: 'Department Requirements' },

      // ─── Graphic Design ───────────────────────────────────────────
      // University Requirements
      { majorId: design.majorId, courseId: gd101.courseId, requirementType: 'core',     recommendedSemester: 1, requirementGroup: 'University Requirements' },
      // Department Requirements
      { majorId: design.majorId, courseId: gd102.courseId, requirementType: 'core',     recommendedSemester: 1, requirementGroup: 'Department Requirements' },
      { majorId: design.majorId, courseId: gd201.courseId, requirementType: 'core',     recommendedSemester: 2, requirementGroup: 'Department Requirements' },
      { majorId: design.majorId, courseId: gd301.courseId, requirementType: 'elective', recommendedSemester: 3, requirementGroup: 'Department Requirements' },
    ],
  });

  // ── StudentPlan for Lara (3-semester AI-generated pathway) ──────────
  await prisma.studentPlan.create({
    data: {
      studentId: lara.studentId,
      advisorId: advisor1.advisorId,
      isAiGenerated: true,
      semesterPlans: [
        { semesterNumber: 6, year: 2024, courseCodes: ['CS401', 'CS402'] },
        { semesterNumber: 7, year: 2025, courseCodes: ['CS450', 'CS460'] },
        { semesterNumber: 8, year: 2025, courseCodes: ['CS499'] },
      ],
    },
  });

  // ── Interventions + Outcomes ────────────────────────────────────────
  // Lara: Academic Counseling 3 months ago — outcome shows improvement
  const laraIntervention = await prisma.intervention.create({
    data: {
      studentId: lara.studentId,
      advisorId: advisor1.advisorId,
      interventionType: 'Academic Counseling',
      notes: 'Discussed semester 6 course load and study strategies. Student receptive.',
      interventionDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.interventionOutcome.create({
    data: {
      interventionId: laraIntervention.id,
      driftScoreBefore: 0.42,
      driftScoreAfter: 0.28,
      effectivenessScore: 0.14,
      measuredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Nadia: Course Load Reduction 2 months ago — outcome awaiting next analysis
  const nadiaIntervention1 = await prisma.intervention.create({
    data: {
      studentId: nadia.studentId,
      advisorId: advisor1.advisorId,
      interventionType: 'Course Load Reduction',
      notes: 'Reduced to 12 credits for spring semester to stabilize GPA.',
      interventionDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.interventionOutcome.create({
    data: {
      interventionId: nadiaIntervention1.id,
      driftScoreBefore: 0.81,
      driftScoreAfter: null,
      effectivenessScore: null,
      measuredAt: null,
    },
  });

  // Nadia: Tutoring Referral 1 month ago — no outcome yet
  await prisma.intervention.create({
    data: {
      studentId: nadia.studentId,
      advisorId: advisor1.advisorId,
      interventionType: 'Tutoring Referral',
      notes: 'Referred to math tutoring center for CS202 support.',
      interventionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  // ── TriageRun — 7 days ago for advisor1 covering all CS students ────
  await prisma.triageRun.create({
    data: {
      advisorId: advisor1.advisorId,
      semester: 2,
      year: 2026,
      runAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      result: [
        {
          studentId: nadia.studentId,
          studentName: 'Nadia Khalil',
          urgencyScore: 82,
          urgencyLevel: 'immediate',
          topThreeReasons: [
            'Cumulative GPA below 2.0 (1.9) — academic probation threshold',
            'Repeated failures in core CS courses (CS102, CS202, CS301)',
            'No improvement trajectory despite intervention history',
          ],
          recommendedAction: 'Schedule urgent advising meeting; consider major change assessment',
        },
        {
          studentId: omar.studentId,
          studentName: 'Omar Nassar',
          urgencyScore: 55,
          urgencyLevel: 'high',
          topThreeReasons: [
            'Below-average performance in quantitative courses (CS102, CS202)',
            'Risk of failing CS401 if current trajectory continues',
            'GPA decline trend across four semesters',
          ],
          recommendedAction: 'Tutoring referral and mid-semester check-in',
        },
        {
          studentId: lara.studentId,
          studentName: 'Lara Haddad',
          urgencyScore: 18,
          urgencyLevel: 'healthy',
          topThreeReasons: [
            'Consistent performance across all core courses',
            'GPA improving after counseling intervention',
            'On track for graduation within expected timeline',
          ],
          recommendedAction: 'Routine check-in; no action required',
        },
      ],
    },
  });

  console.log('✅ Interventions, Flags, DegreeRequirements, StudentPlan, TriageRun seeded');

  // ── Demo appointment requests (Feature 7 demo) ───────────
  await prisma.appointmentRequest.create({
    data: {
      studentId: lara.studentId,
      topic: 'Academic Planning',
      requestedDate: new Date('2026-05-15T10:00:00Z'),
      notes: 'Would like to discuss course selection for my final semester.',
      status: 'confirmed',
      advisorId: advisor1.advisorId,
      advisorResponse: 'Confirmed for May 15 at 10am. See you then.',
    },
  });

  await prisma.appointmentRequest.create({
    data: {
      studentId: omar.studentId,
      topic: 'Grade Concern',
      requestedDate: new Date('2026-05-20T14:00:00Z'),
      notes: 'Want to talk about my CS202 result.',
      status: 'pending',
    },
  });

  console.log('✅ Students and enrollments created\n');
  console.log('Login Credentials:');
  console.log('  Admin:    admin@sage.edu     | admin123');
  console.log('  Advisor1: advisor1@sage.edu  | advisor123  (Lara, Omar, Nadia)');
  console.log('  Advisor2: advisor2@sage.edu  | advisor123  (Kareem, Sara, Rana)');
  console.log('\n🚀 Database ready. Run: npm run dev');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
