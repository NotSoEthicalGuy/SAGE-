'use client';

import { useState, useEffect } from 'react';
import LayoutShell from '@/components/LayoutShell';
import { getStudentProfile } from '@/lib/api';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getStudentProfile();
        setProfile(data);
      } catch (err) {
        setError('Failed to load profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <LayoutShell>
        <div className="p-6">Loading profile...</div>
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

  if (!profile) {
    return (
      <LayoutShell>
        <div className="p-6">Profile not found</div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-gray-600">View and manage your personal information.</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-gray-600 mt-1">{profile.studentNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Contact Information</h3>
              <div className="space-y-3">
                <DetailItem label="Email" value={profile.email} />
                <DetailItem label="Student Number" value={profile.studentNumber} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Academic Information</h3>
              <div className="space-y-3">
                <DetailItem label="Major" value={profile.major?.name || 'Not assigned'} />
                <DetailItem label="Status" value={profile.status || 'Active'} />
                <DetailItem label="GPA" value={profile.gpa ? profile.gpa.toFixed(2) : 'N/A'} />
              </div>
            </div>
          </div>

          {profile.enrolledAt && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Enrolled Since:</span> {new Date(profile.enrolledAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink href="/schedule" title="My Schedule" icon="📅" />
          <QuickLink href="/grades" title="My Grades" icon="📊" />
          <QuickLink href="/registration" title="Registrations" icon="📝" />
        </div>
      </div>
    </LayoutShell>
  );
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-medium mt-1">{value || '-'}</p>
    </div>
  );
}

function QuickLink({ href, title, icon }: { href: string; title: string; icon: string }) {
  return (
    <a
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all text-center"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-medium">{title}</p>
    </a>
  );
}
