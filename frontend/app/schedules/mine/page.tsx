'use client';

import { useEffect, useState, useMemo } from 'react';
import PlaceholderPage from '@/components/PlaceholderPage';
import { getStudentPrerequisiteViolations } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';

export default function Page() {
  const user = useMemo(() => getAuthUser(), []);
  const [violations, setViolations] = useState<{ courseName: string; missingPrereq: string }[]>([]);

  useEffect(() => {
    if (!user?.studentId) return;
    getStudentPrerequisiteViolations(user.studentId)
      .then(data => setViolations(data.violations))
      .catch(() => {});
  }, [user]);

  return (
    <>
      {violations.length > 0 && (
        <div style={{
          borderLeft: '2px solid var(--am)',
          paddingLeft: '16px',
          margin: '16px 24px 0',
        }}>
          {violations.map((v, i) => (
            <div key={i} style={{
              fontSize: '13px',
              color: 'var(--t2)',
              marginBottom: i < violations.length - 1 ? '6px' : 0,
            }}>
              You are enrolled in {v.courseName} without completing {v.missingPrereq}. Please contact your advisor.
            </div>
          ))}
        </div>
      )}
      <PlaceholderPage title="My Schedule" />
    </>
  );
}
