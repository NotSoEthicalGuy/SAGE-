'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import {
  Sidebar, HomeIcon, UsersIcon, BookIcon, LayersIcon,
  CalendarIcon, GradesIcon, DollarIcon, SettingsIcon, UserIcon,
} from '@/components/Sidebar';

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

const adminItems = [
  { href: '/admin/dashboard',      label: 'Dashboard',           icon: <HomeIcon /> },
  { href: '/admin/users/students', label: 'Students',            icon: <UsersIcon /> },
  { href: '/admin/users/advisors', label: 'Advisors',            icon: <UserIcon /> },
  { href: '/admin/majors',         label: 'Majors & Curriculum', icon: <BookIcon /> },
  { href: '/admin/courses',        label: 'Courses',             icon: <BuildingIcon /> },
  { href: '/admin/sections',       label: 'Sections',            icon: <LayersIcon /> },
  { href: '/admin/enrollments',    label: 'Enrollments',         icon: <CalendarIcon /> },
  { href: '/admin/grades',         label: 'Grades',              icon: <GradesIcon /> },
  { href: '/admin/payments',       label: 'Payments',            icon: <DollarIcon /> },
  { href: '/admin/settings',       label: 'Settings',            icon: <SettingsIcon /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useMemo(() => getAuthUser(), []);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  return (
    <div className="sage-shell">
      <Sidebar items={adminItems} role="admin" />
      <div className="sage-main">{children}</div>
    </div>
  );
}
