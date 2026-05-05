'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdvisorComments } from '@/lib/api';

export default function AdvisorCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadComments() {
      try {
        const data = await getAdvisorComments();
        setComments(data);
      } catch (err) {
        setError('Failed to load comments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadComments();
  }, []);

  const filteredComments = comments.filter((c) => {
    if (filterRead === 'unread' && c.isRead) return false;
    if (filterRead === 'read' && !c.isRead) return false;
    if (search && !c.student.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="p-6">Loading comments...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Student Comments</h1>
        <p className="text-gray-600">Messages and notes about your assigned students.</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search student names..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterRead(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                filterRead === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredComments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No comments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <Link
              key={comment.id}
              href={`/advisor/students/${comment.student.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{comment.student.name}</h3>
                    <span className="text-sm text-gray-600">({comment.student.studentNumber})</span>
                    {!comment.isRead && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{comment.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                    {new Date(comment.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="ml-4">
                  {!comment.isRead && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                      Unread
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
