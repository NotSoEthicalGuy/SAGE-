'use client';

import { useState, useEffect } from 'react';
import { getAdvisorSections, updateAdvisorSection } from '@/lib/api';

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
        setSections(data);
      } catch (err) {
        setError('Failed to load sections');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSections();
  }, []);

  const handleEdit = (section: any) => {
    setEditingId(section.id);
    setEditForm({ ...section });
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;

    try {
      await updateAdvisorSection(editingId, {
        schedule: editForm.schedule,
        instructor: editForm.instructor,
        capacity: editForm.capacity,
      });
      setSections(sections.map((s) => (s.id === editingId ? { ...s, ...editForm } : s)));
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      alert('Failed to update section');
      console.error(err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

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
                <th className="text-left py-3 px-4 font-semibold">Section</th>
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
                <tr key={section.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">{section.course.code}</td>
                  <td className="py-3 px-4">{section.sectionNumber || '-'}</td>
                  <td className="py-3 px-4">{section.semester}</td>
                  <td className="py-3 px-4">
                    {editingId === section.id ? (
                      <input
                        type="text"
                        value={editForm.schedule}
                        onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                      />
                    ) : (
                      section.schedule || '-'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === section.id ? (
                      <input
                        type="text"
                        value={editForm.instructor}
                        onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                      />
                    ) : (
                      section.instructor || '-'
                    )}
                  </td>
                  <td className="text-center py-3 px-4">{section.enrolledCount || 0}</td>
                  <td className="text-center py-3 px-4">
                    {editingId === section.id ? (
                      <input
                        type="number"
                        value={editForm.capacity}
                        onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) })}
                        className="border border-gray-300 rounded px-2 py-1 w-16 text-center"
                      />
                    ) : (
                      section.capacity || '-'
                    )}
                  </td>
                  <td className="text-center py-3 px-4">
                    {editingId === section.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(section)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
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
