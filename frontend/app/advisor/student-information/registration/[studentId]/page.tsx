'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getAdvisorSections,
  getAdvisorStudent,
  lookupAdvisorStudentById,
  registerAdvisorEnrollment,
} from '@/lib/api';

function toSemesterYear(raw: any): { semester: number; year: number } {
  const yearNow = new Date().getFullYear();
  if (typeof raw === 'string') {
    const yMatch = raw.match(/(20\d{2})/);
    const sMatch = raw.match(/(?:-|\/|s)(\d)$/i);
    return {
      year: yMatch ? Number(yMatch[1]) : yearNow,
      semester: sMatch ? Number(sMatch[1]) : 1,
    };
  }
  return { year: yearNow, semester: 1 };
}

export default function AdvisorStudentRegistrationPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [student, setStudent] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [majorMatch, setMajorMatch] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingSectionId, setActingSectionId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const basic = await lookupAdvisorStudentById(studentId) as any;
        setMajorMatch(Boolean(basic.majorMatch));

        if (!basic.majorMatch) {
          setStudent({
            ...basic,
            enrollments: [],
          });
          setSections([]);
          return;
        }

        const [studentData, sectionData] = await Promise.all([
          getAdvisorStudent(studentId),
          getAdvisorSections(),
        ]);
        setStudent(studentData);
        setSections(Array.isArray(sectionData) ? sectionData : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load registration details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  const enrolledCourseIds = useMemo(
    () =>
      new Set(
        (student?.enrollments || [])
          .filter((e: any) => ['registered', 'approved', 'in_progress', 'pending'].includes(e.status))
          .map((e: any) => e.courseId)
      ),
    [student]
  );

  const handleRegister = async (section: any) => {
    if (!student) return;
    setActingSectionId(section.sectionId);
    setError(null);
    try {
      const semYear = toSemesterYear(section.semester);
      await registerAdvisorEnrollment({
        studentId: student.studentId,
        sectionId: section.sectionId,
        courseId: section.courseId,
        semester: semYear.semester,
        year: semYear.year,
      });
      const refreshed = await getAdvisorStudent(studentId);
      setStudent(refreshed);
    } catch (err: any) {
      setError(err?.message || 'Failed to register student');
    } finally {
      setActingSectionId(null);
    }
  };

  if (loading) return <div className="p-6">Loading student registration...</div>;
  if (error && !student) return <div className="p-6 text-red-600">{error}</div>;
  if (!student) return <div className="p-6">Student not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Registration</h1>
          <p className="text-gray-600">
            {(student.studentNumber || student.studentId) + ' - ' + student.name}
          </p>
        </div>
        <Link href="/advisor/student-information" className="btn btn-ghost btn-sm">
          Back
        </Link>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {!majorMatch && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          Registration is disabled because this student is not in your assigned major.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 font-semibold">Current registrations</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-2 px-4">Course</th>
                <th className="text-left py-2 px-4">Semester</th>
                <th className="text-left py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(student.enrollments || []).map((enrollment: any) => (
                <tr key={enrollment.enrollmentId} className="border-b border-gray-100">
                  <td className="py-2 px-4">{enrollment.course?.code || '-'}</td>
                  <td className="py-2 px-4">{`${enrollment.year}-${enrollment.semester}`}</td>
                  <td className="py-2 px-4 capitalize">{enrollment.status}</td>
                </tr>
              ))}
              {(student.enrollments || []).length === 0 && (
                <tr>
                  <td className="py-4 px-4 text-gray-500" colSpan={3}>
                    No registrations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 font-semibold">Available sections</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-2 px-4">Course</th>
                <th className="text-left py-2 px-4">Section</th>
                <th className="text-left py-2 px-4">Semester</th>
                <th className="text-left py-2 px-4">Capacity</th>
                <th className="text-center py-2 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section: any) => {
                const alreadyRegistered = enrolledCourseIds.has(section.courseId);
                return (
                  <tr key={section.sectionId} className="border-b border-gray-100">
                    <td className="py-2 px-4">{section.course?.code || '-'}</td>
                    <td className="py-2 px-4">{section.sectionNumber || '-'}</td>
                    <td className="py-2 px-4">{section.semester || '-'}</td>
                    <td className="py-2 px-4">{section.capacity ?? '-'}</td>
                    <td className="py-2 px-4 text-center">
                      <button
                        className="btn btn-sm btn-amber disabled:opacity-60"
                        disabled={!majorMatch || alreadyRegistered || actingSectionId === section.sectionId}
                        onClick={() => handleRegister(section)}
                      >
                        {actingSectionId === section.sectionId
                          ? 'Registering...'
                          : alreadyRegistered
                          ? 'Registered'
                          : 'Register'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sections.length === 0 && (
                <tr>
                  <td className="py-4 px-4 text-gray-500" colSpan={5}>
                    No sections available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
