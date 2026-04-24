'use client';

import { Bell, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Dialog, Message } from '@tutorcrm/contracts';
import { Button, cn, EmptyState, Skeleton, Textarea } from '@tutorcrm/ui';

import { formatFull, formatRelativeTime } from '@/lib/format';

interface Props {
  dialog: Dialog | null;
  messages: Message[];
  loading: boolean;
  onSend: (text: string) => void;
  onSimulateIncoming: () => void;
}

export function DialogThread({ dialog, messages, loading, onSend, onSimulateIncoming }: Props) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (!dialog) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20 p-6">
        <EmptyState
          title="Выберите диалог"
          description="Слева — список входящих. Или создайте новый через кнопку «Написать первым»."
        />
      </div>
    );
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <section className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div>
          <div className="text-sm font-semibold">{dialog.clientName}</div>
          <div className="text-xs text-muted-foreground">
            {dialog.channel.toUpperCase()} · {formatFull(dialog.createdAt)}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onSimulateIncoming}>
          <Bell className="h-4 w-4" /> Симулировать входящее
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-1/2" />
            <Skeleton className="h-12 w-2/3 ml-auto" />
            <Skeleton className="h-16 w-1/2" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">Нет сообщений</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                  m.direction === 'out'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border',
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <div
                  className={cn(
                    'mt-1 text-[10px] opacity-70',
                    m.direction === 'out' ? 'text-right' : 'text-left',
                  )}
                >
                  {formatRelativeTime(m.sentAt)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t bg-background p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите сообщение…"
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button type="submit" disabled={!text.trim()}>
          <Send className="h-4 w-4" /> Отправить
        </Button>
      </form>
    </section>
  );
}
