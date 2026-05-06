'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeStudent,
  getAdvisorEnrollments,
  getStudentReports,
  getStudents,
  getMajors,
  lookupAdvisorStudentById,
} from '@/lib/api';

type QueryMode = 'major' | 'id';

type StudentOption = {
  studentId: string;
  studentNumber?: string;
  name: string;
  majorId?: string;
  majorName?: string;
  advisorName?: string;
  isRegistered: boolean;
  majorMatch?: boolean;
};

export default function AdvisorStudentInformationPage() {
  const [mode, setMode] = useState<QueryMode>('major');
  const [majors, setMajors] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [comboSearch, setComboSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const [inputStudentId, setInputStudentId] = useState('');

  const [querying, setQuerying] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [academicStatus, setAcademicStatus] = useState('Not analyzed');
  const [runningDrift, setRunningDrift] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLists() {
      setLoadingLists(true);
      try {
        const [majorsData, studentsData, enrollmentsData] = await Promise.all([
          getMajors(),
          getStudents(),
          getAdvisorEnrollments(),
        ]);

        const registeredStudentIds = new Set(
          (Array.isArray(enrollmentsData) ? enrollmentsData : []).map((e: any) => e.studentId).filter(Boolean)
        );

        setMajors(Array.isArray(majorsData) ? majorsData : []);
        setAllStudents(
          (Array.isArray(studentsData) ? studentsData : []).map((s: any) => ({
            studentId: s.studentId,
            studentNumber: s.studentNumber,
            name: s.name,
            majorId: s.majorId,
            majorName: s.major?.name,
            advisorName: s.advisor?.name,
            isRegistered: registeredStudentIds.has(s.studentId),
            majorMatch: true,
          }))
        );
      } catch (err: any) {
        setPageError(err?.message || 'Failed to load student information lists');
      } finally {
        setLoadingLists(false);
      }
    }

    loadLists();
  }, []);

  const majorScopedStudents = useMemo(() => {
    const scoped = selectedMajor
      ? allStudents.filter((s) => s.majorId === selectedMajor)
      : allStudents;
    if (!comboSearch.trim()) return scoped;
    const key = comboSearch.toLowerCase();
    return scoped.filter(
      (s) =>
        s.name.toLowerCase().includes(key) ||
        s.studentId.toLowerCase().includes(key) ||
        (s.studentNumber || '').toLowerCase().includes(key)
    );
  }, [allStudents, selectedMajor, comboSearch]);

  const selectedStudentOption = allStudents.find((s) => s.studentId === selectedStudentId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedMajorObj = majors.find((m) => m.majorId === selectedMajor);

  const fetchAcademicStatus = async (studentId: string) => {
    try {
      const reports = await getStudentReports(studentId);
      const latest = Array.isArray(reports) ? reports[0] : null;
      setAcademicStatus(latest?.driftLevel ? String(latest.driftLevel).replace(/_/g, ' ') : 'Not analyzed');
    } catch {
      setAcademicStatus('Not analyzed');
    }
  };

  const handleQuery = async () => {
    setPageError(null);
    setQuerying(true);
    setSelectedStudent(null);
    try {
      if (mode === 'major') {
        const student = allStudents.find((s) => s.studentId === selectedStudentId);
        if (!student) throw new Error('Please select a student from the list');
        setSelectedStudent(student);
        await fetchAcademicStatus(student.studentId);
        return;
      }

      const rawId = inputStudentId.trim();
      if (!rawId) throw new Error('Please enter a student ID');
      const lookup = await lookupAdvisorStudentById(rawId) as any;
      const mapped: StudentOption = {
        studentId: lookup.studentId,
        studentNumber: lookup.studentNumber,
        name: lookup.name,
        majorId: lookup.majorId,
        majorName: lookup.major?.name,
        advisorName: lookup.advisor?.name,
        isRegistered: Boolean(lookup.isRegistered),
        majorMatch: Boolean(lookup.majorMatch),
      };
      setSelectedStudent(mapped);
      await fetchAcademicStatus(mapped.studentId);
    } catch (err: any) {
      setPageError(err?.message || 'Query failed');
    } finally {
      setQuerying(false);
    }
  };

  const runDriftDetection = async () => {
    if (!selectedStudent) return;
    setRunningDrift(true);
    setPageError(null);
    try {
      await analyzeStudent(selectedStudent.studentId);
      await fetchAcademicStatus(selectedStudent.studentId);
    } catch (err: any) {
      setPageError(err?.message || 'Failed to run drift detection');
    } finally {
      setRunningDrift(false);
    }
  };

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Student Information</div>
        <div className="sage-page-sub">Query students and open registration, transcript, and program of study views.</div>
      </div>

      <div className="page-body space-y-4">
        {/* overflow:visible so the student combo dropdown isn't clipped
            by the card's default overflow:hidden */}
        <div className="sage-card p-4 space-y-4" style={{ overflow: 'visible' }}>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${mode === 'major' ? 'btn-amber' : 'btn-ghost-light'}`}
              onClick={() => setMode('major')}
            >
              Student by major
            </button>
            <button
              className={`btn btn-sm ${mode === 'id' ? 'btn-amber' : 'btn-ghost-light'}`}
              onClick={() => setMode('id')}
            >
              Student by ID
            </button>
          </div>

          {mode === 'major' ? (
            <div className="space-y-3">
              <div className="form-group">
                <label className="input-label">Major</label>
                <select
                  className="sage-select"
                  value={selectedMajor}
                  onChange={(e) => {
                    setSelectedMajor(e.target.value);
                    setSelectedStudentId('');
                    setComboSearch('');
                  }}
                  disabled={loadingLists}
                >
                  <option value="">All majors</option>
                  {majors.map((major: any) => (
                    <option key={major.majorId} value={major.majorId}>
                      {major.name}
                    </option>
                  ))}
                </select>
                {selectedMajorObj && (
                  <div className="text-xs text-gray-500 mt-1">Selected major: {selectedMajorObj.name}</div>
                )}
              </div>

              <div className="form-group" ref={comboRef} style={{ position: 'relative' }}>
                <label className="input-label">Student</label>
                <button
                  type="button"
                  className="sage-input"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    color: selectedStudentOption ? 'var(--t1)' : 'var(--t4)',
                  }}
                  disabled={loadingLists}
                  onClick={() => { setComboOpen((o) => !o); setComboSearch(''); }}
                >
                  <span style={{ fontSize: '13px' }}>
                    {selectedStudentOption
                      ? `${selectedStudentOption.studentNumber || selectedStudentOption.studentId} — ${selectedStudentOption.name}`
                      : loadingLists ? 'Loading students…' : 'Select a student…'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ flexShrink: 0, transform: comboOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {comboOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--surf)', border: '1px solid var(--border)',
                    borderRadius: '6px', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                      <input
                        autoFocus
                        className="sage-input"
                        placeholder="Search by name or ID…"
                        value={comboSearch}
                        onChange={(e) => setComboSearch(e.target.value)}
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {majorScopedStudents.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--t4)' }}>No students found</div>
                      ) : (
                        majorScopedStudents.map((student) => {
                          const isSelected = selectedStudentId === student.studentId;
                          return (
                            <button
                              key={student.studentId}
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(student.studentId);
                                setComboOpen(false);
                                setComboSearch('');
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                width: '100%', padding: '8px 12px', border: 'none',
                                cursor: 'pointer', textAlign: 'left',
                                background: isSelected ? '#f7f7f8' : 'var(--surf)',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f7f7f8')}
                              onMouseLeave={e => (e.currentTarget.style.background = isSelected ? '#f7f7f8' : 'var(--surf)')}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)' }}>{student.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--t4)' }}>{student.studentNumber || student.studentId}</div>
                              </div>
                              <span style={{
                                fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em',
                                color: student.isRegistered ? 'var(--am-2)' : 'var(--t4)',
                              }}>
                                {student.isRegistered ? 'REGISTERED' : 'NOT REG.'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="input-label">Student ID</label>
              <input
                className="sage-input"
                value={inputStudentId}
                onChange={(e) => setInputStudentId(e.target.value)}
                placeholder="Enter student ID..."
              />
            </div>
          )}

          <div>
            <button className="btn btn-amber" onClick={handleQuery} disabled={querying || loadingLists}>
              {querying ? 'Querying...' : 'Query'}
            </button>
          </div>

          {pageError && <div className="text-sm text-red-600">{pageError}</div>}
        </div>

        {selectedStudent && (
          <div className="sage-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoRow label="ID" value={selectedStudent.studentNumber || selectedStudent.studentId} />
              <InfoRow label="Student Name" value={selectedStudent.name} />
              <InfoRow label="Academic Status" value={academicStatus} />
              <InfoRow label="Major" value={selectedStudent.majorName || '-'} />
              <InfoRow label="Advisor" value={selectedStudent.advisorName || '-'} />
              <InfoRow label="Registration Status" value={selectedStudent.isRegistered ? 'Registered' : 'Not Registered'} />
            </div>

            {academicStatus === 'Not analyzed' && (
              <div>
                <button className="btn btn-ghost-light" onClick={runDriftDetection} disabled={runningDrift}>
                  {runningDrift ? 'Running...' : 'Run Sage AI Drift Detection'}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                className={`btn ${selectedStudent.majorMatch === false ? 'btn-ghost-light' : 'btn-amber'}`}
                href={`/advisor/student-information/registration/${selectedStudent.studentId}`}
                aria-disabled={selectedStudent.majorMatch === false}
                onClick={(e) => {
                  if (selectedStudent.majorMatch === false) e.preventDefault();
                }}
              >
                Registration
              </Link>
              <Link className="btn btn-ghost-light" href={`/advisor/student-information/transcript/${selectedStudent.studentId}`}>
                Student transcript
              </Link>
              <Link className="btn btn-ghost-light" href={`/advisor/student-information/program-of-study/${selectedStudent.studentId}`}>
                Program of study
              </Link>
            </div>

            {selectedStudent.majorMatch === false && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Registration is disabled because this student is not in your assigned major.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}
