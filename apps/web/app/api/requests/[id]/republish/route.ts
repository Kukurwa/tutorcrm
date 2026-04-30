import { NextResponse } from 'next/server';

import { republishRequestSchema, type Request as Req } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, requestsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

// Перевыставление заявки: можно поправить цену/описание и получить «новую дату публикации».
// Доступно через час и более после publishedAt без откликов; в моках клиентский UI сам решает,
// показывать ли кнопку — бэк просто принимает запрос и обновляет поля.
export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, republishRequestSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await requestsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      current.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your request');
    }
    const next: Req = {
      ...current,
      pricePerHour: parsed.data.pricePerHour ?? current.pricePerHour,
      requestPrice: parsed.data.requestPrice ?? current.requestPrice,
      extraInfo: parsed.data.extraInfo ?? current.extraInfo,
      republishedAt: nowIso(),
      republishCount: current.republishCount + 1,
      updatedAt: nowIso(),
    };
    await requestsStore.upsert(next);
    return NextResponse.json({ request: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Request not found');
    }
    throw err;
  }
}
