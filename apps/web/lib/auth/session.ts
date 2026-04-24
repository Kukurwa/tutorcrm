import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import type { Role } from '@tutorcrm/contracts';

import { authOptions } from './options';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect('/dashboard');
  }
  return session;
}
