'use client';

import { Bell, FileText, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Dialog, Message, Script } from '@tutorcrm/contracts';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Skeleton,
  Textarea,
} from '@tutorcrm/ui';

import { formatFull, formatRelativeTime } from '@/lib/format';

interface Props {
  dialog: Dialog | null;
  messages: Message[];
  loading: boolean;
  scripts: Script[];
  onSend: (text: string) => void;
  onSimulateIncoming: () => void;
}

export function DialogThread({
  dialog,
  messages,
  loading,
  scripts,
  onSend,
  onSimulateIncoming,
}: Props) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (!dialog) {
    return (
      <div className="bg-muted/20 flex h-full items-center justify-center p-6">
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

  // Скрипты, релевантные текущей стадии — наверх; остальные — ниже.
  const relevantScripts = scripts.slice().sort((a, b) => {
    const aRel = a.stageKind === dialog.stage ? 0 : 1;
    const bRel = b.stageKind === dialog.stage ? 0 : 1;
    return aRel - bRel;
  });

  function applyScript(scriptText: string) {
    const filled = scriptText
      .replaceAll('{{client_name}}', dialog?.clientName ?? '')
      .replaceAll('{{channel}}', dialog?.channel ?? '');
    setText((prev) => (prev ? `${prev}\n${filled}` : filled));
  }

  return (
    <section className="flex h-full flex-col">
      <header className="bg-background flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="text-sm font-semibold">{dialog.clientName}</div>
          <div className="text-muted-foreground text-xs">
            {dialog.channel.toUpperCase()} · {formatFull(dialog.createdAt)}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onSimulateIncoming}>
          <Bell className="h-4 w-4" /> Симулировать входящее
        </Button>
      </header>

      <div className="bg-muted/20 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-1/2" />
            <Skeleton className="ml-auto h-12 w-2/3" />
            <Skeleton className="h-16 w-1/2" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground text-center text-sm">Нет сообщений</div>
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
        className="bg-background flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Скрипты">
              <FileText className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
            <DropdownMenuLabel>Скрипты</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {relevantScripts.length === 0 ? (
              <DropdownMenuItem disabled>Нет скриптов</DropdownMenuItem>
            ) : (
              relevantScripts.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => applyScript(s.body)}
                  className="flex flex-col items-start gap-1"
                >
                  <span className="font-medium">{s.title}</span>
                  <span className="text-muted-foreground line-clamp-2 text-[11px]">{s.body}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
