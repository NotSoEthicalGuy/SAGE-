'use client';

import { useState, useEffect } from 'react';
import { getAllCoursesForAdvisor, createAdvisorSection } from '@/lib/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

type OfferForm = {
  instructorName: string;
  scheduleDays: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleRoom: string;
  capacity: string;
  semester: string;
};

const EMPTY_FORM: OfferForm = {
  instructorName: '',
  scheduleDays: [],
  scheduleStartTime: '',
  scheduleEndTime: '',
  scheduleRoom: '',
  capacity: '',
  semester: '',
};

export default function CourseOfferingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllCoursesForAdvisor()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const majors = Array.from(new Map(courses.map((c) => [c.major.majorId, c.major.name])).entries()).map(
    ([id, name]) => ({ id, name })
  );

  const filtered = courses.filter((c) => {
    const matchesSearch =
      !search ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase());
    const matchesMajor = !majorFilter || c.major.majorId === majorFilter;
    return matchesSearch && matchesMajor;
  });

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      scheduleDays: f.scheduleDays.includes(day)
        ? f.scheduleDays.filter((d) => d !== day)
        : [...f.scheduleDays, day],
    }));
  };

  const handleOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (form.scheduleDays.length === 0) { setError('Select at least one schedule day'); return; }
    if (form.scheduleEndTime <= form.scheduleStartTime) { setError('End time must be after start time'); return; }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await createAdvisorSection({
        courseId: selectedCourse.courseId,
        semester: form.semester,
        instructorName: form.instructorName,
        capacity: Number(form.capacity),
        scheduleDays: form.scheduleDays,
        scheduleStartTime: form.scheduleStartTime,
        scheduleEndTime: form.scheduleEndTime,
        scheduleRoom: form.scheduleRoom,
        isOpen: true,
      });
      setSuccess(`${selectedCourse.code} — ${selectedCourse.name} is now open for registration.`);
      setSelectedCourse(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err.message || 'Failed to create offering');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Course Offering</h1>
        <p className="text-gray-600 mt-1">Select a course from the catalog and open it for student registration.</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="text-green-800 font-medium">{success}</p>
          <p className="text-green-700 text-sm mt-1">Students can now request enrollment from their registration page.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by code or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={majorFilter}
          onChange={(e) => setMajorFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Majors</option>
          {majors.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Course Table */}
      {loading ? (
        <p className="text-gray-500">Loading courses…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Course Name</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Credits</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Major</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No courses found.</td>
                  </tr>
                ) : (
                  filtered.map((course) => (
                    <tr key={course.courseId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{course.code}</td>
                      <td className="py-3 px-4">{course.name}</td>
                      <td className="py-3 px-4 text-center">{course.credits}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{course.major.name}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => { setSelectedCourse(course); setError(null); setSuccess(null); setForm(EMPTY_FORM); }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Offer This Course
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offering Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Offer Course</h2>
              <p className="text-gray-600 text-sm mt-1">
                {selectedCourse.code} — {selectedCourse.name}
              </p>
            </div>

            <form onSubmit={handleOffer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Name</label>
                <input
                  type="text"
                  value={form.instructorName}
                  onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.scheduleDays.includes(day)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.scheduleStartTime}
                    onChange={(e) => setForm({ ...form, scheduleStartTime: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.scheduleEndTime}
                    onChange={(e) => setForm({ ...form, scheduleEndTime: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input
                  type="text"
                  value={form.scheduleRoom}
                  onChange={(e) => setForm({ ...form, scheduleRoom: e.target.value })}
                  required
                  placeholder="e.g. A101"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  required
                  min={1}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <input
                  type="text"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  required
                  placeholder="e.g. Fall 2025"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? 'Offering...' : 'Open for Registration'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedCourse(null); setError(null); }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
