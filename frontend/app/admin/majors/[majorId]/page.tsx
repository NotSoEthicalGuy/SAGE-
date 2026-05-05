'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourses, getMajors, createCourse, updateCourse, deleteCourse, uploadCourseMaterial, deleteCourseMaterial, addCourseSkill, deleteCourseSkill } from '../../../../lib/api';

function CourseModal({ course, majorId, onClose, onSave }: { course: any | null; majorId: string; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: course?.name || '',
    code: course?.code || '',
    credits: course?.credits || 3,
    semesterOffered: course?.semesterOffered || 1,
    difficultyLevel: course?.difficultyLevel || 2,
    syllabusText: course?.syllabusText || '',
    topicsCovered: course?.topicsCovered?.join(', ') || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        majorId,
        credits: Number(form.credits),
        semesterOffered: Number(form.semesterOffered),
        topicsCovered: form.topicsCovered.split(',').map((s: string) => s.trim()).filter(Boolean),
      };
      if (course) {
        await updateCourse(course.courseId, payload);
      } else {
        await createCourse(payload);
      }
      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <span className="modal-title">{course ? 'Edit Course' : 'Add Course'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Course Name</label>
                <input className="sage-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Course Code</label>
                <input className="sage-input" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="CS101" required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Credits</label>
                <input className="sage-input" type="number" min="1" max="6" value={form.credits} onChange={e => setForm({...form, credits: Number(e.target.value)})} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Semester</label>
                <input className="sage-input" type="number" min="1" max="10" value={form.semesterOffered} onChange={e => setForm({...form, semesterOffered: Number(e.target.value)})} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Difficulty (1-5)</label>
                <input className="sage-input" type="number" min="1" max="5" value={form.difficultyLevel} onChange={e => setForm({...form, difficultyLevel: Number(e.target.value)})} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="input-label">Topics Covered (comma-separated)</label>
              <input className="sage-input" value={form.topicsCovered} onChange={e => setForm({...form, topicsCovered: e.target.value})} placeholder="Arrays, Sorting, Graph Theory" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Syllabus Text (AI context)</label>
              <textarea className="sage-input" style={{ height: '70px', resize: 'vertical' }} value={form.syllabusText} onChange={e => setForm({...form, syllabusText: e.target.value})} placeholder="Describe what is covered in this course..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-amber" disabled={loading}>{loading ? 'Saving...' : course ? 'Save Changes' : 'Add Course'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MajorDetailPage() {
  const { majorId } = useParams<{ majorId: string }>();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [major, setMajor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [newSkill, setNewSkill] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, majors] = await Promise.all([getCourses(majorId), getMajors()]);
      setCourses(c);
      setMajor(majors.find((m: any) => m.majorId === majorId) || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [majorId]);

  async function handleDelete(c: any) {
    if (!confirm(`Delete course "${c.name}"?`)) return;
    try { await deleteCourse(c.courseId); load(); } catch (err: any) { alert(err.message); }
  }

  async function handleUpload(courseId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(prev => ({ ...prev, [courseId]: true }));
    try { await uploadCourseMaterial(courseId, file); load(); } catch (err: any) { alert(err.message); } finally {
      setUploading(prev => ({ ...prev, [courseId]: false }));
      e.target.value = '';
    }
  }

  async function handleDeleteMaterial(courseId: string, materialId: string) {
    if (!confirm('Remove this material?')) return;
    try { await deleteCourseMaterial(courseId, materialId); load(); } catch (err: any) { alert(err.message); }
  }

  async function handleAddSkill(courseId: string) {
    const name = newSkill[courseId]?.trim();
    if (!name) return;
    try {
      await addCourseSkill(courseId, name);
      setNewSkill(prev => ({ ...prev, [courseId]: '' }));
      load();
    } catch (err: any) { alert(err.message); }
  }

  async function handleDeleteSkill(courseId: string, skillId: string) {
    try { await deleteCourseSkill(courseId, skillId); load(); } catch (err: any) { alert(err.message); }
  }

  return (
    <>
      <div className="sage-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 0', color: '#6b7280' }} onClick={() => router.push('/admin/majors')}>
            ← Majors
          </button>
        </div>
        <div className="sage-page-title">{major?.name || 'Major Courses'}</div>
        <div className="sage-page-sub">{major?.faculty} — {major?.totalCredits} credits</div>
      </div>

      <div className="sage-body">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/admin/majors/${majorId}/pos`)}>
            Program of Study
          </button>
          <button className="btn btn-amber" onClick={() => { setSelected(null); setModal('create'); }}>Add Course</button>
        </div>

        {loading ? (
          <div className="loading-state">Loading courses...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {courses.map(c => (
              <div key={c.courseId} className="sage-card">
                <div
                  className="sage-card-header"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === c.courseId ? null : c.courseId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="badge badge-gray" style={{ fontFamily: 'monospace' }}>{c.code}</span>
                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{c.name}</span>
                    <span className="badge badge-amber">{c.credits} cr</span>
                    {c.semesterOffered && <span style={{ color: '#9ca3af', fontSize: '11px' }}>Sem {c.semesterOffered}</span>}
                    {c.skills?.length > 0 && <span style={{ color: '#9ca3af', fontSize: '11px' }}>{c.skills.length} skills</span>}
                    {c.materials?.length > 0 && <span style={{ color: '#9ca3af', fontSize: '11px' }}>{c.materials.length} materials</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(c); setModal('edit'); }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(c); }}>Delete</button>
                    <span style={{ color: '#d1d5db', fontSize: '12px', padding: '4px 4px' }}>{expanded === c.courseId ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === c.courseId && (
                  <div style={{ padding: "16px 24px" }}>
                    {/* Skills */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: '8px' }}>
                        Required Skills
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {c.skills?.map((sk: any) => (
                          <span key={sk.skillId} className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {sk.skillName}
                            <button onClick={() => handleDeleteSkill(c.courseId, sk.skillId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: '11px', padding: 0, lineHeight: 1 }}>✕</button>
                          </span>
                        ))}
                        {(!c.skills || c.skills.length === 0) && <span style={{ color: '#d1d5db', fontSize: '12px' }}>No skills added</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input className="sage-input" style={{ width: '200px' }} placeholder="Add skill..." value={newSkill[c.courseId] || ''} onChange={e => setNewSkill(prev => ({...prev, [c.courseId]: e.target.value}))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill(c.courseId))} />
                        <button className="btn btn-ghost-light btn-sm" onClick={() => handleAddSkill(c.courseId)}>Add</button>
                      </div>
                    </div>

                    {/* Materials */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: '8px' }}>
                        Course Materials
                      </div>
                      {c.materials?.map((m: any) => (
                        <div key={m.materialId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <span className={`badge ${m.fileType === 'pdf' ? 'badge-red' : 'badge-amber'}`}>{m.fileType.toUpperCase()}</span>
                          <span style={{ flex: 1, fontSize: '12px', color: '#374151' }}>{m.fileName}</span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(m.uploadedAt).toLocaleDateString()}</span>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMaterial(c.courseId, m.materialId)}>Remove</button>
                        </div>
                      ))}
                      {(!c.materials || c.materials.length === 0) && <div style={{ color: '#d1d5db', fontSize: '12px', marginBottom: '8px' }}>No materials uploaded</div>}
                      <div style={{ marginTop: '8px' }}>
                        <label className="btn btn-ghost-light btn-sm" style={{ cursor: 'pointer' }}>
                          {uploading[c.courseId] ? 'Uploading...' : 'Upload PDF / PPTX'}
                          <input type="file" accept=".pdf,.pptx,.ppt" style={{ display: 'none' }} onChange={e => handleUpload(c.courseId, e)} disabled={uploading[c.courseId]} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {courses.length === 0 && <div className="empty-state">No courses added to this major yet</div>}
          </div>
        )}
      </div>

      {modal && (
        <CourseModal
          course={modal === 'edit' ? selected : null}
          majorId={majorId}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
