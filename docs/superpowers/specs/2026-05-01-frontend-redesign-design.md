# SAGE Frontend Redesign — Design Specification
**Date:** 2026-05-01  
**Scope:** Full frontend redesign of the SAGE (Student Academic Guidance Engine) Next.js 14 application. Presentation target: final-year CS project in front of 1000 people.

---

## 1. Design Principles

1. **Precision over friendliness.** This is an institutional tool. Sharp edges, deliberate spacing, and strong typographic hierarchy signal authority. No rounded corners above 4px.
2. **Typography does the work.** Hierarchy is communicated through size and weight contrast, not color. Numbers are large and confident. Labels are small, tracked, and uppercase.
3. **Status is a dot.** Every state indicator — drift level, analysis status, enrollment status — is rendered as a 6px filled circle followed by plain text. No pill shapes, no badge borders, no background fills.
4. **The most serious tool in the room.** When an advisor opens this during a student meeting, it should outclass every other application on their screen.

---

## 2. Color Tokens

```css
/* Core */
--ob:    #18181b;   /* Obsidian — sidebar bg, logo, primary buttons, avatars */
--ob-2:  #1f1f22;   /* Obsidian surface */
--ob-3:  #2a2a2d;   /* Obsidian border */
--ob-4:  #3f3f46;   /* Obsidian mid */
--ob-5:  #52525b;   /* Obsidian muted text */
--ob-6:  #71717a;   /* Obsidian secondary text */

--am:    #f59e0b;   /* Amber — active nav, CTA, AI highlights, focus rings */
--am-2:  #d97706;   /* Amber hover */
--am-dim: rgba(245,158,11,.14); /* Amber fill for active nav */
--am-rule: rgba(245,158,11,.35); /* Amber subtle rule */

/* Content area */
--bg:     #f0f0f1;  /* Page background */
--surf:   #ffffff;  /* Card surface */
--border: #e2e2e5;  /* Default border */
--border-strong: #c8c8cc; /* Table header separator */

/* Text */
--t1: #0a0a0b;  /* Primary — headings, values */
--t2: #2d2d30;  /* Secondary */
--t3: #6b6b74;  /* Tertiary — minor labels */
--t4: #9898a0;  /* Muted — timestamps, email, metadata */

/* Semantic status */
--green:      #15803d;   /* On track text */
--orange:     #c2410c;   /* Drifting text */
--red:        #b91c1c;   /* Critical text */
--yellow:     #a16207;   /* Early warning text */
--green-dot:  #22c55e;   /* On track dot */
--orange-dot: #f97316;   /* Drifting dot */
--red-dot:    #ef4444;   /* Critical dot */
--yellow-dot: #eab308;   /* Early warning dot */
```

---

## 3. Typography

**Font:** Inter (all weights). **Logo:** Cinzel (500, 600).

| Element | Size | Weight | Letter-spacing | Transform | Color |
|---|---|---|---|---|---|
| Page title | 22px | 800 | -0.6px | — | `--t1` |
| Dark hero heading | 22px | 800 | -0.6px | — | `#fafafa` |
| Stat number (hero) | 44px | 900 | -2.5px | — | color-coded |
| Card / section title | 13–13.5px | 700 | -0.2px | — | `--t1` |
| Table body | 13px | 400 | — | — | `--t1` |
| Student name in table | 13px | 700 | -0.15px | — | `--t1` |
| Student email in table | 10.5px | 400 | — | — | `--t4` |
| GPA value | 15px | 800 | -0.4px | — | color-coded |
| Drift score number | 18px | 800 | -0.5px | — | color-coded |
| Table column header | 10px | 700 | 0.09em | uppercase | `--t4` |
| Sidebar section label | 9px | 700 | 0.14em | uppercase | `--ob-4` |
| Sidebar nav item | 12.5px | 500 | — | — | `--ob-6` |
| Timestamps / meta | 11px | 400 | — | — | `--t4` |
| Logo wordmark | 18px | 600 (Cinzel) | 0.25em | uppercase | `#fafafa` / `#0a0a0b` |
| Logo tagline | 8.5px | 500 | 0.12em | uppercase | `--ob-5` |

