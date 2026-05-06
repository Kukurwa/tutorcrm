import { NextResponse } from 'next/server';

import { createUserSchema, type User, type UserPublic } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { setPassword, usersStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const rows = await usersStore.list();
  const items: UserPublic[] = rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
  }));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createUserSchema);
  if (!parsed.success) return parsed.response;

  const all = await usersStore.list();
  if (all.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase())) {
    return errorResponse('CONFLICT', 'Email already in use');
  }

  const user: User = {
    id: generateId('user'),
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    status: 'active',
    hireDate: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await usersStore.upsert(user);
  setPassword(user.id, parsed.data.password);

  const publicUser: UserPublic = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
  return NextResponse.json({ user: publicUser }, { status: 201 });
}
