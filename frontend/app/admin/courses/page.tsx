'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses, getMajors } from '../../../lib/api';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMajor, setFilterMajor] = useState('');
  const [search, setSearch] = useState('');
  const router = useRouter();

  async function load() {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([getCourses(filterMajor || undefined), getMajors()]);
      setCourses(c);
      setMajors(m);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterMajor]);

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Courses</div>
        <div className="sage-page-sub">Overview of all courses — click a major to manage its courses</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <div className="sage-search" style={{ flex: '1', maxWidth: '260px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="sage-select" style={{ width: '200px' }} value={filterMajor} onChange={e => setFilterMajor(e.target.value)}>
            <option value="">All Majors</option>
            {majors.map(m => <option key={m.majorId} value={m.majorId}>{m.name}</option>)}
          </select>
        </div>

        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading courses...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course Name</th>
                  <th>Major</th>
                  <th>Credits</th>
                  <th>Semester</th>
                  <th>Skills</th>
                  <th>Materials</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.courseId}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#374151' }}>{c.code}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: '#6b7280', fontSize: '12px' }}>{c.major?.name}</td>
                    <td style={{ color: '#6b7280' }}>{c.credits}</td>
                    <td style={{ color: '#6b7280' }}>{c.semesterOffered ? `S${c.semesterOffered}` : '—'}</td>
                    <td>
                      {c.skills?.length > 0
                        ? <span className="badge badge-amber">{c.skills.length}</span>
                        : <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>}
                    </td>
                    <td>
                      {c.materials?.length > 0
                        ? <span className="badge badge-green">{c.materials.length}</span>
                        : <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => router.push(`/admin/majors/${c.majorId}`)}
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="empty-state">No courses found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
