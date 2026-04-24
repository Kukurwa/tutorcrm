import { NextResponse } from 'next/server';

import type { Message } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse } from '@/lib/api/response';
import { dialogsStore, messagesStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

const MOCK_TEXTS = [
  'А у меня вопрос: стоимость?',
  'Спасибо за ответ! А расписание гибкое?',
  'Можно созвониться?',
  'Жду вашей рекомендации',
  'Хорошо, подожду',
  'А есть опыт подготовки к ЗНО?',
];

interface Ctx {
  params: { id: string };
}

export async function POST(_req: Request, { params }: Ctx) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  try {
    const dialog = await dialogsStore.requireById(params.id);
    const text = MOCK_TEXTS[Math.floor(Math.random() * MOCK_TEXTS.length)] ?? 'Привет!';

    const message: Message = {
      id: generateId('msg'),
      dialogId: dialog.id,
      direction: 'in',
      text,
      authorName: dialog.clientName,
      sentAt: nowIso(),
      read: false,
    };
    await messagesStore.upsert(message);

    const nextDialog = {
      ...dialog,
      unread: dialog.unread + 1,
      lastMessagePreview: text.slice(0, 80),
      lastMessageAt: message.sentAt,
      updatedAt: message.sentAt,
    };
    await dialogsStore.upsert(nextDialog);

    return NextResponse.json({ message, dialog: nextDialog }, { status: 201 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Dialog not found');
    }
    throw err;
  }
}
