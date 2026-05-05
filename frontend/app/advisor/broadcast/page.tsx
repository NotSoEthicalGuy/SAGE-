'use client';

import { useState, useEffect } from 'react';
import { getAdvisorStudents, broadcastAdvisorComment } from '@/lib/api';

type Mode = 'select' | 'filter';

const DRIFT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'on_track', label: 'On Track' },
  { value: 'early_warning', label: 'Early Warning' },
  { value: 'drifting', label: 'Drifting' },
  { value: 'critical', label: 'Critical' },
];

export default function BroadcastPage() {
  const [mode, setMode] = useState<Mode>('select');
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState({ semester: '', gpaMin: '', gpaMax: '', driftStatus: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdvisorStudents().then(setStudents).catch(() => {});
  }, []);

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentNumber || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const previewCount = (() => {
    if (mode === 'select') return selectedIds.size;
    let count = students.length;
    if (filter.semester) count = students.filter((s) => String(s.currentSemester) === filter.semester).length;
    if (filter.gpaMin || filter.gpaMax) {
      const min = filter.gpaMin ? Number(filter.gpaMin) : 0;
      const max = filter.gpaMax ? Number(filter.gpaMax) : 4;
      count = students.filter((s) => {
        const gpa = s.cumulativeGpa ?? 0;
        return gpa >= min && gpa <= max;
      }).length;
    }
    return count;
  })();

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.studentId)));
    }
  };

  const handleSend = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    if (mode === 'select' && selectedIds.size === 0) { setError('Select at least one student'); return; }
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const payload =
        mode === 'select'
          ? { studentIds: Array.from(selectedIds), message }
          : {
              filter: {
                ...(filter.semester ? { semester: Number(filter.semester) } : {}),
                ...(filter.gpaMin ? { gpaMin: Number(filter.gpaMin) } : {}),
                ...(filter.gpaMax ? { gpaMax: Number(filter.gpaMax) } : {}),
                ...(filter.driftStatus ? { driftStatus: filter.driftStatus } : {}),
              },
              message,
            };
      const res = await broadcastAdvisorComment(payload);
      setResult(res);
      setMessage('');
      setSelectedIds(new Set());
      setFilter({ semester: '', gpaMin: '', gpaMax: '', driftStatus: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Broadcast Comments</h1>
        <p className="text-gray-600 mt-1">Send a message to multiple students at once.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['select', 'filter'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); setResult(null); }}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {m === 'select' ? 'Select Students' : 'Filter Students'}
          </button>
        ))}
      </div>

      {mode === 'select' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search by name or student ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
              <input
                type="checkbox"
                checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                onChange={toggleAll}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-gray-600">
                {selectedIds.size} selected
              </span>
            </div>
            {filteredStudents.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No students found.</p>
            ) : (
              filteredStudents.map((s) => (
                <label key={s.studentId} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.studentId)}
                    onChange={() => toggleStudent(s.studentId)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{s.studentNumber}</span>
                  </div>
                  <span className="text-xs text-gray-400">Sem {s.currentSemester}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {mode === 'filter' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={filter.semester}
                onChange={(e) => setFilter({ ...filter, semester: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>Semester {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drift Status</label>
              <select
                value={filter.driftStatus}
                onChange={(e) => setFilter({ ...filter, driftStatus: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DRIFT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min GPA</label>
              <input
                type="number"
                min={0}
                max={4}
                step={0.1}
                value={filter.gpaMin}
                onChange={(e) => setFilter({ ...filter, gpaMin: e.target.value })}
                placeholder="0.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max GPA</label>
              <input
                type="number"
                min={0}
                max={4}
                step={0.1}
                value={filter.gpaMax}
                onChange={(e) => setFilter({ ...filter, gpaMax: e.target.value })}
                placeholder="4.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Estimated recipients: <strong>{previewCount}</strong> student{previewCount !== 1 ? 's' : ''}
            {filter.driftStatus ? ' (exact count depends on latest AI reports)' : ''}
          </p>
        </div>
      )}

      {/* Message + Send */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Write your message here…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3">
            <p className="text-green-800 text-sm font-medium">
              Message sent to {result.sent} student{result.sent !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
      </div>
    </div>
  );
}
