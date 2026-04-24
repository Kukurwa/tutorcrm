import type { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';

import type { Role } from '@tutorcrm/contracts';

import { authOptions } from '@/lib/auth/options';

import { errorResponse } from './response';

export async function requireApiSession(): Promise<
  { session: Session } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { response: errorResponse('UNAUTHORIZED', 'Not authenticated') };
  }
  return { session };
}

export async function requireApiRole(
  ...roles: Role[]
): Promise<{ session: Session } | { response: NextResponse }> {
  const result = await requireApiSession();
  if ('response' in result) return result;
  if (!roles.includes(result.session.user.role)) {
    return { response: errorResponse('FORBIDDEN', 'Insufficient permissions') };
  }
  return result;
}