All numbers: `font-variant-numeric: tabular-nums`.

---

## 4. Shape & Elevation

- **Cards:** `border-radius: 4px`, `border: 1px solid var(--border)`, `box-shadow: none`
- **Buttons:** `border-radius: 3px`
- **Avatars:** `border-radius: 3px`
- **Status bars / sparklines:** `border-radius: 2px`
- **Sidebar active badge (count):** `border-radius: 2px`
- **Nothing** uses border-radius above 4px.

Card elevation comes from border, not shadow. The `--bg` page background (`#f0f0f1`) provides natural separation from white `--surf` cards.

---

## 5. Logo Specification

**Wordmark:** The word `SAGE` set in Cinzel 600, `letter-spacing: 0.25em`, `text-transform: uppercase`.  
**Mark:** A single `2px` vertical rule to the left, in `var(--am)` on dark backgrounds, in `var(--ob)` on light. `border-radius: 1px`, `height: 100%` of the text block.  
**Tagline** (sidebar only): `STUDENT ACADEMIC / GUIDANCE ENGINE` in 8.5px Inter 500, `letter-spacing: 0.12em`, color `--ob-5`.  
**Light context** (e.g. login page): wordmark in `#0a0a0b`, mark in `#0a0a0b`.  
**No icons, no shapes, no gradients, no abstract symbols.**

---

## 6. Layout Architecture

### Shared shell pattern
Both Advisor and Student layouts follow the same shell:
```
[Fixed 236px obsidian sidebar] | [Flex-1 main column]
                                    [Dark topbar with hero stats]
                                    [Scrollable content body]
```

The sidebar is `position: fixed`, full viewport height. Main column fills the rest with `margin-left: 236px`.

### Advisor shell — routes
```
/advisor/dashboard          → Dashboard (default)
/advisor/students           → My Students
/advisor/sections           → Sections
/advisor/enrollments        → Enrollments
/advisor/comments           → Comments
/advisor/student-information → Student Information
/advisor/sage               → Sage AI  ← amber badge with flag count
```
Sidebar sections: `ADVISOR` (first 6 items) · `INTELLIGENCE` (Sage AI).

### Student shell — routes
```
/dashboard                  → Dashboard (default)
/academic/holds             → Academic Life
/registration/register      → Registration
/schedules/mine             → Schedules
/grades                     → Grades
/accounting/statement       → Accounting
/surveys/evaluation         → Surveys
/profile                    → Profile
```
Student sidebar adds a **welcome block** below the logo: student name + ID badge (`background: --ob-3`, `border-radius: 2px`).

---

## 7. Component Patterns

### 7.1 Sidebar
- **Background:** `--ob`
- **Active item:** `background: var(--am-dim)` (full row) + `border-left: 2px solid var(--am)`. Text `#fafafa`. Icon opacity 0.9.
- **Inactive item:** `border-left: 2px solid transparent`. Text `--ob-6`. Icon opacity 0.5.
- **Hover:** `background: rgba(255,255,255,.04)`. Text `#c4c4c8`.
- **Count badge:** `background: var(--am)`, `color: var(--ob)`, `border-radius: 2px`, `font-size: 10px 700`.
- **Footer avatar:** `background: var(--am)`, `color: var(--ob)`, `border-radius: 3px`, initials `font-weight: 900`.

### 7.2 Dark topbar / hero
- **Background:** `--ob`
- **Radial amber glow:** `radial-gradient(ellipse, rgba(245,158,11,.11), transparent)` positioned top-right.
- **Stat strip** sits below the heading row, separated by `border-top: 1px solid --ob-3`.
- **Stat numbers:** 44px 900, color-coded. Labels: 10.5px 500 uppercase, `--ob-5`, with 5px colored pip.

