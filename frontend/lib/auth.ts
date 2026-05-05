/**
 * SAGE Frontend Auth Utilities
 */

export interface AuthUser {
  token: string;
  role: 'admin' | 'advisor' | 'student';
  name: string;
  email: string;
  advisorId?: string;
  studentId?: string;
  studentNumber?: string;
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('sage_user');
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser): void {
  localStorage.setItem('sage_user', JSON.stringify(user));
}

export function clearAuthUser(): void {
  localStorage.removeItem('sage_user');
}

export function getToken(): string | null {
  return getAuthUser()?.token ?? null;
}

export function isAdmin(): boolean {
  return getAuthUser()?.role === 'admin';
}

export function isAdvisor(): boolean {
  return getAuthUser()?.role === 'advisor';
}

export function isStudent(): boolean {
  return getAuthUser()?.role === 'student';
}
