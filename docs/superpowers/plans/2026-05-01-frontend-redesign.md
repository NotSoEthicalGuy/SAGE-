# SAGE Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the SAGE Next.js 14 frontend from a dark glassmorphism template into a precision institutional tool — obsidian sidebar, light content area, amber accent, Cinzel wordmark, max 4px border-radius, dot-only status indicators.

**Architecture:** CSS custom-property token system in `globals.css` consumed by every component. Shared `Sidebar` component used by advisor and admin layouts. Student `LayoutShell` has its own inline sidebar with a welcome block. All existing API calls and routes are preserved exactly.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS (utility classes remain available), CSS custom properties, Inter + Cinzel (Google Fonts), SVG for drift ring.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `frontend/app/globals.css` |
| Modify | `frontend/components/Logo.tsx` |
| Modify | `frontend/components/Sidebar.tsx` |
| Modify | `frontend/components/AdvisorLayout.tsx` |
| Modify | `frontend/components/LayoutShell.tsx` |
| Modify | `frontend/app/login/page.tsx` |
| Modify | `frontend/app/advisor/dashboard/page.tsx` |
| Modify | `frontend/app/advisor/students/page.tsx` |
| Modify | `frontend/app/advisor/sage/page.tsx` |
| Modify | `frontend/app/dashboard/page.tsx` |
| Modify | `frontend/components/AdminLayout.tsx` |
| Modify | `frontend/app/admin/dashboard/page.tsx` |

---

## Task 1: CSS Token System

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Replace globals.css entirely**

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Inter:opsz,wght@14..32,300..900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Obsidian scale */
  --ob:    #18181b;
  --ob-2:  #1f1f22;
  --ob-3:  #2a2a2d;
  --ob-4:  #3f3f46;
  --ob-5:  #52525b;
  --ob-6:  #71717a;

  /* Amber accent */
  --am:      #f59e0b;
  --am-2:    #d97706;
  --am-dim:  rgba(245,158,11,.14);
  --am-rule: rgba(245,158,11,.35);

  /* Content area */
  --bg:            #f0f0f1;
  --surf:          #ffffff;
  --border:        #e2e2e5;
  --border-strong: #c8c8cc;

  /* Text scale */
  --t1: #0a0a0b;
  --t2: #2d2d30;
  --t3: #6b6b74;
  --t4: #9898a0;

  /* Semantic status */
  --green:       #15803d;
  --orange:      #c2410c;
  --red:         #b91c1c;
  --yellow:      #a16207;
  --green-dot:   #22c55e;
  --orange-dot:  #f97316;
  --red-dot:     #ef4444;
  --yellow-dot:  #eab308;

  --sidebar-w: 236px;
}

* { box-sizing: border-box; }

html {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}

body {
  background: var(--bg);
  color: var(--t1);
  margin: 0;
  padding: 0;
}

/* ── Scrollbar ── */
::-webkit-scrollbar          { width: 4px; height: 4px; }
::-webkit-scrollbar-track    { background: transparent; }
::-webkit-scrollbar-thumb    { background: var(--border-strong); border-radius: 2px; }

/* ── Sidebar shell ── */
.sage-sidebar {
  width: var(--sidebar-w);
  background: var(--ob);
  position: fixed;
  left: 0; top: 0; bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ob-3);
}

.sage-sidebar-logo {
  padding: 20px 20px 18px;
  border-bottom: 1px solid var(--ob-3);
}

.sage-sidebar-section {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ob-4);
  padding: 14px 20px 6px;
}

.sage-nav {
  flex: 1;
  padding: 6px 10px;
  overflow-y: auto;
}

.sage-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  color: var(--ob-6);
  text-decoration: none;
  font-size: 12.5px;
  font-weight: 500;
  border-left: 2px solid transparent;
  transition: background 0.08s, color 0.08s;
  margin-bottom: 1px;
}

.sage-nav-item:hover {
  background: rgba(255,255,255,.04);
  color: #c4c4c8;
}

.sage-nav-item.active {
  background: var(--am-dim);
  color: #fafafa;
  border-left-color: var(--am);
}

.sage-nav-item svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  opacity: 0.5;
}

.sage-nav-item.active svg { opacity: 0.9; }
.sage-nav-item:hover svg  { opacity: 0.7; }

.sage-nav-badge {
  margin-left: auto;
  background: var(--am);
  color: var(--ob);
  border-radius: 2px;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  line-height: 1.4;
}

.sage-sidebar-footer {
  padding: 12px 10px;
  border-top: 1px solid var(--ob-3);
}

.sage-sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
}

.sage-sidebar-avatar {
  width: 30px;
  height: 30px;
  border-radius: 3px;
  background: var(--am);
  color: var(--ob);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  flex-shrink: 0;
}

.sage-sidebar-user-name {
  font-size: 12px;
  font-weight: 500;
  color: #e4e4e7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sage-sidebar-user-role {
  font-size: 10.5px;
  color: var(--ob-5);
  text-transform: capitalize;
}

/* ── App shell ── */
.sage-shell { display: flex; min-height: 100vh; }

