'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getAdvisorAppointments } from '@/lib/api';
import {
  Sidebar, HomeIcon, UsersIcon, LayersIcon, CalendarIcon,
  MessageIcon, UserIcon, SparkleIcon, UserPlusIcon, SendIcon, BookOpenIcon,
} from '@/components/Sidebar';

const intelligenceItems = [
  { href: '/advisor/sage', label: 'Sage AI', icon: <SparkleIcon /> },
];

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useMemo(() => getAuthUser(), []);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    getAdvisorAppointments({ status: 'pending' })
      .then(list => setPendingCount(list.length))
      .catch(() => {});
  }, [user, router]);

  const mainItems = [
    { href: '/advisor/dashboard',           label: 'Dashboard',                icon: <HomeIcon /> },
    { href: '/advisor/students',            label: 'My Students',              icon: <UsersIcon /> },
    { href: '/advisor/sections',            label: 'Sections',                 icon: <LayersIcon /> },
    { href: '/advisor/enrollments',         label: 'Enrollments',              icon: <CalendarIcon /> },
    { href: '/advisor/comments',            label: 'Comments',                 icon: <MessageIcon /> },
    { href: '/advisor/appointments',        label: 'Appointments',             icon: <CalendarIcon />, count: pendingCount },
    { href: '/advisor/student-information', label: 'Student Information',      icon: <UserIcon /> },
    { href: '/advisor/new-student',         label: 'New Student Registration', icon: <UserPlusIcon /> },
    { href: '/advisor/broadcast',           label: 'Broadcast Comments',       icon: <SendIcon /> },
    { href: '/advisor/course-offering',     label: 'Course Offering',          icon: <BookOpenIcon /> },
  ];

  return (
    <div className="sage-shell">
      <Sidebar items={mainItems} intelligenceItems={intelligenceItems} role="advisor" />
      <div className="sage-main">{children}</div>
    </div>
  );
}
