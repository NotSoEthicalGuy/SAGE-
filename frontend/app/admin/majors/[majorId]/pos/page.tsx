'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMajorPos, getCourses, getMajors, addPosRequirement, updatePosRequirement, deletePosRequirement } from '../../../../../lib/api';

type Requirement = {
  requirementId: string;
  courseId: string;
  code: string;
  name: string;
  credits: number;
  recommendedSemester: number;
  requirementType: string;
  requirementGroup: string;
};

type Group = {
  groupName: string;
  totalCredits: number;
  courses: Requirement[];
};

function RequirementModal({
  requirement,
  majorId,
  allCourses,
  existingGroups,
  onClose,
  onSave,
}: {
  requirement: Requirement | null;
  majorId: string;
  allCourses: any[];
  existingGroups: string[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    courseId: requirement?.courseId || '',
    requirementGroup: requirement?.requirementGroup || 'Department Requirements',
    requirementType: requirement?.requirementType || 'core',
    recommendedSemester: requirement?.recommendedSemester ?? 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (requirement) {
        await updatePosRequirement(requirement.requirementId, {
          requirementType: form.requirementType,
          recommendedSemester: Number(form.recommendedSemester),
          requirementGroup: form.requirementGroup,
        });
      } else {
        await addPosRequirement(majorId, {
          courseId: form.courseId,
          requirementType: form.requirementType,
          recommendedSemester: Number(form.recommendedSemester),
          requirementGroup: form.requirementGroup,
        });
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <span className="modal-title">{requirement ? 'Edit Requirement' : 'Add Course to Program'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            {!requirement && (
              <div className="form-group">
                <label className="input-label">Course</label>
                <select
                  className="sage-input"
                  value={form.courseId}
                  onChange={e => setForm({ ...form, courseId: e.target.value })}
                  required
                >
                  <option value="">Select a course…</option>
                  {allCourses.map(c => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.code} — {c.name} ({c.credits} cr)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Requirement Group</label>
              <input
                className="sage-input"
                list="group-suggestions"
                value={form.requirementGroup}
                onChange={e => setForm({ ...form, requirementGroup: e.target.value })}
                placeholder="e.g. University Requirements"
                required
              />
              <datalist id="group-suggestions">
                {existingGroups.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Requirement Type</label>
                <select
                  className="sage-input"
                  value={form.requirementType}
                  onChange={e => setForm({ ...form, requirementType: e.target.value })}
                >
                  <option value="core">Core</option>
                  <option value="elective">Elective</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Recommended Semester</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  className="sage-input"
                  value={form.recommendedSemester}
                  onChange={e => setForm({ ...form, recommendedSemester: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-amber btn-sm" disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MajorPosPage() {
  const params = useParams<{ majorId: string }>();
  const { majorId } = params;
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [majorName, setMajorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Requirement | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [posData, majors] = await Promise.all([
        getMajorPos(majorId),
        getMajors(),
      ]);
      setGroups((posData as any).groups || []);
      const major = (majors as any[]).find(m => m.majorId === majorId);
      setMajorName(major?.name || 'Major');
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    try {
      const data = await getCourses();
      setAllCourses(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    loadCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majorId]);

  async function handleRemove(requirementId: string) {
    try {
      await deletePosRequirement(requirementId);
      setPendingRemove(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to remove');
    }
  }

  const totalCoursesConfigured = groups.reduce((s, g) => s + g.courses.length, 0);
  const totalCreditsRequired = groups.reduce((s, g) => s + g.totalCredits, 0);

  const existingGroups = Array.from(new Set(groups.map(g => g.groupName)));

  const existingCourseIds = new Set(groups.flatMap(g => g.courses.map(c => c.courseId)));
  const availableCourses = allCourses.filter(c => !existingCourseIds.has(c.courseId));

  return (
    <>
      <div className="sage-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 0', color: 'var(--t3)' }}
            onClick={() => router.push(`/admin/majors/${majorId}`)}
          >
            ← {majorName || 'Major'}
          </button>
        </div>
        <div className="sage-page-title">Program of Study Configuration</div>
        <div className="sage-page-sub">{majorName}</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--t3)' }}>
            <span style={{ fontWeight: 500, color: 'var(--t1)' }}>{totalCoursesConfigured}</span> courses configured
            {' · '}
            <span style={{ fontWeight: 500, color: 'var(--t1)' }}>{totalCreditsRequired}</span> total credits
          </div>
          <button
            className="btn btn-amber btn-sm"
            onClick={() => { setSelected(null); setModal('create'); }}
          >
            Add Course
          </button>
        </div>

        {loading ? (
          <div className="loading-state">Loading program of study…</div>
        ) : totalCoursesConfigured === 0 ? (
          <div className="sage-card">
            <div className="empty-state">
              <div className="empty-rule" />
              <div>
                <p className="empty-msg">No courses configured.</p>
                <p className="empty-sub">Add courses to define this major&apos;s program of study.</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {groups.map(group => (
              <div key={group.groupName} className="sage-card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{
                  background: 'var(--ob-3)',
                  padding: '10px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--t1)' }}>{group.groupName}</span>
                  <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                    {group.totalCredits} credits · {group.courses.length} courses
                  </span>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th>Credits</th>
                      <th>Requirement Type</th>
                      <th>Recommended Semester</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.courses.map(req => (
                      <React.Fragment key={req.requirementId}>
                        <tr>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{req.code}</td>
                          <td>{req.name}</td>
                          <td>{req.credits}</td>
                          <td style={{ textTransform: 'capitalize' }}>{req.requirementType}</td>
                          <td>Semester {req.recommendedSemester}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setSelected(req); setModal('edit'); }}
                            >
                              Edit
                            </button>
                            {' '}
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--red-dot)' }}
                              onClick={() => setPendingRemove(pendingRemove === req.requirementId ? null : req.requirementId)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                        {pendingRemove === req.requirementId && (
                          <tr>
                            <td colSpan={6} style={{ background: 'rgba(239,68,68,0.06)', padding: '8px 16px', fontSize: '12px', color: 'var(--t2)' }}>
                              Remove <strong>{req.code}</strong> from this program of study?{' '}
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--red-dot)', marginLeft: '8px' }}
                                onClick={() => handleRemove(req.requirementId)}
                              >
                                Yes
                              </button>
                              {' '}
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPendingRemove(null)}
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <RequirementModal
          requirement={modal === 'edit' ? selected : null}
          majorId={majorId}
          allCourses={availableCourses}
          existingGroups={existingGroups}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
