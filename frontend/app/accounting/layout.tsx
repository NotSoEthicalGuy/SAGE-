'use client';
import { ReactNode } from 'react';
import LayoutShell from '@/components/LayoutShell';

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>;
}
