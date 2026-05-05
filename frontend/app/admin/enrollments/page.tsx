'use client';

import { useEffect, useState } from 'react';
import { getAdminEnrollments } from '@/lib/api';

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminEnrollments()
      .then((data) => setEnrollments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Enrollments</div>
        <div className="sage-page-sub">Track registration requests and statuses</div>
      </div>
      <div className="sage-body">
        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading enrollments...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.enrollmentId}>
                    <td>{enrollment.student?.name}</td>
                    <td>{enrollment.course?.code} — {enrollment.course?.name}</td>
                    <td>{enrollment.section?.semester || '—'}</td>
                    <td>{enrollment.status}</td>
                    <td>{enrollment.requestedAt ? new Date(enrollment.requestedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {enrollments.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">No enrollments found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
