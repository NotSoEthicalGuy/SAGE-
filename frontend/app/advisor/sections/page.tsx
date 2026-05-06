'use client';

import { useState, useEffect } from 'react';
import { getAdvisorSections, updateAdvisorSection } from '@/lib/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function formatSchedule(section: any): string {
  const days = (section.scheduleDays ?? []).join(', ');
  const time = section.scheduleStartTime && section.scheduleEndTime
    ? `${section.scheduleStartTime}–${section.scheduleEndTime}`
    : '';
  const room = section.scheduleRoom || '';
  return [days, time, room ? `(${room})` : ''].filter(Boolean).join(' ') || '-';
}

export default function AdvisorSectionsPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    async function loadSections() {
      try {
        const data = await getAdvisorSections();
        setSections(data as any[]);
      } catch (err) {
        setError('Failed to load sections');
      } finally {
        setLoading(false);
      }
    }
    loadSections();
  }, []);

  const handleEdit = (section: any) => {
    setEditingId(section.sectionId);
    setEditForm({
      instructorName: section.instructorName ?? '',
      capacity: section.capacity ?? '',
      scheduleDays: section.scheduleDays ?? [],
      scheduleStartTime: section.scheduleStartTime ?? '',
      scheduleEndTime: section.scheduleEndTime ?? '',
      scheduleRoom: section.scheduleRoom ?? '',
    });
  };

  const toggleDay = (day: string) => {
    setEditForm((f: any) => ({
      ...f,
      scheduleDays: f.scheduleDays.includes(day)
        ? f.scheduleDays.filter((d: string) => d !== day)
        : [...f.scheduleDays, day],
    }));
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;
    try {
      const updated = await updateAdvisorSection(editingId, {
        instructorName: editForm.instructorName,
        capacity: Number(editForm.capacity),
        scheduleDays: editForm.scheduleDays,
        scheduleStartTime: editForm.scheduleStartTime,
        scheduleEndTime: editForm.scheduleEndTime,
        scheduleRoom: editForm.scheduleRoom,
      });
      setSections(sections.map((s) =>
        s.sectionId === editingId ? { ...s, ...(updated as any) } : s
      ));
      setEditingId(null);
      setEditForm(null);
    } catch {
      alert('Failed to update section');
    }
  };

  const handleCancel = () => { setEditingId(null); setEditForm(null); };

  if (loading) return <div className="p-6">Loading sections...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Course Sections</h1>
        <p className="text-gray-600">Manage sections for your assigned major.</p>
      </div>

      {sections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No sections assigned yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold">Course</th>
                <th className="text-left py-3 px-4 font-semibold">Section #</th>
                <th className="text-left py-3 px-4 font-semibold">Semester</th>
                <th className="text-left py-3 px-4 font-semibold">Schedule</th>
                <th className="text-left py-3 px-4 font-semibold">Instructor</th>
                <th className="text-center py-3 px-4 font-semibold">Enrolled</th>
                <th className="text-center py-3 px-4 font-semibold">Capacity</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.sectionId} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{section.course?.code || '-'}</td>
                  <td className="py-3 px-4">Section {section.sectionNumber ?? '-'}</td>
                  <td className="py-3 px-4">{section.semester || '-'}</td>

                  <td className="py-3 px-4">
                    {editingId === section.sectionId ? (
                      <div className="space-y-2" style={{ minWidth: '200px' }}>
                        <div className="flex gap-1 flex-wrap">
                          {DAYS.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                editForm.scheduleDays.includes(day)
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input
                            type="time"
                            value={editForm.scheduleStartTime}
                            onChange={(e) => setEditForm({ ...editForm, scheduleStartTime: e.target.value })}
                            className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full"
                          />
                          <input
                            type="time"
                            value={editForm.scheduleEndTime}
                            onChange={(e) => setEditForm({ ...editForm, scheduleEndTime: e.target.value })}
                            className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Room"
                          value={editForm.scheduleRoom}
                          onChange={(e) => setEditForm({ ...editForm, scheduleRoom: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                        />
                      </div>
                    ) : (
                      formatSchedule(section)
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {editingId === section.sectionId ? (
                      <input
                        type="text"
                        value={editForm.instructorName}
                        onChange={(e) => setEditForm({ ...editForm, instructorName: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                      />
                    ) : (
                      section.instructorName || '-'
                    )}
                  </td>

                  <td className="text-center py-3 px-4">{section.enrolledCount ?? 0}</td>

                  <td className="text-center py-3 px-4">
                    {editingId === section.sectionId ? (
                      <input
                        type="number"
                        value={editForm.capacity}
                        onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 w-16 text-center"
                      />
                    ) : (
                      section.capacity ?? '-'
                    )}
                  </td>

                  <td className="text-center py-3 px-4">
                    {editingId === section.sectionId ? (
                      <div className="flex gap-2 justify-center">
                        <button onClick={handleSave} className="text-green-600 hover:text-green-800 font-medium text-sm">Save</button>
                        <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800 font-medium text-sm">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(section)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