### 7.3 Data tables
- **Header row:** `background: #f7f7f8`, `border-bottom: 1.5px solid --border-strong`, `font-size: 10px 700 uppercase letter-spacing:.09em`, color `--t4`.
- **Body rows:** `border-bottom: 1px solid #ebebed`. Hover: `background: #f7f7f8` (immediate, no transition).
- **Left severity border:** `border-left: 2px solid` — red for Critical, orange for Drifting, yellow for Early Warning, none for On Track.
- **Column padding:** `14px` default, `24px` first/last column.
- **Student cell:** 32px avatar (`border-radius: 3px`) + name (700) + email (400 10.5px `--t4`).

### 7.4 Status indicators
```jsx
<span className="dot-status">
  <span className="dot" style={{ background: 'var(--red-dot)' }} />
  Critical
</span>
```
Dot: `width: 6px; height: 6px; border-radius: 50%`. Text: `12.5px 500 --t2`. **No backgrounds. No borders. No pills.**

### 7.5 Drift score
A single large number with `%` suffix:
```jsx
<span className="drift-score">{score}</span>
<span className="drift-pct">%</span>
```
`drift-score`: `18px 800 tabular-nums`, color-coded. `drift-pct`: `11px 400 --t4`.

### 7.6 Cards
```
border: 1px solid var(--border)
border-radius: 4px
background: var(--surf)
```
Card header: `padding: 14px 24px`, `border-bottom: 1.5px solid --border-strong`, title `13.5px 700 --t1`.

### 7.7 AI panel (dark)
- Background: `--ob`, border: `--ob-3`, `border-radius: 4px`
- Amber radial glow in top-right corner
- Per-flag layout: student name (`12.5px 700 #e4e4e7`) + severity dot-label + message (`11.5px --ob-5`) + course codes (`10.5px --ob-4 500`)
- Live indicator: `5px #4ade80` pulsing dot + "Live" text
- CTA: full-width `background: var(--am)` button, `border-radius: 3px`

### 7.8 Drift ring (SVG)
90×90px SVG donut, `r=34`, `stroke-width=10`, `transform: rotate(-90deg)`.
- Track: `#27272a`
- Segments: green (On Track), orange (Drifting), red (Critical) — arc lengths proportional to counts.
- Center: total count `24px 900 #fafafa` + "total" label `8.5px 600 uppercase --ob-5`.

### 7.9 Empty states
```jsx
<div className="empty-state">
  <div className="empty-rule" />  {/* 2px vertical rule, --border-strong */}
  <div>
    <p className="empty-msg">Specific, informative message about why this is empty.</p>
    <p className="empty-sub">Secondary context or next action.</p>
  </div>
</div>
```
Never: gray text centered on white. Always: a rule + a specific message.

### 7.10 Buttons
- **Primary (amber):** `background: var(--am)`, `color: var(--ob)`, `font-size: 12px 700`, `border-radius: 3px`, `padding: 8px 16px`.
- **Ghost (dark context):** `background: rgba(255,255,255,.06)`, `border: 1px solid rgba(255,255,255,.09)`, `color: --ob-6`, `border-radius: 3px`.
- **Ghost (light context):** `background: transparent`, `border: 1px solid --border`, `color: --t2`.

---

## 8. Page Designs

### 8.1 Login page
Two-column layout (`1.15fr 0.85fr`). Left: dark `--ob` background with amber glow, Cinzel logo wordmark large, product tagline, 3 feature cards (glassmorphism: `background: rgba(255,255,255,.05)`, `border: 1px solid rgba(255,255,255,.08)`, `border-radius: 4px`). Right: `--ob` frosted card with sign-in form. Inputs: `background: rgba(255,255,255,.05)`, `border: 1px solid rgba(255,255,255,.1)`, `border-radius: 3px`, `focus: border-color: var(--am)`.

