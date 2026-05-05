'use client';

import { useState, useEffect } from 'react';
import { getStudentComments, markStudentCommentRead } from '@/lib/api';

export default function AdvisorCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComments() {
      try {
        const data = await getStudentComments();
        setComments(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Failed to load advisor comments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadComments();
  }, []);

  const handleMarkAsRead = async (commentId: string) => {
    try {
      await markStudentCommentRead(commentId);
      setComments(
        comments.map((c) => (c.id === commentId ? { ...c, isRead: true } : c))
      );
    } catch (err) {
      alert('Failed to mark comment as read');
    }
  };

  if (loading) return <div className="p-6">Loading advisor comments...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const unreadCount = comments.filter((c) => !c.isRead).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Advisor Comments</h1>
        <p className="text-gray-600">Messages from your academic advisor.</p>
        {unreadCount > 0 && (
          <div className="mt-2 inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {unreadCount} unread
          </div>
        )}
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No advisor comments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg border p-4 transition-colors ${
                !comment.isRead
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Academic Advisor</h3>
                    {!comment.isRead && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                    {new Date(comment.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!comment.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(comment.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Mark as read
                  </button>
                )}
              </div>

              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-gray-800">{comment.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
