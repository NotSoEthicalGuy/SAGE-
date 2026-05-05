'use client';

import { useState, useEffect } from 'react';
import LayoutShell from '@/components/LayoutShell';
import { getStudentGrades, getStudentProfile } from '@/lib/api';

export default function GradesPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSemester, setFilterSemester] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [gradesData, profileData] = await Promise.all([
          getStudentGrades(),
          getStudentProfile(),
        ]);
        setEnrollments(gradesData);
        setProfile(profileData);
      } catch (err) {
        setError('Failed to load grades');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <LayoutShell>
        <div className="p-6">Loading grades...</div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell>
        <div className="p-6 text-red-600">{error}</div>
      </LayoutShell>
    );
  }

  // Get unique semesters
  const semesters = Array.from(new Set(enrollments.map((e) => e.section?.semester).filter(Boolean)));
  const filteredEnrollments = filterSemester === 'all' 
    ? enrollments 
    : enrollments.filter((e) => e.section?.semester === filterSemester);

  // Calculate GPA
  const gpa = profile?.gpa?.toFixed(2) || 'N/A';
  const completedCredits = enrollments
    .filter((e) => e.status === 'approved' && e.finalGrade)
    .reduce((sum, e) => sum + (e.section?.course?.credits || 0), 0);

  return (
    <LayoutShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Grades</h1>
          <p className="text-gray-600">View your course grades and academic performance.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Current GPA" value={gpa} />
          <StatCard label="Completed Credits" value={completedCredits} />
          <StatCard label="Courses Completed" value={enrollments.filter((e) => e.status === 'approved').length} />
        </div>

        {/* Semester Filter */}
        {semesters.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilterSemester('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterSemester === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              All Semesters
            </button>
            {semesters.map((semester) => (
              <button
                key={semester}
                onClick={() => setFilterSemester(semester)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterSemester === semester
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {semester}
              </button>
            ))}
          </div>
        )}

        {/* Grades Table */}
        {filteredEnrollments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No grades available yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Course</th>
                    <th className="text-left py-3 px-4 font-semibold">Course Title</th>
                    <th className="text-center py-3 px-4 font-semibold">Credits</th>
                    <th className="text-center py-3 px-4 font-semibold">Grade</th>
                    <th className="text-center py-3 px-4 font-semibold">Semester</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{enrollment.section?.course?.code}</td>
                      <td className="py-3 px-4">{enrollment.section?.course?.title}</td>
                      <td className="text-center py-3 px-4">{enrollment.section?.course?.credits}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-semibold ${getGradeColor(enrollment.finalGrade)}`}>
                          {enrollment.finalGrade || '-'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4 text-sm">{enrollment.section?.semester}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
                          enrollment.status === 'approved' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-gray-600 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function getGradeColor(grade: string | null | undefined): string {
  if (!grade) return 'text-gray-600';
  const gradeNum = parseFloat(grade);
  if (gradeNum >= 90) return 'text-green-600';
  if (gradeNum >= 80) return 'text-blue-600';
  if (gradeNum >= 70) return 'text-yellow-600';
  return 'text-red-600';
}
