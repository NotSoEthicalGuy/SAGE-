'use client';

import { useState, useEffect } from 'react';
import { getStudentComments, markStudentCommentRead } from '@/lib/api';

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function AdvisorMessagesPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [marking, setMarking]   = useState<string | null>(null);

  useEffect(() => {
    getStudentComments()
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (commentId: string) => {
    setMarking(commentId);
    try {
      await markStudentCommentRead(commentId);
      setComments(prev =>
        prev.map(c => c.commentId === commentId ? { ...c, isRead: true } : c)
      );
    } catch {
      // silently ignore
    } finally {
      setMarking(null);
    }
  };

  const unreadCount = comments.filter(c => !c.isRead).length;

  if (loading) return (
    <div className="sage-page-header">
      <div className="sage-page-title">Messages</div>
    </div>
  );

  return (
    <>
      <div className="sage-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sage-page-title">Messages</div>
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--am)',
              color: '#000',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              letterSpacing: '0.03em',
            }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="sage-page-sub">Messages from your academic advisor.</div>
      </div>

      <div className="sage-body" style={{ maxWidth: '720px' }}>
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#fca5a5',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {comments.length === 0 ? (
          <div className="sage-card">
            <div className="empty-state" style={{ padding: '48px 32px' }}>
              <div style={{ color: 'var(--t4)', marginBottom: '8px' }}>
                <MessageIcon />
              </div>
              <div className="empty-msg">No messages yet</div>
              <div className="empty-sub">Your advisor hasn't sent you any messages.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {comments.map((comment) => (
              <div
                key={comment.commentId}
                className="sage-card"
                style={{
                  padding: '16px 18px',
                  borderLeft: comment.isRead
                    ? '3px solid transparent'
                    : '3px solid var(--am)',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--t1)' }}>
                        {comment.advisor?.name ?? 'Your Advisor'}
                      </span>
                      {!comment.isRead && (
                        <span style={{
                          width: '7px', height: '7px',
                          borderRadius: '50%',
                          background: 'var(--am)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '2px' }}>
                      {formatDate(comment.createdAt)} at {formatTime(comment.createdAt)}
                    </div>
                  </div>

                  {!comment.isRead && (
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={marking === comment.commentId}
                      onClick={() => handleMarkRead(comment.commentId)}
                    >
                      {marking === comment.commentId ? 'Marking…' : 'Mark as read'}
                    </button>
                  )}
                </div>

                {/* Message body */}
                <div style={{
                  fontSize: '13px',
                  color: 'var(--t2)',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                }}>
                  {comment.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
