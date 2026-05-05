'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
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
    if (!studentSearch.trim()) return scoped;
    const key = studentSearch.toLowerCase();
    return scoped.filter(
      (s) =>
        s.name.toLowerCase().includes(key) ||
        s.studentId.toLowerCase().includes(key) ||
        (s.studentNumber || '').toLowerCase().includes(key)
    );
  }, [allStudents, selectedMajor, studentSearch]);

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
      const lookup = await lookupAdvisorStudentById(rawId);
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
        <div className="sage-card p-4 space-y-4">
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

              <div className="form-group">
                <label className="input-label">Student list</label>
                <input
                  className="sage-input"
                  placeholder="Search by ID or name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  disabled={loadingLists}
                />
                <select
                  className="select mt-2"
                  size={8}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={loadingLists}
                >
                  {majorScopedStudents.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {(student.studentNumber || student.studentId) + ' | ' + student.name + ' | ' + (student.isRegistered ? 'Registered' : 'Not Registered')}
                    </option>
                  ))}
                </select>
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
