import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { Client } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { parseSearchParams } from '@/lib/api/response';
import { normalizePhone } from '@/lib/phone';
import { clientsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

const querySchema = z.object({ phone: z.string().min(3) });

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const parsed = parseSearchParams(new URL(req.url), querySchema);
  if (!parsed.success) return parsed.response;

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ duplicate: false });

  const all = await clientsStore.list();
  const match: Client | undefined = all.find((c) => c.phone === phone);

  return NextResponse.json(
    match ? { duplicate: true, client: match } : { duplicate: false },
  );
}
