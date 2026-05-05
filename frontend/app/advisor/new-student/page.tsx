'use client';

import { useState, useEffect } from 'react';
import { getMajors, createAdvisorStudent } from '@/lib/api';

export default function NewStudentPage() {
  const [majors, setMajors] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    studentNumber: '',
    phoneNumber: '',
    password: '',
    majorId: '',
    enrollmentYear: new Date().getFullYear(),
    currentSemester: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMajors().then(setMajors).catch(() => {});
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const student = await createAdvisorStudent({
        ...form,
        enrollmentYear: Number(form.enrollmentYear),
        currentSemester: Number(form.currentSemester),
      });
      setSuccess({ name: student.name, email: student.email });
      setForm({
        name: '',
        email: '',
        studentNumber: '',
        phoneNumber: '',
        password: '',
        majorId: '',
        enrollmentYear: new Date().getFullYear(),
        currentSemester: 1,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create student account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Student Registration</h1>
        <p className="text-gray-600 mt-1">
          Create a student account. The student can log in with their email and the password you set.
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="font-semibold text-green-800">Account created successfully</p>
          <p className="text-green-700 text-sm mt-1">
            <strong>{success.name}</strong> can now log in with <strong>{success.email}</strong>
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
          <input
            type="text"
            value={form.studentNumber}
            onChange={set('studentNumber')}
            required
            pattern="S[0-9]{7}"
            placeholder="S1234567"
            title="Must start with S followed by exactly 7 digits (e.g. S1234567)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lebanese Phone</label>
          <input
            type="tel"
            value={form.phoneNumber}
            onChange={set('phoneNumber')}
            required
            placeholder="+961XXXXXXXX"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
          <select
            value={form.majorId}
            onChange={set('majorId')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a major</option>
            {majors.map((m) => (
              <option key={m.majorId} value={m.majorId}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Year</label>
          <input
            type="number"
            value={form.enrollmentYear}
            onChange={set('enrollmentYear')}
            required
            min={2000}
            max={2100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Starting Semester</label>
          <select
            value={form.currentSemester}
            onChange={set('currentSemester')}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>Semester {n}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Creating Account…' : 'Create Student Account'}
        </button>
      </form>
    </div>
  );
}
