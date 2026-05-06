import { NextResponse } from 'next/server';

import { updatePayrollConfigSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { parseJson } from '@/lib/api/response';
import { getPayrollConfig, updatePayrollConfig } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;
  return NextResponse.json({ config: getPayrollConfig() });
}

export async function PATCH(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updatePayrollConfigSchema);
  if (!parsed.success) return parsed.response;

  const next = updatePayrollConfig(parsed.data);
  return NextResponse.json({ config: next });
}
