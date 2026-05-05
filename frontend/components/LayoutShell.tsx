'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearAuthUser, getAuthUser } from '@/lib/auth';
import { LogoWordmark } from '@/components/Logo';
import {
  HomeIcon, BookIcon, ClipboardIcon, CalendarIcon,
  GradesIcon, DollarIcon, SurveyIcon, UserIcon,
} from '@/components/Sidebar';

const links = [
  { label: 'Dashboard',    to: '/dashboard',              icon: <HomeIcon /> },
  { label: 'Academic Life', to: '/academic/holds',         icon: <BookIcon /> },
  { label: 'Registration',  to: '/registration/register',  icon: <ClipboardIcon /> },
  { label: 'Schedules',     to: '/schedules/mine',         icon: <CalendarIcon /> },
  { label: 'Grades',        to: '/grades',                 icon: <GradesIcon /> },
  { label: 'Program of Study', to: '/student/pos',         icon: <BookIcon /> },
  { label: 'Appointments',  to: '/appointments',           icon: <CalendarIcon /> },
  { label: 'Accounting',    to: '/accounting/statement',   icon: <DollarIcon /> },
  { label: 'Surveys',       to: '/surveys/evaluation',     icon: <SurveyIcon /> },
  { label: 'Profile',       to: '/profile',                icon: <UserIcon /> },
];

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="14" height="14">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const u = getAuthUser();
    setUser(u);
    setMounted(true);
    if (!u) router.push('/login');
  }, [router]);

  const logout = () => {
    clearAuthUser();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="sage-shell">
      {/* Student sidebar */}
      <aside className="sage-sidebar">
        <div className="sage-sidebar-logo">
          <LogoWordmark context="dark" showTagline />
        </div>

        {/* Welcome block */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--ob-3)',
        }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#e4e4e7', marginBottom: '6px', lineHeight: 1.2 }}>
            {mounted ? (user?.name || 'Student') : ' '}
          </div>
          <div style={{
            display: 'inline-block',
            background: 'var(--ob-3)',
            color: 'var(--ob-6)',
            borderRadius: '2px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '2px 6px',
          }}>
            {mounted ? (user?.studentNumber || user?.studentId || 'N/A') : '···'}
          </div>
        </div>

        <nav className="sage-nav">
          <div className="sage-sidebar-section">Student</div>
          {links.map((link) => {
            const active =
              pathname === link.to ||
              (link.to !== '/dashboard' && pathname.startsWith(link.to));
            return (
              <Link key={link.to} href={link.to} className={`sage-nav-item ${active ? 'active' : ''}`}>
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="sage-sidebar-footer">
          <div className="sage-sidebar-user">
            <div className="sage-sidebar-avatar">
              {mounted ? initials : '??'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sage-sidebar-user-name">
                {mounted ? (user?.name || 'Student') : 'Loading…'}
              </div>
              <div className="sage-sidebar-user-role">student</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ob-5)', padding: '4px', borderRadius: '3px',
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c4c4c8')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ob-5)')}
            >
              <LogOutIcon />
            </button>
          </div>
        </div>
      </aside>

      <div className="sage-main">{children}</div>
    </div>
  );
}
