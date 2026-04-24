import { NextResponse } from 'next/server';

import { createSubjectChannelSchema, type SubjectChannel } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { subjectChannelsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createSubjectChannelSchema);
  if (!parsed.success) return parsed.response;

  const channel: SubjectChannel = {
    id: generateId('ch'),
    subjectId: parsed.data.subjectId,
    dealType: parsed.data.dealType,
    channelName: parsed.data.channelName,
    channelUrl: parsed.data.channelUrl,
    active: parsed.data.active,
  };
  await subjectChannelsStore.upsert(channel);
  return NextResponse.json({ channel }, { status: 201 });
}
