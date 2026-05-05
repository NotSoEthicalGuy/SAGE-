'use client';

import { useEffect, useState } from 'react';
import { getAdminGrades, updateEnrollmentGrade } from '@/lib/api';

export default function AdminGradesPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, { finalGrade?: number; letterGrade?: string }>>({});

  const load = () => {
    setLoading(true);
    getAdminGrades()
      .then((data) => setGrades(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Grades</div>
        <div className="sage-page-sub">Admin-only grade overrides</div>
      </div>
      <div className="sage-body">
        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading grades...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Final Grade</th>
                  <th>Letter</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grades.map((enrollment) => {
                  const edit = edits[enrollment.enrollmentId] || {};
                  return (
                    <tr key={enrollment.enrollmentId}>
                      <td>{enrollment.student?.name}</td>
                      <td>{enrollment.course?.code} — {enrollment.course?.name}</td>
                      <td>
                        <input
                          className="sage-input"
                          style={{ width: '80px' }}
                          type="number"
                          value={edit.finalGrade ?? enrollment.finalGrade ?? ''}
                          onChange={(e) =>
                            setEdits((prev) => ({
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
                            setEdits((prev) => ({
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
                            await updateEnrollmentGrade(enrollment.studentId, enrollment.enrollmentId, edit.finalGrade, edit.letterGrade);
                            load();
                          }}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {grades.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">No grades found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
