'use client';

import { useState, useEffect } from 'react';
import { getStudentSchedule, requestStudentEnrollment, dropStudentEnrollment } from '@/lib/api';

export default function CourseRegistrationPage() {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const data = await getStudentSchedule();
        setSchedule(data);
      } catch (err) {
        setError('Failed to load course schedule');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSchedule();
  }, []);

  const handleRegister = async (section: any) => {
    try {
      setActingOnId(section.sectionId);
      await requestStudentEnrollment({ sectionId: section.sectionId });
      const data = await getStudentSchedule();
      setSchedule(data);
    } catch (err: any) {
      alert(err?.message || 'Failed to register for course');
    } finally {
      setActingOnId(null);
    }
  };

  const handleDrop = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to drop this course?')) return;
    try {
      setActingOnId(enrollmentId);
      await dropStudentEnrollment(enrollmentId);
      const data = await getStudentSchedule();
      setSchedule(data);
    } catch (err) {
      alert('Failed to drop course');
    } finally {
      setActingOnId(null);
    }
  };

  if (loading) return <div className="p-6">Loading course registration...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const availableCourses = schedule?.availableCourses || [];
  const registeredCourses = schedule?.registeredCourses || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Course Registration</h1>
        <p className="text-gray-600">Register for courses or manage your current registrations.</p>
      </div>

      {/* Currently Registered */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Registered Courses ({registeredCourses.length})</h2>
        {registeredCourses.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-600">
            You haven't registered for any courses yet.
          </div>
        ) : (
          <div className="space-y-3">
            {registeredCourses.map((enrollment: any) => (
              <div
                key={enrollment.enrollmentId}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold">{enrollment.course?.code}</h3>
                  <p className="text-sm text-gray-600">{enrollment.course?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status: <span className="font-medium capitalize">{enrollment.status}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDrop(enrollment.enrollmentId)}
                  disabled={actingOnId === enrollment.enrollmentId}
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 disabled:bg-gray-300 font-medium transition-colors"
                >
                  {actingOnId === enrollment.enrollmentId ? 'Dropping...' : 'Drop'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Courses */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Courses ({availableCourses.length})</h2>
        {availableCourses.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-600">
            No courses available for registration.
          </div>
        ) : (
          <div className="space-y-3">
            {availableCourses.map((section: any) => (
              <div
                key={section.sectionId}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold">{section.course?.code} — {section.course?.name}</h3>
                  <div className="flex gap-4 text-xs text-gray-600 mt-2">
                    <span>📚 {section.course?.credits} credits</span>
                    <span>👨‍🏫 {section.instructorName || 'TBA'}</span>
                    <span>📅 {section.semester}</span>
                    <span>
                      Capacity: {section.enrolledCount || 0}/{section.capacity || 'N/A'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRegister(section)}
                  disabled={actingOnId === section.sectionId}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
                >
                  {actingOnId === section.sectionId ? 'Registering...' : 'Register'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