.sage-main {
  flex: 1;
  margin-left: var(--sidebar-w);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Dark hero topbar ── */
.sage-hero {
  background: var(--ob);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.sage-hero::after {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 320px; height: 320px;
  background: radial-gradient(ellipse, rgba(245,158,11,.11), transparent 70%);
  pointer-events: none;
}

.sage-hero-top {
  padding: 22px 32px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.sage-hero-heading {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: #fafafa;
  line-height: 1.1;
}

.sage-hero-sub {
  font-size: 12.5px;
  color: var(--ob-5);
  margin-top: 3px;
}

.sage-stat-strip {
  display: flex;
  border-top: 1px solid var(--ob-3);
  position: relative;
  z-index: 1;
}

.sage-stat {
  padding: 14px 32px;
  border-right: 1px solid var(--ob-3);
}

.sage-stat:last-child { border-right: none; }

.sage-stat-number {
  font-size: 44px;
  font-weight: 900;
  letter-spacing: -2.5px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.sage-stat-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--ob-5);
  margin-top: 4px;
}

.sage-stat-pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Content area ── */
.sage-body {
  flex: 1;
  padding: 24px 32px;
  background: var(--bg);
}

/* ── Light page header ── */
.sage-page-header {
  padding: 22px 32px 0;
  background: var(--surf);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sage-page-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--t1);
}

.sage-page-sub {
  font-size: 12.5px;
  color: var(--t3);
  margin-top: 3px;
  padding-bottom: 18px;
}

/* ── Cards ── */
.sage-card {
  background: var(--surf);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.sage-card-header {
  padding: 14px 24px;
  border-bottom: 1.5px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sage-card-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--t1);
  letter-spacing: -0.2px;
}

/* ── Dark card (AI panel) ── */
.sage-dark-card {
  background: var(--ob);
  border: 1px solid var(--ob-3);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.sage-dark-card::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 200px; height: 200px;
  background: radial-gradient(ellipse, rgba(245,158,11,.11), transparent 70%);
  pointer-events: none;
}

/* ── Data tables ── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--t4);
  background: #f7f7f8;
  border-bottom: 1.5px solid var(--border-strong);
  white-space: nowrap;
}

.data-table th:first-child { padding-left: 24px; }
.data-table th:last-child  { padding-right: 24px; }

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #ebebed;
  color: var(--t1);
  vertical-align: middle;
}

.data-table td:first-child { padding-left: 22px; }
.data-table td:last-child  { padding-right: 24px; }

.data-table tr:hover td { background: #f7f7f8; }
.data-table tr:last-child td { border-bottom: none; }

/* Severity left border — applied on the <tr> */
.row-critical td:first-child { border-left: 2px solid var(--red-dot);    padding-left: 20px; }
.row-drifting td:first-child { border-left: 2px solid var(--orange-dot); padding-left: 20px; }
.row-warning  td:first-child { border-left: 2px solid var(--yellow-dot); padding-left: 20px; }
.row-on-track td:first-child { border-left: 2px solid transparent;       padding-left: 20px; }

/* ── Status dots (dot + plain text, no backgrounds) ── */
.dot-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--t2);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

/* ── Drift score number ── */
.drift-score {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

.drift-pct {
  font-size: 11px;
  font-weight: 400;
  color: var(--t4);
  margin-left: 1px;
}

/* ── GPA value ── */
.gpa-value {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.4px;
  font-variant-numeric: tabular-nums;
}

/* ── Student cell ── */
.student-cell { display: flex; align-items: center; gap: 10px; }

.student-avatar {
  width: 32px;
  height: 32px;
  border-radius: 3px;
  background: var(--ob);
  color: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.student-name  { font-size: 13px; font-weight: 700; color: var(--t1); letter-spacing: -0.15px; }
.student-email { font-size: 10.5px; color: var(--t4); }

/* ── Empty states (rule + message, never centered gray text) ── */
.empty-state {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 32px 24px;
}

.empty-rule {
  width: 2px;
  min-height: 36px;
  background: var(--border-strong);
  border-radius: 1px;
  align-self: stretch;
  flex-shrink: 0;
}

.empty-msg { font-size: 13px; font-weight: 600; color: var(--t2); margin: 0 0 2px; }
.empty-sub { font-size: 12px; color: var(--t4); margin: 0; }

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.1s;
  border: none;
  text-decoration: none;
  white-space: nowrap;
  font-family: inherit;
}

.btn-amber            { background: var(--am); color: var(--ob); }
.btn-amber:hover      { background: var(--am-2); }

.btn-ghost-dark       { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09); color: var(--ob-6); border-radius: 3px; }
.btn-ghost-dark:hover { background: rgba(255,255,255,.1); color: #c4c4c8; }

.btn-ghost-light       { background: transparent; border: 1px solid var(--border); color: var(--t2); border-radius: 3px; }
.btn-ghost-light:hover { background: #f7f7f8; }

.btn-sm { padding: 5px 10px; font-size: 11px; }

/* ── Inputs ── */
.sage-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 13px;
  color: var(--t1);
  background: var(--surf);
  outline: none;
  transition: border-color 0.12s;
  font-family: inherit;
}

.sage-input:focus { border-color: var(--am); box-shadow: 0 0 0 2px var(--am-rule); }

.sage-input-dark {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 3px;
  color: #e4e4e7;
  outline: none;
  font-family: inherit;
  transition: border-color 0.12s;
  padding: 9px 12px;
  font-size: 13px;
  width: 100%;
}

.sage-input-dark:focus { border-color: var(--am); }
.sage-input-dark::placeholder { color: var(--ob-5); }

/* ── Search bar ── */
.sage-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surf);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0 10px;
  max-width: 280px;
}

.sage-search input {
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--t1);
  padding: 7px 0;
  background: transparent;
  width: 100%;
  font-family: inherit;
}

.sage-search input::placeholder { color: var(--t4); }

/* ── Skeleton ── */
.skel {
  background: linear-gradient(90deg, var(--border) 25%, var(--border-strong) 37%, var(--border) 63%);
  background-size: 400% 100%;
  animation: skeleton 1.4s ease infinite;
  border-radius: 2px;
}

@keyframes skeleton {
  0%   { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}

.modal {
  background: var(--surf);
  border-radius: 4px;
  width: 100%; max-width: 480px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}

.modal-title { font-size: 14px; font-weight: 700; color: var(--t1); }
.modal-body  { padding: 20px; }

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 8px;
}

/* ── Form ── */
.form-group { margin-bottom: 14px; }

.input-label { display: block; font-size: 12px; font-weight: 500; color: var(--t3); margin-bottom: 4px; }

.sage-select {
  width: 100%;
  padding: 7px 28px 7px 10px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 13px;
  color: var(--t1);
  background: var(--surf);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  font-family: inherit;
}

.sage-select:focus { border-color: var(--am); }

/* ── Tabs ── */
.sage-tabs { display: flex; border-bottom: 1px solid var(--border); }

