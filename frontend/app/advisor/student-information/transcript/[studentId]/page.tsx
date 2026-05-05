'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAdvisorStudentHistory, lookupAdvisorStudentById } from '@/lib/api';

export default function AdvisorStudentTranscriptPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [studentData, historyData] = await Promise.all([
          lookupAdvisorStudentById(studentId),
          getAdvisorStudentHistory(studentId),
        ]);
        setStudent(studentData);
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load transcript');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of history) {
      const key = `${e.year}-S${e.semester}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [history]);

  if (loading) return <div className="p-6">Loading transcript...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Transcript</h1>
          <p className="text-gray-600">
            {(student?.studentNumber || student?.studentId || studentId) + ' - ' + (student?.name || 'Student')}
          </p>
        </div>
        <Link href="/advisor/student-information" className="btn btn-ghost btn-sm">
          Back
        </Link>
      </div>

      {grouped.map(([semesterKey, enrollments]) => (
        <div key={semesterKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold">{semesterKey}</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 px-4">Course</th>
                  <th className="text-left py-2 px-4">Title</th>
                  <th className="text-left py-2 px-4">Credits</th>
                  <th className="text-left py-2 px-4">Grade</th>
                  <th className="text-left py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e: any) => (
                  <tr key={e.enrollmentId} className="border-b border-gray-100">
                    <td className="py-2 px-4">{e.course?.code || '-'}</td>
                    <td className="py-2 px-4">{e.course?.name || e.course?.title || '-'}</td>
                    <td className="py-2 px-4">{e.course?.credits ?? '-'}</td>
                    <td className="py-2 px-4">{e.letterGrade || (e.finalGrade ?? '-')}</td>
                    <td className="py-2 px-4 capitalize">{e.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-600">
          No transcript records found.
        </div>
      )}
    </div>
  );
}
