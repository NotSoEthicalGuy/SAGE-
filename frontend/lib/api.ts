/**
 * SAGE — Frontend API Client (v2 — with auth headers and new endpoints)
 */

import type {
  Student,
  StudentDetail,
  Major,
  Course,
  AIAnalysisOutput,
  AIReport,
} from '../../shared/types';
import { getToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
  });

  if (res.status === 401) {
    // Token expired — clear and redirect
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sage_user');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

// ─────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────

export async function getStudents(filters?: { majorId?: string; advisorId?: string }): Promise<Student[]> {
  const params = new URLSearchParams();
  if (filters?.majorId) params.set('majorId', filters.majorId);
  if (filters?.advisorId) params.set('advisorId', filters.advisorId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON(`/students${qs}`);
}

export async function getAdminStudents(filters?: { majorId?: string; advisorId?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.majorId) params.set('majorId', filters.majorId);
  if (filters?.advisorId) params.set('advisorId', filters.advisorId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON(`/admin/students${qs}`);
}

export async function createStudent(data: any): Promise<any> {
  return fetchJSON('/admin/students', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateStudent(studentId: string, data: any): Promise<any> {
  return fetchJSON(`/admin/students/${studentId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteStudent(studentId: string): Promise<void> {
  await fetchJSON(`/admin/students/${studentId}`, { method: 'DELETE' });
}

export async function getStudent(studentId: string): Promise<StudentDetail> {
  return fetchJSON(`/students/${studentId}`);
}

// ─────────────────────────────────────────────
// AI ANALYSIS & REPORTS
// ─────────────────────────────────────────────

export async function analyzeStudent(studentId: string): Promise<AIAnalysisOutput> {
  return fetchJSON(`/students/${studentId}/analyze`, { method: 'POST' });
}

export async function getStudentReports(studentId: string): Promise<AIReport[]> {
  return fetchJSON(`/students/${studentId}/reports`);
}

export async function updateAdvisorNotes(studentId: string, reportId: string, notes: string): Promise<void> {
  await fetchJSON(`/students/${studentId}/reports/${reportId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

// ─────────────────────────────────────────────
// MAJORS
// ─────────────────────────────────────────────

export async function getMajors(): Promise<Major[]> {
  return fetchJSON('/majors');
}

export async function createMajor(data: any): Promise<Major> {
  return fetchJSON('/admin/majors', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMajor(majorId: string, data: any): Promise<Major> {
  return fetchJSON(`/admin/majors/${majorId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteMajor(majorId: string): Promise<void> {
  await fetchJSON(`/admin/majors/${majorId}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────

export async function getCourses(majorId?: string): Promise<any[]> {
  const qs = majorId ? `?majorId=${majorId}` : '';
  return fetchJSON(`/courses${qs}`);
}

export async function getCourse(courseId: string): Promise<any> {
  return fetchJSON(`/courses/${courseId}`);
}

export async function createCourse(data: any): Promise<any> {
  return fetchJSON('/courses', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCourse(courseId: string, data: any): Promise<any> {
  return fetchJSON(`/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCourse(courseId: string): Promise<void> {
  await fetchJSON(`/courses/${courseId}`, { method: 'DELETE' });
}

export async function uploadCourseMaterial(courseId: string, file: File): Promise<any> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/courses/${courseId}/materials`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function deleteCourseMaterial(courseId: string, materialId: string): Promise<void> {
  await fetchJSON(`/courses/${courseId}/materials/${materialId}`, { method: 'DELETE' });
}

export async function addCourseSkill(courseId: string, skillName: string): Promise<any> {
  return fetchJSON(`/courses/${courseId}/skills`, { method: 'POST', body: JSON.stringify({ skillName }) });
}

export async function deleteCourseSkill(courseId: string, skillId: string): Promise<void> {
  await fetchJSON(`/courses/${courseId}/skills/${skillId}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────
// ADVISORS
// ─────────────────────────────────────────────

export async function getAdvisors(): Promise<any[]> {
  return fetchJSON('/advisors');
}

export async function createAdvisor(data: any): Promise<any> {
  return fetchJSON('/advisors', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdvisor(advisorId: string, data: any): Promise<any> {
  return fetchJSON(`/advisors/${advisorId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteAdvisor(advisorId: string): Promise<void> {
  await fetchJSON(`/advisors/${advisorId}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────
// CLASS SESSIONS
// ─────────────────────────────────────────────

export async function getSessions(): Promise<any[]> {
  return fetchJSON('/class-sessions');
}

export async function createSession(data: any): Promise<any> {
  return fetchJSON('/class-sessions', { method: 'POST', body: JSON.stringify(data) });
}

export async function getSessionAttendance(sessionId: string): Promise<any[]> {
  return fetchJSON(`/class-sessions/${sessionId}/attendance`);
}

export async function markAttendance(sessionId: string, attendance: { studentId: string; present: boolean }[]): Promise<void> {
  await fetchJSON(`/class-sessions/${sessionId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ attendance }),
  });
}

// ─────────────────────────────────────────────
// AI CHAT
// ─────────────────────────────────────────────

export async function chatAboutStudent(
  studentId: string,
  message: string,
  history: { role: string; content: string }[]
): Promise<{ reply: string }> {
  return fetchJSON(`/students/${studentId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

// ─────────────────────────────────────────────
// ACADEMIC DNA
// ─────────────────────────────────────────────

export async function getAcademicDNA(studentId: string): Promise<any> {
  return fetchJSON(`/students/${studentId}/dna`, { method: 'POST' });
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────

export async function getStats(): Promise<any> {
  return fetchJSON('/stats');
}

// ─────────────────────────────────────────────
// SAGE AI (Admin/Advisor)
// ─────────────────────────────────────────────

export async function chatWithSage(payload: {
  message: string;
  history?: { role: string; content: string }[];
  studentId?: string;
}): Promise<{ reply: string }> {
  return fetchJSON('/sage/chat', { method: 'POST', body: JSON.stringify(payload) });
}

// ─────────────────────────────────────────────
// ADMIN SIS
// ─────────────────────────────────────────────

export async function getAdminUsers(filters?: { role?: string; majorId?: string; advisorId?: string; isActive?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.role) params.set('role', filters.role);
  if (filters?.majorId) params.set('majorId', filters.majorId);
  if (filters?.advisorId) params.set('advisorId', filters.advisorId);
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON(`/admin/users${qs}`);
}

export async function createAdminUser(data: any) {
  return fetchJSON('/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminUser(id: string, data: any) {
  return fetchJSON(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deactivateAdminUser(id: string, role?: string) {
  const qs = role ? `?role=${role}` : '';
  return fetchJSON(`/admin/users/${id}${qs}`, { method: 'DELETE' });
}

export async function transferStudentMajor(studentId: string, majorId: string) {
  return fetchJSON(`/admin/students/${studentId}/major`, { method: 'PUT', body: JSON.stringify({ majorId }) });
}

export async function updateEnrollmentGrade(studentId: string, enrollmentId: string, finalGrade?: number, letterGrade?: string) {
  return fetchJSON(`/admin/students/${studentId}/grade`, {
    method: 'PUT',
    body: JSON.stringify({ enrollmentId, finalGrade, letterGrade }),
  });
}

export async function uploadMajorPdf(majorId: string, file: File) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/admin/majors/${majorId}/pdf`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function addMajorProgramCourse(majorId: string, data: any) {
  return fetchJSON(`/admin/majors/${majorId}/courses`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getAdminCourses(majorId?: string) {
  const qs = majorId ? `?majorId=${majorId}` : '';
  return fetchJSON(`/admin/courses${qs}`);
}

export async function createAdminCourse(data: any) {
  return fetchJSON('/admin/courses', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminCourse(courseId: string, data: any) {
  return fetchJSON(`/admin/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function getAdminSections() {
  return fetchJSON('/admin/sections');
}

export async function getAdminEnrollments() {
  return fetchJSON('/admin/enrollments');
}

export async function getAdminGrades() {
  return fetchJSON('/admin/grades');
}

export async function getAdminPayments() {
  return fetchJSON('/admin/payments');
}

export async function updatePaymentSlip(paymentSlipId: string, data: any) {
  return fetchJSON(`/admin/payments/${paymentSlipId}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ─────────────────────────────────────────────
// ADVISOR SIS
// ─────────────────────────────────────────────

export async function getAdvisorStudents() {
  return fetchJSON('/advisor/students');
}

export async function getAdvisorStudent(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}`);
}

export async function lookupAdvisorStudentById(studentId: string) {
  return fetchJSON(`/advisor/students/by-id/${encodeURIComponent(studentId)}`);
}

export async function getAdvisorStudentHistory(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/history`);
}

export async function getAdvisorStudentPos(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/pos`);
}

export async function getAdvisorSections() {
  return fetchJSON('/advisor/sections');
}

export async function createAdvisorSection(data: any) {
  return fetchJSON('/advisor/sections', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdvisorSection(sectionId: string, data: any) {
  return fetchJSON(`/advisor/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function toggleAdvisorSection(sectionId: string, isOpen: boolean) {
  return fetchJSON(`/advisor/sections/${sectionId}/open`, { method: 'PUT', body: JSON.stringify({ isOpen }) });
}

export async function setAdvisorSectionExam(sectionId: string, data: any) {
  return fetchJSON(`/advisor/sections/${sectionId}/exam`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function getAdvisorEnrollments() {
  return fetchJSON('/advisor/enrollments');
}

export async function approveAdvisorEnrollment(enrollmentId: string) {
  return fetchJSON(`/advisor/enrollments/${enrollmentId}/approve`, { method: 'PUT' });
}

export async function registerAdvisorEnrollment(data: any) {
  return fetchJSON('/advisor/enrollments', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdvisorEnrollmentAttendance(enrollmentId: string, records: any[]) {
  return fetchJSON(`/advisor/enrollments/${enrollmentId}/attendance`, { method: 'PUT', body: JSON.stringify({ records }) });
}

export async function sendAdvisorComment(data: any) {
  return fetchJSON('/advisor/comments', { method: 'POST', body: JSON.stringify(data) });
}

export async function getAdvisorComments(studentId: string) {
  return fetchJSON(`/advisor/comments/${studentId}`);
}

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

// ─────────────────────────────────────────────
// STUDENT SIS
// ─────────────────────────────────────────────

export async function getStudentProfile() {
  return fetchJSON('/student/profile');
}

export async function getStudentSchedule() {
  return fetchJSON('/student/schedule');
}

export async function getStudentPos() {
  return fetchJSON('/student/pos');
}

export async function getStudentGrades() {
  return fetchJSON('/student/grades');
}

export async function getStudentExams() {
  return fetchJSON('/student/exams');
}

export async function getStudentPayments() {
  return fetchJSON('/student/payments');
}

export async function getStudentComments() {
  return fetchJSON('/student/comments');
}

export async function markStudentCommentRead(commentId: string) {
  return fetchJSON(`/student/comments/${commentId}/read`, { method: 'PUT' });
}

export async function requestStudentEnrollment(data: any) {
  return fetchJSON('/student/enrollments', { method: 'POST', body: JSON.stringify(data) });
}

export async function dropStudentEnrollment(enrollmentId: string) {
  return fetchJSON(`/student/enrollments/${enrollmentId}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────
// STUDENT ANALYTICS
// ─────────────────────────────────────────────

export async function getStudentPosProgress(studentId: string) {
  return fetchJSON<{
    completedCredits: number;
    totalCredits: number;
    pct: number;
    graduationEstimate: string | null;
    onTrack: boolean;
  }>(`/students/${studentId}/pos-progress`);
}

export async function getStudentAcademicStanding(studentId: string) {
  return fetchJSON<{
    standing: string;
    label: string;
    colorKey: string;
    gpa: number;
  }>(`/students/${studentId}/academic-standing`);
}

export async function getStudentGradeTrend(studentId: string) {
  return fetchJSON<{
    semesters: { label: string; avgGrade: number }[];
    hasEnoughData: boolean;
  }>(`/students/${studentId}/grade-trend`);
}

export async function getStudentRecommendedCourses(studentId: string) {
  return fetchJSON<{
    courses: { code: string; name: string; credits: number; recommendedSemester: number }[];
  }>(`/students/${studentId}/recommended-courses`);
}

export async function getStudentPrerequisiteViolations(studentId: string) {
  return fetchJSON<{
    violations: { courseName: string; missingPrereq: string }[];
  }>(`/students/${studentId}/prerequisite-violations`);
}

export async function getStudentAdvisorMessages(studentId: string) {
  return fetchJSON<{
    flags: { flagId: string; note: string; createdAt: string }[];
  }>(`/students/${studentId}/advisor-messages`);
}

export async function getStudentAppointments(studentId: string) {
  return fetchJSON<any[]>(`/students/${studentId}/appointments`);
}

export async function createStudentAppointment(
  studentId: string,
  data: { topic: string; requestedDate: string; notes?: string }
) {
  return fetchJSON<any>(`/students/${studentId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────
// ADVISOR APPOINTMENTS
// ─────────────────────────────────────────────

export async function getAdvisorAppointments(filters?: { status?: string }) {
  const qs = filters?.status ? `?status=${filters.status}` : '';
  return fetchJSON<any[]>(`/advisor/appointments${qs}`);
}

export async function updateAdvisorAppointment(
  appointmentId: string,
  data: { status: string; advisorResponse?: string; cancellationReason?: string }
) {
  return fetchJSON<any>(`/advisor/appointments/${appointmentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────
// ADVISOR ANALYTICS
// ─────────────────────────────────────────────

export async function getStudentGraduationPathway(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/graduation-pathway`);
}

export async function generateGraduationPathway(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/graduation-pathway`, { method: 'POST' });
}

export async function generateAlternativePathway(studentId: string, targetMajorId: string) {
  return fetchJSON(`/advisor/students/${studentId}/graduation-pathway/alternative`, {
    method: 'POST',
    body: JSON.stringify({ targetMajorId }),
  });
}

export async function getStudentFlags(studentId: string, activeOnly?: boolean) {
  const qs = activeOnly ? '?active=true' : '';
  return fetchJSON(`/advisor/students/${studentId}/flags${qs}`);
}

export async function createStudentFlag(studentId: string, data: { flagType: string; note: string; isVisibleToStudent: boolean }) {
  return fetchJSON(`/advisor/students/${studentId}/flags`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateFlag(flagId: string, data: Partial<{ resolvedAt: string | null; note: string; isVisibleToStudent: boolean }>) {
  return fetchJSON(`/advisor/flags/${flagId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteFlag(flagId: string) {
  return fetchJSON(`/advisor/flags/${flagId}`, { method: 'DELETE' });
}

export async function runAdvisorTriage() {
  return fetchJSON('/advisor/triage', { method: 'POST' });
}

export async function getLatestTriage() {
  return fetchJSON('/advisor/triage/latest');
}

export async function getStudentInterventions(studentId: string) {
  return fetchJSON(`/advisor/students/${studentId}/interventions`);
}

export async function createStudentIntervention(studentId: string, data: { interventionType: string; notes?: string; interventionDate: string }) {
  return fetchJSON(`/advisor/students/${studentId}/interventions`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getInterventionEffectiveness() {
  return fetchJSON('/advisor/intervention-effectiveness');
}

export async function getAdvisorMajors() {
  return fetchJSON('/majors');
}

// ─────────────────────────────────────────────
// PROGRAM OF STUDY
// ─────────────────────────────────────────────

export async function getMajorPos(majorId: string) {
  return fetchJSON(`/pos/majors/${majorId}`);
}

export async function getStudentPosNew(studentId: string) {
  return fetchJSON(`/pos/students/${studentId}`);
}

export async function getStudentPosSummary(studentId: string) {
  return fetchJSON(`/pos/students/${studentId}/summary`);
}

export async function addPosRequirement(majorId: string, data: { courseId: string; requirementType: string; recommendedSemester: number; requirementGroup: string }) {
  return fetchJSON(`/pos/majors/${majorId}/requirements`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePosRequirement(id: string, data: { requirementType?: string; recommendedSemester?: number; requirementGroup?: string }) {
  return fetchJSON(`/pos/requirements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deletePosRequirement(id: string) {
  return fetchJSON(`/pos/requirements/${id}`, { method: 'DELETE' });
}
