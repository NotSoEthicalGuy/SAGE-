'use client';

import { ReactNode } from 'react';
import LayoutShell from '@/components/LayoutShell';

export default function AppointmentsLayout({ children }: { children: ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>;
}
