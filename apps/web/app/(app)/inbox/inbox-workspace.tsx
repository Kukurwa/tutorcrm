'use client';

import { ArrowLeft, Info } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { Dialog, Message } from '@tutorcrm/contracts';
import { Button, cn, toast } from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { useFakeRealtimePoll } from '@/lib/fake-realtime';

import { ContextPanel } from './context-panel';
import { DialogList } from './dialog-list';
import { DialogThread } from './dialog-thread';

type MobilePane = 'list' | 'thread' | 'context';

export function InboxWorkspace() {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('list');

  const fetchDialogs = useCallback(async () => {
    try {
      const res = await api.get<{ items: Dialog[] }>('/api/dialogs');
      setDialogs(res.items);
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const res = await api.get<{ dialog: Dialog; messages: Message[] }>(`/api/dialogs/${id}`);
      setMessages(res.messages);
      setDialogs((p) => p.map((d) => (d.id === id ? res.dialog : d)));
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    void fetchDialogs();
  }, [fetchDialogs]);

  useEffect(() => {
    if (!activeId) return;
    void fetchThread(activeId);
  }, [activeId, fetchThread]);

  useFakeRealtimePoll(() => {
    void fetchDialogs();
    if (activeId) void fetchThread(activeId);
  });

  const activeDialog = dialogs.find((d) => d.id === activeId) ?? null;

  async function handleSend(text: string) {
    if (!activeId) return;
    try {
      const res = await api.post<{ message: Message; dialog: Dialog }>(
        `/api/dialogs/${activeId}/messages`,
        { text },
      );
      setMessages((p) => [...p, res.message]);
      setDialogs((p) => p.map((d) => (d.id === activeId ? res.dialog : d)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка отправки');
    }
  }

  async function handleSimulateIncoming() {
    if (!activeId) return;
    try {
      const res = await api.post<{ message: Message; dialog: Dialog }>(
        `/api/dialogs/${activeId}/simulate-incoming`,
      );
      setMessages((p) => [...p, res.message]);
      setDialogs((p) => p.map((d) => (d.id === activeId ? res.dialog : d)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function handleInitiate(data: {
    channel: 'telegram' | 'whatsapp' | 'viber' | 'instagram' | 'facebook';
    contact: string;
    firstMessage: string;
    clientId: string | null;
  }) {
    try {
      const res = await api.post<{ dialog: Dialog; message: Message }>('/api/dialogs/initiate', data);
      setDialogs((p) => [res.dialog, ...p]);
      setActiveId(res.dialog.id);
      setMessages([res.message]);
      toast.success('Диалог создан');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setMobilePane('thread');
  }

  return (
    <div className="flex h-full bg-background md:grid md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      {/* Список диалогов: всегда виден от md+; на мобильном только когда pane=list */}
      <div
        className={cn(
          'w-full md:block',
          mobilePane === 'list' ? 'block' : 'hidden',
        )}
      >
        <DialogList
          items={dialogs}
          loading={loadingList}
          activeId={activeId}
          onSelect={handleSelect}
          onInitiate={(data) => {
            handleInitiate(data);
            setMobilePane('thread');
          }}
        />
      </div>

      {/* Чат: виден от md; на мобильном — pane=thread или context */}
      <div
        className={cn(
          'w-full flex-col md:flex',
          mobilePane === 'list' ? 'hidden' : 'flex',
        )}
      >
        {/* Mobile header row: назад + info */}
        <div className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobilePane('list')}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4" /> К диалогам
          </Button>
          {activeDialog ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setMobilePane(mobilePane === 'context' ? 'thread' : 'context')
              }
              className="h-8 px-2"
            >
              <Info className="h-4 w-4" />
              {mobilePane === 'context' ? 'Чат' : 'Контекст'}
            </Button>
          ) : null}
        </div>

        <div className={cn('min-h-0 flex-1', mobilePane === 'context' ? 'hidden md:block' : 'block')}>
          <DialogThread
            dialog={activeDialog}
            messages={messages}
            loading={loadingThread}
            onSend={handleSend}
            onSimulateIncoming={handleSimulateIncoming}
          />
        </div>

        {/* Контекст-панель встроена на мобильном (когда pane=context), иначе отдельная колонка xl+ */}
        <div className={cn('md:hidden', mobilePane === 'context' ? 'block' : 'hidden')}>
          <ContextPanel
            dialog={activeDialog}
            onDialogUpdated={(next) =>
              setDialogs((p) => p.map((d) => (d.id === next.id ? next : d)))
            }
          />
        </div>
      </div>

      {/* Отдельная колонка контекста только на xl+ */}
      <div className="hidden xl:block">
        <ContextPanel
          dialog={activeDialog}
          onDialogUpdated={(next) =>
            setDialogs((p) => p.map((d) => (d.id === next.id ? next : d)))
          }
        />
      </div>
    </div>
  );
}
