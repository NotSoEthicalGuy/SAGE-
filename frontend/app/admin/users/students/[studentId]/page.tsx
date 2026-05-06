'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getStudent, updateEnrollmentGrade } from '@/lib/api';

export default function AdminStudentDetailPage() {
  const params = useParams();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeEdits, setGradeEdits] = useState<Record<string, { finalGrade?: number; letterGrade?: string }>>({});

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    getStudent(studentId)
      .then((data) => setStudent(data || null))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="loading-state">Loading student...</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (!student) return <div className="empty-state">Student not found.</div>;

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">{student.name}</div>
        <div className="sage-page-sub">{student.email} • {student.major?.name}</div>
      </div>

      <div className="sage-body">
        <div className="sage-card" style={{ marginBottom: '16px' }}>
          <div className="sage-card-header">
            <span className="sage-card-title">Profile</span>
          </div>
          <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><strong>Student ID:</strong> {student.studentNumber || student.studentId}</div>
            <div><strong>Advisor:</strong> {student.advisor?.name || 'Unassigned'}</div>
            <div><strong>Enrollment Year:</strong> {student.enrollmentYear}</div>
            <div><strong>Current Semester:</strong> {student.currentSemester}</div>
          </div>
        </div>

        <div className="sage-card">
          <div className="sage-card-header">
            <span className="sage-card-title">Grade Overrides</span>
          </div>
          <div style={{ padding: "16px 24px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Semester</th>
                  <th>Final Grade</th>
                  <th>Letter</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {student.enrollments?.map((enrollment: any) => {
                  const edit = gradeEdits[enrollment.enrollmentId] || {};
                  return (
                    <tr key={enrollment.enrollmentId}>
                      <td>{enrollment.course?.code} — {enrollment.course?.name}</td>
                      <td>{enrollment.semester} / {enrollment.year}</td>
                      <td>
                        <input
                          className="sage-input"
                          style={{ width: '80px' }}
                          type="number"
                          value={edit.finalGrade ?? enrollment.finalGrade ?? ''}
                          onChange={(e) =>
                            setGradeEdits((prev) => ({
                              ...prev,
                              [enrollment.enrollmentId]: {
                                ...prev[enrollment.enrollmentId],
                                finalGrade: e.target.value === '' ? undefined : Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="sage-input"
                          style={{ width: '60px' }}
                          value={edit.letterGrade ?? enrollment.letterGrade ?? ''}
                          onChange={(e) =>
                            setGradeEdits((prev) => ({
                              ...prev,
                              [enrollment.enrollmentId]: {
                                ...prev[enrollment.enrollmentId],
                                letterGrade: e.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-amber btn-sm"
                          onClick={async () => {
                            await updateEnrollmentGrade(student.studentId, enrollment.enrollmentId, edit.finalGrade, edit.letterGrade);
                          }}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
