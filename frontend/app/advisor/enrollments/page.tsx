'use client';

import { useState, useEffect } from 'react';
import {
  getAdvisorEnrollments,
  approveAdvisorEnrollment,
  updateAdvisorEnrollmentAttendance,
} from '@/lib/api';

export default function AdvisorEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'dropped'>('all');
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    async function loadEnrollments() {
      try {
        const data = await getAdvisorEnrollments();
        setEnrollments(data as any[]);
      } catch (err) {
        setError('Failed to load enrollments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadEnrollments();
  }, []);

  const handleApprove = async (enrollmentId: string) => {
    try {
      setApproving(enrollmentId);
      await approveAdvisorEnrollment(enrollmentId);
      setEnrollments(
        enrollments.map((e) =>
          e.enrollmentId === enrollmentId ? { ...e, status: 'approved', approvedAt: new Date() } : e
        )
      );
    } catch (err) {
      alert('Failed to approve enrollment');
      console.error(err);
    } finally {
      setApproving(null);
    }
  };

  const filteredEnrollments = enrollments.filter((e) => {
    if (filterStatus === 'all') return true;
    return e.status === filterStatus;
  });

  if (loading) return <div className="p-6">Loading enrollments...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enrollment Requests</h1>
        <p className="text-gray-600">Manage student enrollment requests for your major.</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'dropped'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {status === 'dropped' ? 'Dropped' : status}
          </button>
        ))}
      </div>

      {filteredEnrollments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No {filterStatus === 'all' ? 'enrollments' : filterStatus + ' enrollments'} found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Student</th>
                  <th className="text-left py-3 px-4 font-semibold">Course</th>
                  <th className="text-left py-3 px-4 font-semibold">Section #</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Requested</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.map((enrollment) => (
                  <tr key={enrollment.enrollmentId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{enrollment.student?.name || 'Unknown Student'}</p>
                        <p className="text-sm text-gray-600">{enrollment.student?.studentNumber || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span style={{ fontWeight: 500 }}>{enrollment.course?.code || '-'}</span>
                      {enrollment.course?.name && (
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{enrollment.course.name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {enrollment.sectionNumber ? `Section ${enrollment.sectionNumber}` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
                          enrollment.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : enrollment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {enrollment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {enrollment.requestedAt
                        ? new Date(enrollment.requestedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="text-center py-3 px-4">
                      {enrollment.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(enrollment.enrollmentId)}
                          disabled={approving === enrollment.enrollmentId}
                          className="text-green-600 hover:text-green-800 font-medium disabled:text-gray-400"
                        >
                          {approving === enrollment.id ? 'Approving...' : 'Approve'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
