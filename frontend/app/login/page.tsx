'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';
import { setAuthUser } from '../../lib/auth';
import { LogoWordmark } from '../../components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuthUser({
        token: data.token,
        role: data.role,
        name: data.name,
        email: data.email,
        advisorId: data.advisorId,
        studentId: data.studentId,
        studentNumber: data.studentNumber,
      });
      if (data.role === 'admin')        router.push('/admin/dashboard');
      else if (data.role === 'student') router.push('/dashboard');
      else                              router.push('/advisor/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ob)',
      display: 'grid',
      gridTemplateColumns: '1.15fr 0.85fr',
    }}>
      {/* Left: Brand panel */}
      <div style={{
        padding: '60px 64px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Amber glow */}
        <div style={{
          position: 'absolute',
          top: '-100px', right: '-100px',
          width: '500px', height: '500px',
          background: 'radial-gradient(ellipse, rgba(245,158,11,.12), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ marginBottom: '48px', position: 'relative', zIndex: 1 }}>
          <LogoWordmark context="dark" showTagline />
        </div>

        <h1 style={{
          fontSize: '36px',
          fontWeight: 800,
          letterSpacing: '-1.5px',
          color: '#fafafa',
          lineHeight: 1.1,
          marginBottom: '16px',
          maxWidth: '420px',
          position: 'relative', zIndex: 1,
        }}>
          A modern university portal for students and advisors.
        </h1>

        <p style={{
          fontSize: '14px',
          color: 'var(--ob-5)',
          lineHeight: 1.7,
          maxWidth: '380px',
          marginBottom: '40px',
          position: 'relative', zIndex: 1,
        }}>
          Access schedules, grades, accounting, academic guidance, and Sage AI in a single workspace.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          maxWidth: '480px',
          position: 'relative', zIndex: 1,
        }}>
          {[
            ['Academic', 'Plans, holds, and grades'],
            ['Operations', 'Advisors and admin tools'],
            ['Sage AI', 'Student guidance powered by AI'],
          ].map(([title, desc]) => (
            <div key={title} style={{
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: '4px',
              padding: '14px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e4e4e7', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '11px', color: 'var(--ob-5)', lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Sign-in panel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        borderLeft: '1px solid var(--ob-3)',
      }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--ob-4)', marginBottom: '8px',
            }}>
              Sign in
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.6px', color: '#fafafa' }}>
              Access your portal
            </div>
          </div>

          {error && (
            <div style={{
              marginBottom: '16px',
              border: '1px solid rgba(239,68,68,.4)',
              background: 'rgba(239,68,68,.1)',
              borderRadius: '3px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#fca5a5',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--ob-5)', marginBottom: '6px',
              }}>
                Email
              </label>
              <input
                type="email"
                className="sage-input-dark"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@sage.edu"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--ob-5)', marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                className="sage-input-dark"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-amber"
              style={{ justifyContent: 'center', width: '100%', padding: '10px 16px', fontSize: '13px', marginTop: '4px' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
