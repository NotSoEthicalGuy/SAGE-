/**
 * SAGE — Intelligence Engine
 * Computes a structured IntelligenceProfile for a student from raw DB data.
 * Called before Claude so we send structured metrics instead of raw records.
 */

import { prisma } from '../db/client';
import { detectPrerequisiteViolations } from './prerequisiteService';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface StrengthWeakness {
  domain: string;
  avgGrade: number;
  courses: string[];
}

export interface IntelligenceProfile {
  driftScore: number;
  gpaTrend: number;
  performanceVolatility: number;
  attendanceScore: number;
  prerequisiteViolations: { courseName: string; missingPrerequisiteCode: string }[];
  courseDifficultyMismatch: number;
  strengths: StrengthWeakness[];
  weaknesses: StrengthWeakness[];
  riskLevel: 'on_track' | 'early_warning' | 'drifting' | 'critical';
  semesterAverages: { label: string; avg: number }[];
  failureRate: number;
  totalCoursesAttempted: number;
}

export interface ScenarioResult {
  driftScore: number;
  riskLevel: string;
  projectedGpa: number;
}

export interface ScenarioSet {
  current: ScenarioResult;
  improvedAttendance: ScenarioResult;
  improvedGrades: ScenarioResult;
  reducedCourseLoad: ScenarioResult;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function riskFromDrift(score: number): 'on_track' | 'early_warning' | 'drifting' | 'critical' {
  if (score < 0.3) return 'on_track';
  if (score < 0.6) return 'early_warning';
  if (score < 0.8) return 'drifting';
  return 'critical';
}

function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─────────────────────────────────────────────
// MAIN: BUILD INTELLIGENCE PROFILE
// ─────────────────────────────────────────────

export async function buildStudentIntelligence(studentId: string): Promise<IntelligenceProfile> {
  const [enrollments, attendanceRecords, violations] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId },
      orderBy: [{ year: 'asc' }, { semester: 'asc' }],
      include: {
        course: {
          select: {
            code: true,
            name: true,
            difficultyLevel: true,
            courseType: true,
            topicsCovered: true,
          },
        },
      },
    }),
    prisma.enrollmentAttendance.findMany({
      where: { enrollment: { studentId } },
      select: { status: true },
    }),
    detectPrerequisiteViolations(studentId),
  ]);

  const completedWithGrades = enrollments.filter(
    (e) => e.finalGrade !== null && !['dropped', 'withdrawn', 'failed'].includes(e.status)
  );

  // ── GPA trend (slope of semester averages) ──────────────────────────────
  const semesterMap = new Map<string, number[]>();
  for (const e of completedWithGrades) {
    const key = `${e.year}-${String(e.semester).padStart(2, '0')}`;
    if (!semesterMap.has(key)) semesterMap.set(key, []);
    semesterMap.get(key)!.push(e.finalGrade as number);
  }
  const sortedKeys = [...semesterMap.keys()].sort();
  const semesterAverages = sortedKeys.map((k) => {
    const grades = semesterMap.get(k)!;
    const [year, sem] = k.split('-');
    return {
      label: `S${parseInt(sem, 10)} ${year}`,
      avg: grades.reduce((a, b) => a + b, 0) / grades.length,
    };
  });
  const gpaTrend = linearSlope(semesterAverages.map((s) => s.avg));

  // ── Performance volatility (std dev, normalised 0–1) ───────────────────
  const allGrades = completedWithGrades.map((e) => e.finalGrade as number);
  const performanceVolatility = clamp(standardDeviation(allGrades) / 25, 0, 1);

  // ── Attendance score ────────────────────────────────────────────────────
  const attendanceScore =
    attendanceRecords.length === 0
      ? 0.8
      : attendanceRecords.filter((a) => a.status === 'present').length / attendanceRecords.length;

  // ── Course difficulty mismatch ──────────────────────────────────────────
  const hardGrades = completedWithGrades
    .filter((e) => (e.course.difficultyLevel ?? 0) >= 4)
    .map((e) => e.finalGrade as number);
  const easyGrades = completedWithGrades
    .filter((e) => (e.course.difficultyLevel ?? 3) < 4)
    .map((e) => e.finalGrade as number);

  let courseDifficultyMismatch = 0;
  if (hardGrades.length > 0 && easyGrades.length > 0) {
    const avgHard = hardGrades.reduce((a, b) => a + b, 0) / hardGrades.length;
    const avgEasy = easyGrades.reduce((a, b) => a + b, 0) / easyGrades.length;
    courseDifficultyMismatch = clamp((avgEasy - avgHard) / 20, 0, 1);
  }

  // ── Strengths / weaknesses by topic ────────────────────────────────────
  const topicGrades = new Map<string, number[]>();
  const topicCourses = new Map<string, Set<string>>();
  for (const e of completedWithGrades) {
    for (const topic of e.course.topicsCovered.slice(0, 4)) {
      if (!topicGrades.has(topic)) {
        topicGrades.set(topic, []);
        topicCourses.set(topic, new Set());
      }
      topicGrades.get(topic)!.push(e.finalGrade as number);
      topicCourses.get(topic)!.add(e.course.code);
    }
  }
  const domainStats = [...topicGrades.entries()]
    .map(([domain, grades]) => ({
      domain,
      avgGrade: Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10,
      courses: [...(topicCourses.get(domain) ?? [])],
    }))
    .sort((a, b) => b.avgGrade - a.avgGrade);

  const strengths = domainStats.filter((d) => d.avgGrade >= 75).slice(0, 3);
  const weaknesses = domainStats.filter((d) => d.avgGrade < 65).slice(-3).reverse();

  // ── Failure / withdrawal rate ───────────────────────────────────────────
  const totalCoursesAttempted = enrollments.filter((e) => e.status !== 'dropped').length;
  const failedOrWithdrawn = enrollments.filter(
    (e) => e.status === 'failed' || e.status === 'withdrawn'
  ).length;
  const failureRate = totalCoursesAttempted > 0 ? failedOrWithdrawn / totalCoursesAttempted : 0;

  // ── Drift score (weighted combination) ─────────────────────────────────
  // Slope of -10 grade points/semester → full weight on this component
  const slopeComponent = clamp(-gpaTrend / 10, 0, 1);
  const prereqComponent = clamp(violations.length / 3, 0, 1);

  const driftScore = clamp(
    slopeComponent * 0.30 +
    failureRate * 0.25 +
    prereqComponent * 0.20 +
    courseDifficultyMismatch * 0.15 +
    performanceVolatility * 0.10,
    0,
    1
  );

  return {
    driftScore,
    gpaTrend,
    performanceVolatility,
    attendanceScore,
    prerequisiteViolations: violations,
    courseDifficultyMismatch,
    strengths,
    weaknesses,
    riskLevel: riskFromDrift(driftScore),
    semesterAverages,
    failureRate,
    totalCoursesAttempted,
  };
}

