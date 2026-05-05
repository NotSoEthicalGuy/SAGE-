import { prisma } from '../db/client';

export const COMPLETED_STATUSES = ['completed'];
export const ACTIVE_STATUSES = ['in_progress', 'registered', 'approved', 'pending'];

export function isCompleted(e: { status: string; finalGrade: number | null }): boolean {
  return e.finalGrade !== null || COMPLETED_STATUSES.includes(e.status);
}

export function isActive(e: { status: string; finalGrade: number | null }): boolean {
  return ACTIVE_STATUSES.includes(e.status) && e.finalGrade === null;
}

export async function detectPrerequisiteViolations(studentId: string): Promise<
  { courseName: string; missingPrerequisiteCode: string }[]
> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: {
      status: true,
      finalGrade: true,
      course: { select: { name: true, code: true, prerequisites: true } },
    },
  });

  const completedCodes = new Set(
    enrollments.filter(isCompleted).map(e => e.course.code.toLowerCase())
  );

  const violations: { courseName: string; missingPrerequisiteCode: string }[] = [];
  for (const e of enrollments.filter(isActive)) {
    for (const prereq of e.course.prerequisites) {
      if (!completedCodes.has(prereq.toLowerCase())) {
        violations.push({ courseName: e.course.name, missingPrerequisiteCode: prereq });
      }
    }
  }

  return violations;
}
