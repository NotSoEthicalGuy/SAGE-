import React from 'react';

interface LogoWordmarkProps {
  context?: 'dark' | 'light';
  showTagline?: boolean;
}

export function LogoWordmark({ context = 'dark', showTagline = false }: LogoWordmarkProps) {
  const ruleColor = context === 'dark' ? 'var(--am)' : 'var(--ob)';
  const textColor = context === 'dark' ? '#fafafa' : '#0a0a0b';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px' }}>
      <div style={{
        width: '2px',
        background: ruleColor,
        borderRadius: '1px',
        flexShrink: 0,
      }} />
      <div>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase' as const,
          color: textColor,
          lineHeight: 1,
        }}>
          SAGE
        </div>
        {showTagline && (
          <div style={{
            fontSize: '8.5px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--ob-5)',
            lineHeight: 1.4,
            marginTop: '4px',
          }}>
            STUDENT ACADEMIC /<br />GUIDANCE ENGINE
          </div>
        )}
      </div>
    </div>
  );
}

export function SageLogo(_props: { size?: number; className?: string }) {
  return <LogoWordmark context="dark" />;
}
