'use client';

import { useEffect, useState } from 'react';
import { getAdminSections } from '@/lib/api';

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminSections()
      .then((data) => setSections(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Sections</div>
        <div className="sage-page-sub">Overview of open and closed sections</div>
      </div>
      <div className="sage-body">
        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading sections...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Semester</th>
                  <th>Instructor</th>
                  <th>Capacity</th>
                  <th>Enrolled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.sectionId}>
                    <td>{section.course?.code} — {section.course?.name}</td>
                    <td>{section.semester}</td>
                    <td>{section.instructorName}</td>
                    <td>{section.capacity}</td>
                    <td>{section.enrolledCount}</td>
                    <td>{section.isOpen ? 'Open' : 'Closed'}</td>
                  </tr>
                ))}
                {sections.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">No sections found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