### 8.2 Advisor Dashboard (`/advisor/dashboard`)
- **Topbar:** dark hero with heading, sub, search, filter, "Run AI Analysis" button. Stat strip below: 44px numbers for total / on-track / drifting / critical.
- **Body grid:** `1fr 300px`.
- **Left:** Student table, sorted by drift severity, with left-border severity indicators, dot-status, large drift score number.
- **Right:** SAGE AI flags panel (dark) + Drift ring + cohort GPA bar chart.

### 8.3 Advisor Student List (`/advisor/students`)
Full-width table. Same design system as dashboard table. Add search input + filter row above table. Pagination at bottom.

### 8.4 SAGE AI Chat (`/advisor/sage`)
Two-column: `1fr 340px`.
- **Left:** Chat interface. Dark `--ob` header with model label and session info. Message area: user messages right-aligned (`background: var(--am)`, `color: var(--ob)`), assistant messages left-aligned (`background: #f7f7f8`, `border: 1px solid --border`). Input bar at bottom: full-width, `border-radius: 3px`.
- **Right:** Context panel. Shows currently selected student (if any), their latest AI report summary, and quick-action buttons.

### 8.5 Student Dashboard (`/dashboard`)
Shell: `[236px obsidian sidebar with welcome block] | [main]`.
Main: `[page header] [scrollable body]`.
Body layout: `1fr 260px`.
- **Left:** GPA strip (3 stats: cumulative GPA in amber, credits earned, remaining credits). Schedule table (active days highlighted with amber chip). Current grades (course + bar + letter + GPA points).
- **Right:** Student info card (ID, college, major, study plan, year, dues balance). Holds status (dot-status, no fill). Advisor card (obsidian background, amber CTA "Message Advisor").

### 8.6 Student Profile page (`/advisor/student-information` → student view)
Three clearly distinct visual zones:

**Zone 1 — Header:** Dark `--ob` band. Student name `24px 800 #fafafa`, major + semester + GPA in a single line. Drift status as large dot + label. "Generate AI Report" amber button.

**Zone 2 — Course history:** White card table. All enrolled courses, grades, status per semester. Heavy table header separation.

**Zone 3 — AI Report panel:** Full-width dark card below. Drift score `80px 900` centered. Signals list (strengths, weaknesses, core drift topics). "Last generated" timestamp. Regenerate button.

---

## 9. globals.css Changes

Replace the existing custom CSS with a lean token system:
- Define all CSS custom properties in `:root`
- Keep `.sidebar`, `.main-content`, `.page-header` layout classes
- Remove all `border-radius` values above `4px`
- Add `.dot-status`, `.dot`, `.drift-score`, `.empty-state`, `.empty-rule` utilities
- Keep `.skeleton` animation, update colors to use `--border` and `--border-strong`

---

## 10. Files to Modify (priority order)

1. `frontend/app/globals.css` — full rewrite with new token system
2. `frontend/components/AdvisorLayout.tsx` — new shell (fixed sidebar + dark topbar)
3. `frontend/components/LayoutShell.tsx` — new shell (fixed sidebar + white topbar)
4. `frontend/components/Sidebar.tsx` — new Sidebar component (used by both layouts)
5. `frontend/components/Logo.tsx` — Cinzel wordmark + vertical rule
6. `frontend/app/login/page.tsx` — update to new tokens (already good structure)
7. `frontend/app/advisor/dashboard/page.tsx` — hero stats + table + AI panel + ring
8. `frontend/app/advisor/students/page.tsx` — full table with search
9. `frontend/app/advisor/sage/page.tsx` — chat UI redesign
10. `frontend/app/dashboard/page.tsx` — student dashboard redesign
11. `frontend/app/admin/dashboard/page.tsx` — apply token system (lower priority)
12. All remaining interior pages — apply token system consistently
