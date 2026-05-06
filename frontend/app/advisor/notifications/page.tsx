'use client';

import { useState, useEffect } from 'react';
import { getAdvisorNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdvisorNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdvisorNotifications()
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unread = notifications.filter(n => !n.isRead);
  const read   = notifications.filter(n => n.isRead);

  return (
    <>
      <div className="sage-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="sage-page-title">Notifications</div>
            <div className="sage-page-sub">Student approvals and system alerts.</div>
          </div>
          {unread.length > 0 && (
            <button className="btn btn-ghost-light btn-sm" onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="sage-body" style={{ maxWidth: '680px' }}>
        {loading && (
          <div style={{ fontSize: '13px', color: 'var(--t4)', padding: '8px 0' }}>Loading…</div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="sage-card">
            <div className="empty-state" style={{ padding: '48px 32px' }}>
              <div className="empty-msg">No notifications yet</div>
              <div className="empty-sub">You'll be notified when students approve their DNA reports.</div>
            </div>
          </div>
        )}

        {unread.length > 0 && (
          <div className="sage-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ padding: '8px 16px', fontSize: '9px', color: 'var(--t5)', letterSpacing: '1px', borderBottom: '1px solid var(--ob-3)', textTransform: 'uppercase' }}>
              Unread
            </div>
            {unread.map((n, i) => (
              <div
                key={n.id}
                style={{
                  display: 'flex', gap: '12px', padding: '14px 16px',
                  borderBottom: i < unread.length - 1 ? '1px solid var(--ob-2)' : 'none',
                  background: 'var(--ob-1)',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--am)', marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{n.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--t5)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--t4)', marginTop: '3px', lineHeight: 1.5 }}>{n.body}</div>
                  <button
                    style={{ marginTop: '8px', fontSize: '10px', color: 'var(--am)', border: '1px solid var(--am-dim, rgba(245,158,11,0.3))', borderRadius: '4px', padding: '3px 8px', background: 'none', cursor: 'pointer' }}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    Mark read
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {read.length > 0 && (
          <div className="sage-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 16px', fontSize: '9px', color: 'var(--t5)', letterSpacing: '1px', borderBottom: '1px solid var(--ob-3)', textTransform: 'uppercase' }}>
              Earlier
            </div>
            {read.map((n, i) => (
              <div
                key={n.id}
                style={{
                  display: 'flex', gap: '12px', padding: '14px 16px',
                  borderBottom: i < read.length - 1 ? '1px solid var(--ob-2)' : 'none',
                  opacity: 0.55,
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ob-4)', marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{n.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--t5)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--t4)', marginTop: '3px', lineHeight: 1.5 }}>{n.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
