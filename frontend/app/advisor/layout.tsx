'use client';

import type { ReactNode } from 'react';
import AdvisorLayout from '@/components/AdvisorLayout';

export default function AdvisorRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdvisorLayout>{children}</AdvisorLayout>
  );
}