// ─────────────────────────────────────────────
// SIMULATE SCENARIOS
// ─────────────────────────────────────────────

export function simulateStudentScenarios(profile: IntelligenceProfile): ScenarioSet {
  function driftToGpa(drift: number): number {
    return Math.round(clamp(70 + (1 - drift) * 30, 40, 100) * 10) / 10;
  }

  const improvedAttendanceDrift = clamp(profile.driftScore - 0.08, 0, 1);
  const improvedGradesDrift = clamp(profile.driftScore - 0.15, 0, 1);
  const reducedLoadDrift = clamp(profile.driftScore - 0.10, 0, 1);

  return {
    current: {
      driftScore: Math.round(profile.driftScore * 1000) / 1000,
      riskLevel: profile.riskLevel,
      projectedGpa: driftToGpa(profile.driftScore),
    },
    improvedAttendance: {
      driftScore: Math.round(improvedAttendanceDrift * 1000) / 1000,
      riskLevel: riskFromDrift(improvedAttendanceDrift),
      projectedGpa: driftToGpa(improvedAttendanceDrift),
    },
    improvedGrades: {
      driftScore: Math.round(improvedGradesDrift * 1000) / 1000,
      riskLevel: riskFromDrift(improvedGradesDrift),
      projectedGpa: driftToGpa(improvedGradesDrift),
    },
    reducedCourseLoad: {
      driftScore: Math.round(reducedLoadDrift * 1000) / 1000,
      riskLevel: riskFromDrift(reducedLoadDrift),
      projectedGpa: driftToGpa(reducedLoadDrift),
    },
  };
}
