'use client';

import { useState, useEffect } from 'react';
import { getStudentPos } from '@/lib/api';

export default function ProgramOfStudyPage() {
  const [pos, setPos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPos() {
      try {
        const data = await getStudentPos();
        setPos(data);
      } catch (err) {
        setError('Failed to load program of study');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadPos();
  }, []);

  if (loading) return <div className="p-6">Loading program of study...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!pos) return <div className="p-6">No program of study found</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Program of Study</h1>
        <p className="text-gray-600">Your major requirements and degree progress.</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressCard
          label="Completed Credits"
          value={pos.completedCredits}
          total={pos.totalCredits}
          color="green"
        />
        <ProgressCard
          label="In Progress Credits"
          value={pos.inProgressCredits}
          total={pos.totalCredits}
          color="blue"
        />
        <ProgressCard
          label="Remaining Credits"
          value={pos.remainingCredits}
          total={pos.totalCredits}
          color="gray"
        />
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Overall Progress</h3>
          <span className="text-sm font-medium">
            {((pos.completedCredits / pos.totalCredits) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="h-4 bg-green-500 transition-all"
            style={{ width: `${(pos.completedCredits / pos.totalCredits) * 100}%` }}
          />
        </div>
      </div>

      {/* Required Courses */}
      {pos.requiredCourses && pos.requiredCourses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-4">Required Courses</h3>
          <div className="space-y-3">
            {pos.requiredCourses.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">{item.course.code}</p>
                  <p className="text-sm text-gray-600">{item.course.title}</p>
                  <p className="text-xs text-gray-500 mt-1">Semester: {item.semester}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.course.credits} credits</p>
                  <p className="text-sm text-gray-600">Required</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Elective Courses */}
      {pos.electiveCourses && pos.electiveCourses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-4">Elective Courses</h3>
          <div className="space-y-3">
            {pos.electiveCourses.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">{item.course.code}</p>
                  <p className="text-sm text-gray-600">{item.course.title}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.course.credits} credits</p>
                  <p className="text-sm text-gray-600">Elective</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'green' | 'blue' | 'gray';
}) {
  const colorMap = {
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
  };

  const style = colorMap[color];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <p className="text-gray-600 text-sm">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${style.text}`}>
        {value}/{total}
      </p>
    </div>
  );
}