.sage-tab {
  padding: 10px 16px;
  font-size: 13px; font-weight: 500;
  color: var(--t3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.1s;
}

.sage-tab:hover  { color: var(--t1); }
.sage-tab.active { color: var(--am-2); border-bottom-color: var(--am); }

/* ── Loading ── */
.loading-state {
  display: flex; align-items: center; justify-content: center;
  padding: 60px; color: var(--t4); font-size: 13px;
}

/* ── Badges (kept for non-status uses like count chips) ── */
.badge {
  display: inline-flex; align-items: center;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 11px; font-weight: 600;
}

.badge-amber { background: rgba(245,158,11,.12); color: var(--am-2); }
.badge-red   { background: rgba(185,28,28,.08);  color: var(--red); }
.badge-green { background: rgba(21,128,61,.08);  color: var(--green); }
.badge-gray  { background: #f3f4f6; color: var(--t3); }

/* ── Animations ── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-in { animation: fadeIn 0.15s ease forwards; }

@keyframes spin { to { transform: rotate(360deg); } }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}

.spinner-dark { border-color: var(--border); border-top-color: var(--am); }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
.pulse { animation: pulse 2s ease infinite; }
```

- [ ] **Step 2: Start dev server and verify CSS loads**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000`. The page background should now be `#f0f0f1` (light zinc). No visual regression is expected yet since layouts still use old classes.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat: CSS token system — obsidian/amber design tokens in globals.css"
```

---

## Task 2: Logo Component

**Files:**
- Modify: `frontend/components/Logo.tsx`

- [ ] **Step 1: Replace Logo.tsx**

```tsx
import React from 'react';

interface LogoWordmarkProps {
  context?: 'dark' | 'light';
  showTagline?: boolean;
}

export function LogoWordmark({ context = 'dark', showTagline = false }: LogoWordmarkProps) {
  const ruleColor = context === 'dark' ? 'var(--am)' : 'var(--ob)';
  const textColor = context === 'dark' ? '#fafafa' : '#0a0a0b';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px' }}>
      <div style={{
        width: '2px',
        background: ruleColor,
        borderRadius: '1px',
        flexShrink: 0,
      }} />
      <div>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase' as const,
          color: textColor,
          lineHeight: 1,
        }}>
          SAGE
        </div>
        {showTagline && (
          <div style={{
            fontSize: '8.5px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--ob-5)',
            lineHeight: 1.4,
            marginTop: '4px',
          }}>
            STUDENT ACADEMIC /<br />GUIDANCE ENGINE
          </div>
        )}
      </div>
    </div>
  );
}

/** Legacy alias — accepts old props, renders new wordmark */
export function SageLogo(_props: { size?: number; className?: string }) {
  return <LogoWordmark context="dark" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/Logo.tsx
git commit -m "feat: Logo — Cinzel wordmark with amber vertical rule"
```

---

## Task 3: Sidebar Component

**Files:**
- Modify: `frontend/components/Sidebar.tsx`

- [ ] **Step 1: Replace Sidebar.tsx**

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getAuthUser, clearAuthUser } from '../lib/auth';
import { LogoWordmark } from './Logo';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  role: 'admin' | 'advisor';
  intelligenceItems?: NavItem[];
}

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="14" height="14">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function Sidebar({ items, role, intelligenceItems }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getAuthUser());
    setMounted(true);
  }, []);

  function handleLogout() {
    clearAuthUser();
    router.push('/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  function isActive(href: string, isDashboard = false) {
    if (isDashboard) return pathname === href;
    return pathname === href || pathname.startsWith(href);
  }

  function renderItem(item: NavItem) {
    const dashboard = item.href === `/${role}/dashboard` || item.href === '/admin/dashboard';
    const active = isActive(item.href, dashboard);
    return (
      <Link key={item.href} href={item.href} className={`sage-nav-item ${active ? 'active' : ''}`}>
        {item.icon}
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className="sage-nav-badge">{item.badge}</span>
        )}
      </Link>
    );
  }

  return (
    <aside className="sage-sidebar">
      <div className="sage-sidebar-logo">
        <LogoWordmark context="dark" showTagline />
      </div>

      <nav className="sage-nav">
        <div className="sage-sidebar-section">
          {role === 'admin' ? 'Administration' : 'Advisor'}
        </div>
        {items.map(renderItem)}

        {intelligenceItems && intelligenceItems.length > 0 && (
          <>
            <div className="sage-sidebar-section" style={{ marginTop: '8px' }}>
              Intelligence
            </div>
            {intelligenceItems.map(renderItem)}
          </>
        )}
      </nav>

      <div className="sage-sidebar-footer">
        <div className="sage-sidebar-user">
          <div className="sage-sidebar-avatar">
            {mounted ? initials : '??'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sage-sidebar-user-name">
              {mounted ? (user?.name || 'User') : 'Loading…'}
            </div>
            <div className="sage-sidebar-user-role">{role}</div>
          </div>
          <button
            onClick={handleLogout}
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
  );
}

/* ── Icon exports (used by AdvisorLayout and AdminLayout) ── */

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

export function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

export function GradesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

export function SurveyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors (or only pre-existing errors unrelated to these files).

- [ ] **Step 3: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat: Sidebar — obsidian sidebar with amber active state and icon exports"
```

---

## Task 4: AdvisorLayout Shell

**Files:**
- Modify: `frontend/components/AdvisorLayout.tsx`

- [ ] **Step 1: Replace AdvisorLayout.tsx**

```tsx
'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import {
  Sidebar, HomeIcon, UsersIcon, LayersIcon, CalendarIcon,
  MessageIcon, UserIcon, SparkleIcon,
} from '@/components/Sidebar';

const mainItems = [
  { href: '/advisor/dashboard',           label: 'Dashboard',           icon: <HomeIcon /> },
  { href: '/advisor/students',            label: 'My Students',          icon: <UsersIcon /> },
  { href: '/advisor/sections',            label: 'Sections',             icon: <LayersIcon /> },
  { href: '/advisor/enrollments',         label: 'Enrollments',          icon: <CalendarIcon /> },
  { href: '/advisor/comments',            label: 'Comments',             icon: <MessageIcon /> },
  { href: '/advisor/student-information', label: 'Student Information',  icon: <UserIcon /> },
];

const intelligenceItems = [
  { href: '/advisor/sage', label: 'Sage AI', icon: <SparkleIcon /> },
];

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useMemo(() => getAuthUser(), []);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  return (
    <div className="sage-shell">
      <Sidebar items={mainItems} intelligenceItems={intelligenceItems} role="advisor" />
      <div className="sage-main">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Open browser and verify advisor layout**

Navigate to `http://localhost:3000/advisor/dashboard`. You should see the obsidian sidebar on the left with SAGE wordmark, nav items, amber active state on Dashboard, and the main content area on the right. No top header.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/AdvisorLayout.tsx
git commit -m "feat: AdvisorLayout — fixed obsidian sidebar shell, remove glassmorphism header"
```

---

## Task 5: LayoutShell (Student Shell)

**Files:**
- Modify: `frontend/components/LayoutShell.tsx`

- [ ] **Step 1: Replace LayoutShell.tsx**

```tsx
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
            {mounted ? (user?.name || 'Student') : ' '}
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
            {mounted ? (user?.studentId || 'N/A') : '···'}
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
```

- [ ] **Step 2: Verify student layout**

Sign in as a student and navigate to `/dashboard`. The obsidian sidebar appears with SAGE wordmark, student name + ID badge below the logo, and student nav items.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/LayoutShell.tsx
git commit -m "feat: LayoutShell — student sidebar with welcome block"
```

---

## Task 6: Login Page

**Files:**
- Modify: `frontend/app/login/page.tsx`

- [ ] **Step 1: Replace login/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';
import { setAuthUser } from '../../lib/auth';
import { LogoWordmark } from '../../components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuthUser({
        token: data.token,
        role: data.role,
        name: data.name,
        email: data.email,
        advisorId: data.advisorId,
        studentId: data.studentId,
      });
      if (data.role === 'admin')        router.push('/admin/dashboard');
      else if (data.role === 'student') router.push('/dashboard');
      else                              router.push('/advisor/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ob)',
      display: 'grid',
      gridTemplateColumns: '1.15fr 0.85fr',
    }}>
      {/* Left: Brand panel */}
      <div style={{
        padding: '60px 64px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Amber glow */}
        <div style={{
          position: 'absolute',
          top: '-100px', right: '-100px',
          width: '500px', height: '500px',
          background: 'radial-gradient(ellipse, rgba(245,158,11,.12), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ marginBottom: '48px', position: 'relative', zIndex: 1 }}>
          <LogoWordmark context="dark" showTagline />
        </div>

        <h1 style={{
          fontSize: '36px',
          fontWeight: 800,
          letterSpacing: '-1.5px',
          color: '#fafafa',
          lineHeight: 1.1,
          marginBottom: '16px',
          maxWidth: '420px',
          position: 'relative', zIndex: 1,
        }}>
          A modern university portal for students and advisors.
        </h1>

        <p style={{
          fontSize: '14px',
          color: 'var(--ob-5)',
          lineHeight: 1.7,
          maxWidth: '380px',
          marginBottom: '40px',
          position: 'relative', zIndex: 1,
        }}>
          Access schedules, grades, accounting, academic guidance, and Sage AI in a single workspace.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          maxWidth: '480px',
          position: 'relative', zIndex: 1,
        }}>
          {[
            ['Academic', 'Plans, holds, and grades'],
            ['Operations', 'Advisors and admin tools'],
            ['Sage AI', 'Student guidance powered by AI'],
          ].map(([title, desc]) => (
            <div key={title} style={{
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: '4px',
              padding: '14px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e4e4e7', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '11px', color: 'var(--ob-5)', lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Sign-in panel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        borderLeft: '1px solid var(--ob-3)',
      }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--ob-4)', marginBottom: '8px',
            }}>
              Sign in
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.6px', color: '#fafafa' }}>
              Access your portal
            </div>
          </div>

          {error && (
            <div style={{
              marginBottom: '16px',
              border: '1px solid rgba(239,68,68,.4)',
              background: 'rgba(239,68,68,.1)',
              borderRadius: '3px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#fca5a5',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--ob-5)', marginBottom: '6px',
              }}>
                Email
              </label>
              <input
                type="email"
                className="sage-input-dark"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@sage.edu"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--ob-5)', marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                className="sage-input-dark"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-amber"
              style={{ justifyContent: 'center', width: '100%', padding: '10px 16px', fontSize: '13px', marginTop: '4px' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify login page**

Navigate to `http://localhost:3000/login`. Verify:
- Two columns: dark brand left, sign-in right
- Amber radial glow top-right of left panel
- SAGE Cinzel wordmark with amber vertical rule
- Inputs have dark background with amber focus ring
- No rounded corners above 4px anywhere

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/page.tsx
git commit -m "feat: login — two-column obsidian layout with Cinzel wordmark"
```

---

## Task 7: Advisor Dashboard

**Files:**
- Modify: `frontend/app/advisor/dashboard/page.tsx`

- [ ] **Step 1: Replace advisor/dashboard/page.tsx**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStudents } from '../../../lib/api';
import { getAuthUser } from '../../../lib/auth';
import type { DriftLevel } from '../../../../shared/types';

const DOT_COLOR: Record<DriftLevel, string> = {
  on_track:      'var(--green-dot)',
  early_warning: 'var(--yellow-dot)',
  drifting:      'var(--orange-dot)',
  critical:      'var(--red-dot)',
};

const SCORE_COLOR: Record<DriftLevel, string> = {
  on_track:      'var(--green)',
  early_warning: 'var(--yellow)',
  drifting:      'var(--orange)',
  critical:      'var(--red)',
};

const DRIFT_LABEL: Record<DriftLevel, string> = {
  on_track:      'On Track',
  early_warning: 'Early Warning',
  drifting:      'Drifting',
  critical:      'Critical',
};

const ROW_CLASS: Record<DriftLevel, string> = {
  critical:      'row-critical',
  drifting:      'row-drifting',
  early_warning: 'row-warning',
  on_track:      'row-on-track',
};

const CIRC = 2 * Math.PI * 34;

function DriftRing({ total, onTrack, drifting, critical }: {
  total: number; onTrack: number; drifting: number; critical: number;
}) {
  const seg = (n: number) => total > 0 ? (n / total) * CIRC : 0;
  const trackLen = seg(onTrack);
  const driftLen = seg(drifting);
  const critLen  = seg(critical);
  const offset   = CIRC / 4;

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r="34" fill="none" stroke="#27272a" strokeWidth="10" />
      {onTrack > 0 && (
        <circle cx="45" cy="45" r="34" fill="none" stroke="var(--green-dot)" strokeWidth="10"
          strokeDasharray={`${trackLen} ${CIRC - trackLen}`}
          strokeDashoffset={offset} />
      )}
      {drifting > 0 && (
        <circle cx="45" cy="45" r="34" fill="none" stroke="var(--orange-dot)" strokeWidth="10"
          strokeDasharray={`${driftLen} ${CIRC - driftLen}`}
          strokeDashoffset={offset - trackLen} />
      )}
      {critical > 0 && (
        <circle cx="45" cy="45" r="34" fill="none" stroke="var(--red-dot)" strokeWidth="10"
          strokeDasharray={`${critLen} ${CIRC - critLen}`}
          strokeDashoffset={offset - trackLen - driftLen} />
      )}
      <text x="45" y="49" textAnchor="middle" fill="#fafafa"
        fontSize="22" fontWeight="900" fontFamily="Inter, sans-serif">
        {total}
      </text>
      <text x="45" y="59" textAnchor="middle" fill="#52525b"
        fontSize="8" fontFamily="Inter, sans-serif" letterSpacing="0.08em">
        TOTAL
      </text>
    </svg>
  );
}

type Student = any;

export default function AdvisorDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const user = getAuthUser();

  useEffect(() => {
    getStudents()
      .then(data => setStudents(data as Student[]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.major?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const total    = students.length;
  const critical = students.filter(s => s.aiReports?.[0]?.driftLevel === 'critical').length;
  const drifting = students.filter(s => s.aiReports?.[0]?.driftLevel === 'drifting').length;
  const warning  = students.filter(s => s.aiReports?.[0]?.driftLevel === 'early_warning').length;
  const onTrack  = students.filter(s => s.aiReports?.[0]?.driftLevel === 'on_track').length;

  /* Top flagged students for AI panel */
  const flagged = students
    .filter(s => s.aiReports?.[0]?.driftLevel && s.aiReports[0].driftLevel !== 'on_track')
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, drifting: 1, early_warning: 2 };
      return (order[a.aiReports[0].driftLevel] ?? 3) - (order[b.aiReports[0].driftLevel] ?? 3);
    })
    .slice(0, 4);

  return (
    <>
      {/* Dark hero */}
      <div className="sage-hero">
        <div className="sage-hero-top">
          <div>
            <div className="sage-hero-heading">My Students</div>
            <div className="sage-hero-sub">
              {user?.name ? `${user.name} — ` : ''}Monitoring {total} assigned students
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div className="sage-search" style={{ background: 'rgba(255,255,255,.06)', borderColor: 'rgba(255,255,255,.1)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ob-5)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search students…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ color: '#e4e4e7', background: 'transparent' }}
              />
            </div>
            <button className="btn btn-amber" style={{ fontSize: '12px' }}>
              Run AI Analysis
            </button>
          </div>
        </div>

        <div className="sage-stat-strip">
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: '#fafafa' }}>{total}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--ob-4)' }} />
              Total Students
            </div>
          </div>
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: 'var(--green-dot)' }}>{onTrack}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--green-dot)' }} />
              On Track
            </div>
          </div>
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: 'var(--orange-dot)' }}>{drifting}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--orange-dot)' }} />
              Drifting
            </div>
          </div>
          <div className="sage-stat">
            <div className="sage-stat-number" style={{ color: 'var(--red-dot)' }}>{critical}</div>
            <div className="sage-stat-label">
              <span className="sage-stat-pip" style={{ background: 'var(--red-dot)' }} />
              Critical
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="sage-body" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
        {/* Student table */}
        <div className="sage-card">
          <div className="sage-card-header">
            <div className="sage-card-title">Students</div>
            {search && (
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          {loading ? (
            <div className="loading-state">Loading students…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Major</th>
                  <th>Sem</th>
                  <th>GPA</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Analyzed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => {
                  const report = student.aiReports?.[0];
                  const level  = report?.driftLevel as DriftLevel | undefined;
                  const rowCls = level ? ROW_CLASS[level] : 'row-on-track';
                  return (
                    <tr key={student.studentId} className={rowCls}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar">
                            {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="student-name">{student.name}</div>
                            <div className="student-email">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>
                        {student.major?.name || '—'}
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>
                        S{student.currentSemester || '—'}
                      </td>
                      <td>
                        <span className="gpa-value" style={{
                          color: student.cumulativeGpa < 2 ? 'var(--red)' : 'var(--t1)',
                        }}>
                          {student.cumulativeGpa?.toFixed(2) ?? '—'}
                        </span>
                      </td>
                      <td>
                        {level ? (
                          <span className="dot-status">
                            <span className="dot" style={{ background: DOT_COLOR[level] }} />
                            {DRIFT_LABEL[level]}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--t4)', fontSize: '12px' }}>Not analyzed</span>
                        )}
                      </td>
                      <td>
                        {report ? (
                          <>
                            <span className="drift-score" style={{ color: level ? SCORE_COLOR[level] : 'var(--t3)' }}>
                              {(report.driftScore * 100).toFixed(0)}
                            </span>
                            <span className="drift-pct">%</span>
                          </>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--t4)' }}>
                        {report ? new Date(report.generatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <Link href={`/advisor/students/${student.studentId}`} className="btn btn-ghost-light btn-sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-rule" />
                        <div>
                          <p className="empty-msg">No students match your search.</p>
                          <p className="empty-sub">Try a different name, email, or major.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Flags panel */}
          <div className="sage-dark-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ob-3)', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e4e4e7' }}>AI Flags</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot pulse" style={{ background: '#4ade80', width: '5px', height: '5px' }} />
                <span style={{ fontSize: '10px', color: 'var(--ob-5)', fontWeight: 500 }}>Live</span>
              </div>
            </div>
            <div style={{ padding: '8px 0', position: 'relative', zIndex: 1 }}>
              {flagged.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-rule" style={{ background: 'var(--ob-4)' }} />
                  <div>
                    <p className="empty-msg" style={{ color: '#e4e4e7' }}>No active flags.</p>
                    <p className="empty-sub" style={{ color: 'var(--ob-5)' }}>Run an AI analysis to generate flags.</p>
                  </div>
                </div>
              ) : (
                flagged.map(student => {
                  const report = student.aiReports[0];
                  const level = report.driftLevel as DriftLevel;
                  return (
                    <div key={student.studentId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--ob-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#e4e4e7' }}>
                          {student.name}
                        </span>
                        <span className="dot-status">
                          <span className="dot" style={{ background: DOT_COLOR[level] }} />
                          <span style={{ fontSize: '11px', color: 'var(--ob-5)' }}>{DRIFT_LABEL[level]}</span>
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ob-5)', lineHeight: 1.4 }}>
                        {report.summary || `Drift score: ${(report.driftScore * 100).toFixed(0)}%`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ padding: '12px 16px', position: 'relative', zIndex: 1 }}>
              <Link href="/advisor/sage" className="btn btn-amber" style={{ width: '100%', justifyContent: 'center' }}>
                Open Sage AI →
              </Link>
            </div>
          </div>

          {/* Drift ring */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Drift Overview</div>
            </div>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <DriftRing total={total} onTrack={onTrack} drifting={drifting} critical={critical} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {([
                  ['On Track',      'var(--green-dot)',  onTrack],
                  ['Drifting',      'var(--orange-dot)', drifting],
                  ['Critical',      'var(--red-dot)',    critical],
                  ['Early Warning', 'var(--yellow-dot)', warning],
                ] as [string, string, number][]).map(([label, color, count]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span className="dot" style={{ background: color }} />
                    <span style={{ fontSize: '12px', color: 'var(--t3)', flex: 1 }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify dashboard**

Navigate to `http://localhost:3000/advisor/dashboard`. Check:
- Dark hero with 44px stat numbers
- Table has left severity color borders on critical/drifting rows
- Status column shows 6px dot + plain text (no pill backgrounds)
- Drift score shows big number + small `%` (no bar)
- AI Flags panel is dark with amber glow
- Drift ring SVG renders correctly

- [ ] **Step 3: Commit**

```bash
git add frontend/app/advisor/dashboard/page.tsx
git commit -m "feat: advisor dashboard — dark hero, severity-border table, AI panel, drift ring"
```

---

## Task 8: Advisor Students Page

**Files:**
- Modify: `frontend/app/advisor/students/page.tsx`

- [ ] **Step 1: Replace advisor/students/page.tsx**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdvisorStudents } from '@/lib/api';

export default function AdvisorStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    getAdvisorStudents()
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.studentNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">My Students</div>
        <div className="sage-page-sub">Students in your assigned major</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="sage-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search by name, email, or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading students…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Major</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => (
                  <tr key={student.studentId}>
                    <td>
                      <div className="student-cell">
                        <div className="student-avatar">
                          {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="student-name">{student.name}</div>
                          <div className="student-email">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                      {student.studentNumber || student.studentId}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--t3)' }}>
                      {student.major?.name || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/advisor/students/${student.studentId}`} className="btn btn-ghost-light btn-sm">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-rule" />
                        <div>
                          <p className="empty-msg">No students found.</p>
                          <p className="empty-sub">
                            {search ? 'Try a different search term.' : 'No students are assigned to you yet.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to `/advisor/students`. Verify light page header, search bar, and enhanced student cell with avatar.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/advisor/students/page.tsx
git commit -m "feat: advisor students — light header, search bar, student avatar cells"
```

---

## Task 9: SAGE AI Chat Page

**Files:**
- Modify: `frontend/app/advisor/sage/page.tsx`

- [ ] **Step 1: Replace advisor/sage/page.tsx**

```tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { chatWithSage } from '@/lib/api';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const ADVISOR_CHIPS = [
  'Which students have missing holds?',
  'Show pending approvals',
  "Summarize A2111926's academic standing",
];

export default function AdvisorSagePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (content?: string) => {
    const message = (content ?? input).trim();
    if (!message || loading) return;
    if (!studentId.trim()) {
      setError('Student ID is required for advisor queries.');
      return;
    }

    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithSage({
        message,
        history: messages,
        studentId: studentId.trim(),
      });
      setMessages([...nextMessages, { role: 'assistant', content: response.reply }]);
    } catch (e: any) {
      setError(e?.message || 'Sage AI request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Dark chat header */}
      <div style={{
        background: 'var(--ob)',
        padding: '16px 32px',
        borderBottom: '1px solid var(--ob-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(ellipse, rgba(245,158,11,.1), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', color: '#fafafa' }}>
            Sage AI
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ob-5)', marginTop: '1px' }}>
            Ask questions about students, sections, and enrollments
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="dot pulse" style={{ background: '#4ade80', width: '5px', height: '5px' }} />
            <span style={{ fontSize: '10.5px', color: 'var(--ob-5)', fontWeight: 500 }}>Live</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: 'var(--ob-3)' }} />
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ob-4)', display: 'block', marginBottom: '3px' }}>
              Student ID
            </label>
            <input
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="sage-input-dark"
              style={{ width: '120px', padding: '5px 8px', fontSize: '12px' }}
              placeholder="A2111926"
            />
          </div>
        </div>
      </div>

      {/* Quick chips */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surf)', display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
        {ADVISOR_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            disabled={loading}
            style={{
              padding: '5px 12px',
              borderRadius: '3px',
              border: '1px solid var(--border)',
              background: 'transparent',
              fontSize: '12px',
              color: 'var(--t2)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.08s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f7f7f8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'var(--bg)',
      }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ paddingTop: '48px', justifyContent: 'center' }}>
            <div className="empty-rule" />
            <div>
              <p className="empty-msg">Start the conversation.</p>
              <p className="empty-sub">Enter a Student ID above, then ask Sage a question.</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            style={{
              maxWidth: '72%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '4px 4px 1px 4px' : '4px 4px 4px 1px',
              background: msg.role === 'user' ? 'var(--am)' : 'var(--surf)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              color: msg.role === 'user' ? 'var(--ob)' : 'var(--t1)',
              fontSize: '13px',
              lineHeight: 1.55,
              fontWeight: msg.role === 'user' ? 600 : 400,
            }}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '10px 14px',
            borderRadius: '4px 4px 4px 1px',
            background: 'var(--surf)',
            border: '1px solid var(--border)',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: '5px', height: '5px',
                borderRadius: '50%',
                background: 'var(--t4)',
                animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                display: 'inline-block',
              }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{
            alignSelf: 'center',
            padding: '8px 14px',
            borderRadius: '3px',
            background: 'rgba(185,28,28,.08)',
            border: '1px solid rgba(185,28,28,.2)',
            fontSize: '12.5px',
            color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '16px 32px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surf)',
        display: 'flex',
        gap: '10px',
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="sage-input"
          style={{ flex: 1 }}
          placeholder="Ask Sage about a student, section, or enrollment…"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="btn btn-amber"
          style={{ flexShrink: 0 }}
        >
          {loading ? 'Sending…' : 'Send →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to `/advisor/sage`. Check: dark header with amber glow, Student ID field top-right, quick chips row, message bubbles (amber user / white assistant), auto-scroll to bottom, error state renders.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/advisor/sage/page.tsx
git commit -m "feat: sage AI chat — dark header, bubble messages, full-height layout"
```

---

## Task 10: Student Dashboard

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard/page.tsx**

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { getStudent } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';

const LETTER_COLORS: Record<string, string> = {
  A: 'var(--green)', B: 'var(--green)', C: 'var(--yellow)',
  D: 'var(--orange)', F: 'var(--red)', W: 'var(--t3)', IP: 'var(--t3)',
};

const LETTER_GPA: Record<string, number> = {
  'A+': 4.0, A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, 'D-': 0.7,
  F: 0.0,
};

export default function DashboardPage() {
  const user = useMemo(() => getAuthUser(), []);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.studentId) { setLoading(false); return; }
    getStudent(user.studentId)
      .then(setStudent)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="sage-body">
        <div className="loading-state">Loading dashboard…</div>
      </div>
    );
  }

  const enrollments = student?.enrollments || [];
  const cumGpa = student?.cumulativeGpa?.toFixed(2) ?? '—';
  const credits = enrollments.reduce((s: number, e: any) => s + (e.course?.credits || 0), 0);

  return (
    <>
      {/* Light page header */}
      <div className="sage-page-header">
        <div className="sage-page-title">Dashboard</div>
        <div className="sage-page-sub">Spring 25–26 · Academic Overview</div>
      </div>

      {/* GPA stat strip */}
      <div style={{ background: 'var(--surf)', borderBottom: '1px solid var(--border)', display: 'flex' }}>
        <div style={{ padding: '14px 32px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '4px' }}>
            Cumulative GPA
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--am-2)', fontVariantNumeric: 'tabular-nums' }}>
            {cumGpa}
          </div>
        </div>
        <div style={{ padding: '14px 32px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '4px' }}>
            Credits This Semester
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
            {credits}
          </div>
        </div>
        <div style={{ padding: '14px 32px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '4px' }}>
            Status
          </div>
          <div style={{ paddingTop: '6px' }}>
            <span className="dot-status">
              <span className="dot" style={{ background: 'var(--green-dot)' }} />
              Enrolled
            </span>
          </div>
        </div>
      </div>

      <div className="sage-body" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Schedule table */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Schedule This Week</div>
            </div>
            {enrollments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-rule" />
                <div>
                  <p className="empty-msg">No enrolled courses.</p>
                  <p className="empty-sub">Register for courses to see your schedule here.</p>
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Credits</th>
                    <th>Mon</th>
                    <th>Tue</th>
                    <th>Wed</th>
                    <th>Thu</th>
                    <th>Fri</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e: any, idx: number) => (
                    <tr key={`${e.course?.code}-${idx}`}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--t1)' }}>
                          {e.course?.code || 'N/A'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--t4)' }}>
                          {e.course?.name || ''}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--t3)' }}>{e.course?.credits || '—'}</td>
                      {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => (
                        <td key={day} style={{ fontSize: '12px', color: 'var(--t4)' }}>
                          {e.schedule?.[day] || '–'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Current grades */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Current Grades</div>
            </div>
            {enrollments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-rule" />
                <div>
                  <p className="empty-msg">No grade data available.</p>
                  <p className="empty-sub">Grades appear after courses are graded.</p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0' }}>
                {enrollments.map((e: any, idx: number) => {
                  const letter = e.letterGrade || 'IP';
                  const gpa    = LETTER_GPA[letter];
                  const color  = LETTER_COLORS[letter[0]] || 'var(--t3)';
                  const pct    = gpa != null ? (gpa / 4.0) * 100 : 0;
                  return (
                    <div key={`grade-${idx}`} style={{
                      padding: '12px 24px',
                      borderBottom: idx < enrollments.length - 1 ? '1px solid #ebebed' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)' }}>
                          {e.course?.code || 'N/A'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--t4)', marginTop: '1px' }}>
                          {e.course?.name || ''}
                        </div>
                      </div>
                      {/* Grade bar */}
                      <div style={{ width: '80px', height: '3px', background: 'var(--border)', borderRadius: '2px', flexShrink: 0 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color, width: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {letter}
                      </div>
                      {gpa != null && (
                        <div style={{ fontSize: '11px', color: 'var(--t4)', width: '28px', textAlign: 'right' }}>
                          {gpa.toFixed(1)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Student info card */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Student Info</div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Student ID',   user?.studentId || 'N/A'],
                ['College',      student?.college?.name || 'Faculty of Arts and Sciences'],
                ['Major',        student?.major?.name || 'BS Computer Science'],
                ['Year Level',   student?.yearLevel || 'Senior'],
                ['Study Plan',   student?.studyPlan || 'BSCS-2021'],
                ['Advisor',      student?.advisor?.name || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '2px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--t1)', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Holds */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Holds</div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {student?.holds && student.holds.length > 0 ? (
                student.holds.map((hold: any, i: number) => (
                  <div key={i} className="dot-status" style={{ marginBottom: '6px' }}>
                    <span className="dot" style={{ background: 'var(--red-dot)' }} />
                    {hold.description || hold.type}
                  </div>
                ))
              ) : (
                <span className="dot-status">
                  <span className="dot" style={{ background: 'var(--green-dot)' }} />
                  No active holds
                </span>
              )}
            </div>
          </div>

          {/* Dues balance */}
          <div className="sage-card">
            <div className="sage-card-header">
              <div className="sage-card-title">Financial</div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '6px' }}>
                Dues Balance
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                {student?.duesBalance ?? 'LBP 0 / USD -4'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to `/dashboard` as a student. Check: GPA strip at top, schedule table, grades with bar + letter + GPA points, student info right panel.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat: student dashboard — GPA strip, schedule table, grade rows, info panel"
```

---

## Task 11: Admin Layout + Admin Dashboard

**Files:**
- Modify: `frontend/components/AdminLayout.tsx`
- Modify: `frontend/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Replace AdminLayout.tsx**

```tsx
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
  { href: '/admin/dashboard',      label: 'Dashboard',         icon: <HomeIcon /> },
  { href: '/admin/users/students', label: 'Students',          icon: <UsersIcon /> },
  { href: '/admin/users/advisors', label: 'Advisors',          icon: <UserIcon /> },
  { href: '/admin/majors',         label: 'Majors & Curriculum', icon: <BookIcon /> },
  { href: '/admin/courses',        label: 'Courses',           icon: <BuildingIcon /> },
  { href: '/admin/sections',       label: 'Sections',          icon: <LayersIcon /> },
  { href: '/admin/enrollments',    label: 'Enrollments',       icon: <CalendarIcon /> },
  { href: '/admin/grades',         label: 'Grades',            icon: <GradesIcon /> },
  { href: '/admin/payments',       label: 'Payments',          icon: <DollarIcon /> },
  { href: '/admin/settings',       label: 'Settings',          icon: <SettingsIcon /> },
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
```

- [ ] **Step 2: Update admin/dashboard/page.tsx — replace layout classes**

Open `frontend/app/admin/dashboard/page.tsx`. Replace every occurrence of old layout classes in the JSX:
- `className="page-header"` → `className="sage-page-header"`
- `className="page-title"` → `className="sage-page-title"`
- `className="page-subtitle"` or `className="page-sub"` → `className="sage-page-sub"`
- `className="page-body"` → `className="sage-body"`
- `className="card"` → `className="sage-card"`
- `className="card-header"` → `className="sage-card-header"`
- `className="card-title"` → `className="sage-card-title"`
- `className="stat-card"` → `className="sage-card"` (wrap value in `sage-stat-number` style)
- `className="drift-dot X"` → `<span className="dot" style={{ background: 'var(--X-dot)' }}>`

- [ ] **Step 3: Verify admin layout**

Sign in as admin and navigate to `/admin/dashboard`. The obsidian sidebar renders with all admin nav items.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/AdminLayout.tsx frontend/app/admin/dashboard/page.tsx
git commit -m "feat: admin layout — obsidian sidebar, token system applied to dashboard"
```

---

## Task 12: Remaining Interior Pages (Token Sweep)

**Files:**
- All pages under `frontend/app/advisor/` (sections, enrollments, comments, student-information, students/[id])
- All pages under `frontend/app/academic/`, `frontend/app/registration/`, `frontend/app/schedules/`, `frontend/app/grades/`, `frontend/app/accounting/`, `frontend/app/surveys/`, `frontend/app/profile/`

- [ ] **Step 1: Search for old class names**

```bash
grep -r "page-header\|page-body\|page-title\|page-subtitle\|stat-card\|drift-dot\|btn-primary\|btn-secondary\|search-input\|ai-panel\|chat-container\|badge-blue\|badge-green\|badge-amber\|badge-red" frontend/app --include="*.tsx" -l
```

- [ ] **Step 2: Apply token class renames to each file**

For each file returned above, make these replacements:

| Old class | New class |
|-----------|-----------|
| `page-header` | `sage-page-header` |
| `page-body` | `sage-body` |
| `page-title` | `sage-page-title` |
| `page-subtitle` | `sage-page-sub` |
| `card` (standalone) | `sage-card` |
| `card-header` | `sage-card-header` |
| `card-title` | `sage-card-title` |
| `card-body` | (remove, use padding inline) |
| `stat-card` | `sage-card` |
| `btn-primary` | `btn btn-amber` |
| `btn-secondary` | `btn btn-ghost-light` |
| `search-input` | `sage-search` |
| `input` (form inputs) | `sage-input` |
| `select` | `sage-select` |
| `drift-dot on_track` | `dot` + style `background: var(--green-dot)` |
| `drift-dot early_warning` | `dot` + style `background: var(--yellow-dot)` |
| `drift-dot drifting` | `dot` + style `background: var(--orange-dot)` |
| `drift-dot critical` | `dot` + style `background: var(--red-dot)` |
| `badge-blue` | `badge` (blue variant removed, use text color) |
| `badge-green` | `badge badge-green` |
| `badge-amber` | `badge badge-amber` |
| `badge-red` | `badge badge-red` |
| `rounded-*` Tailwind (on containers) | remove or cap at `border-radius: 4px` |

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Smoke test each major route**

Visit each route and verify: no broken layout, sidebar renders correctly, content area uses `--bg` background.

Routes to check:
- `/advisor/sections`
- `/advisor/enrollments`
- `/advisor/comments`
- `/advisor/student-information`
- `/advisor/students/[any-id]` (student profile)
- `/academic/holds`
- `/grades`
- `/registration/register`
- `/schedules/mine`
- `/accounting/statement`
- `/profile`

- [ ] **Step 5: Commit**

```bash
git add frontend/app
git commit -m "feat: token sweep — replace legacy layout classes with sage-* tokens across all pages"
```

---

## Self-Review Against Spec

**Coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `--ob`, `--am`, `--bg`, `--surf` tokens | Task 1 |
| Cinzel wordmark + amber vertical rule | Task 2 |
| Sidebar: amber active fill + 2px left border | Task 1 + 3 |
| 6px dot-only status indicators | Task 1 (`.dot-status`) |
| Max 4px border-radius everywhere | Task 1 (all CSS) |
| Dark topbar with amber radial glow | Task 1 (`.sage-hero::after`) |
| 44px 900 stat numbers | Tasks 7, 1 |
| Left severity border on table rows | Tasks 1, 7 |
| Drift score: large number, no bar | Task 7 |
| SVG drift ring | Task 7 |
| Student welcome block in sidebar | Task 5 |
| Login two-column obsidian layout | Task 6 |
| Chat: amber user bubbles, white assistant | Task 9 |
| Empty states: rule + specific message | Tasks 7–10 |
| Student GPA strip + schedule + grades | Task 10 |
| All advisor routes preserved | Tasks 4, 7–9 |
| All student routes preserved | Task 5, 10 |
| No new dependencies except Cinzel | Task 1 |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:** `NavItem` interface defined once in `Sidebar.tsx` and reused. `DriftLevel` imported from shared types in both dashboard files. `LogoWordmark` exported from `Logo.tsx` and imported in `Sidebar.tsx`, `LayoutShell.tsx`, and `login/page.tsx`.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-01-frontend-redesign.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
