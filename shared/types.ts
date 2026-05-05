/**
 * SAGE — Shared TypeScript Types
 * These types are used by BOTH the frontend and backend.
 * If a shape changes here, both sides are updated automatically.
 */

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export type DriftLevel = "on_track" | "early_warning" | "drifting" | "critical";
export type EnrollmentStatus = "completed" | "in_progress" | "withdrawn" | "failed";
export type ExamType = "midterm" | "final" | "quiz" | "project";
export type Severity = "low" | "medium" | "high";
export type UserRole = "admin" | "advisor";

// ─────────────────────────────────────────────
// UNIVERSITY TYPES
// ──────────────────────────C:\Users\amink\Desktop\S.A.G.E. V1\shared\types.ts───────────────────

export interface Major {
  majorId: string;
  name: string;
  faculty: string;
  totalCredits: number;
  description: string | null;
}

export interface CourseSkill {
  skillId: string;
  courseId: string;
  skillName: string;
}

export interface CourseMaterial {
  materialId: string;
  courseId: string;
  fileType: string;
  filePath: string;
  fileName: string;
  extractedText: string | null;
  uploadedAt: string;
}

export interface Course {
  courseId: string;
  majorId: string;
  code: string;
  name: string;
  credits: number;
  semesterOffered: number | null;
  difficultyLevel: number | null;
  syllabusText: string | null;
  topicsCovered: string[];
  prerequisites: string[];
  skills?: CourseSkill[];
  materials?: CourseMaterial[];
}

// ─────────────────────────────────────────────
// STUDENT TYPES
// ─────────────────────────────────────────────

export interface Advisor {
  advisorId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Student {
  studentId: string;
  majorId: string;
  advisorId: string | null;
  name: string;
  email: string;
  enrollmentYear: number;
  currentSemester: number;
  cumulativeGpa: number | null;
  isActive: boolean;
  major: Major;
  advisor?: Advisor | null;
}

export interface Exam {
  examId: string;
  enrollmentId: string;
  examType: ExamType;
  score: number;
  maxScore: number;
  examDate: string | null;
  aiAnalysis: Record<string, unknown> | null;
}

export interface Enrollment {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  semester: number;
  year: number;
  finalGrade: number | null;
  letterGrade: string | null;
  status: EnrollmentStatus;
  course: Course;
  exams: Exam[];
}

export interface StudentDetail extends Student {
  enrollments: Enrollment[];
  aiReports: AIReport[];
}

// ─────────────────────────────────────────────
// AI ANALYSIS TYPES
// ─────────────────────────────────────────────

export interface DriftSignal {
  signalType: string;
  severity: Severity;
  description: string;
  affectedCourses: string[] | null;
}

export interface StrengthArea {
  domain: string;
  evidence: string;
  relevantCourses: string[];
}

export interface WeaknessArea {
  domain: string;
  evidence: string;
  relevantCourses: string[];
}

export interface MajorRecommendation {
  majorName: string;
  matchScore: number;
  reasoning: string;
  transferableCreditsEstimate: number | null;
  keyMatchingDomains: string[];
}

export interface AIAnalysisOutput {
  driftScore: number;
  driftLevel: DriftLevel;
  trajectorySummary: string;
  driftSignals: DriftSignal[];
  strengths: StrengthArea[];
  weaknesses: WeaknessArea[];
  isRerouteRecommended: boolean;
  recommendations: MajorRecommendation[] | null;
  confidence: number;
  dataGaps: string[] | null;
}

export interface AIReport {
  reportId: string;
  studentId: string;
  generatedAt: string;
  driftScore: number;
  driftLevel: DriftLevel;
  trajectorySummary: string | null;
  driftSignals: DriftSignal[] | null;
  strengths: StrengthArea[] | null;
  weaknesses: WeaknessArea[] | null;
  recommendation: {
    isRerouteRecommended: boolean;
    alternatives: MajorRecommendation[];
  } | null;
  advisorNotes: string | null;
}
