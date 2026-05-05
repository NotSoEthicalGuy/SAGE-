'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '../lib/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/admin/dashboard');
    } else if (user.role === 'advisor') {
      router.replace('/advisor/dashboard');
    } else {
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
