'use client';

import { ArrowLeft, Info } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  Dialog,
  FunnelStage,
  InboxFolder,
  Message,
  Script,
  Subject,
} from '@tutorcrm/contracts';
import { Button, cn, toast } from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { useFakeRealtimePoll } from '@/lib/fake-realtime';

import { ContextPanel } from './context-panel';
import { DialogList } from './dialog-list';
import { DialogThread } from './dialog-thread';

type MobilePane = 'list' | 'thread' | 'context';

export type InboxFilters = {
  channel: string | null;
  stage: string | null;
  partyKind: string | null;
  folderId: string | null;
};

interface Props {
  subjects: Subject[];
  stages: FunnelStage[];
  scripts: Script[];
  initialFolders: InboxFolder[];
}

export function InboxWorkspace({ subjects, stages, scripts, initialFolders }: Props) {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [folders, setFolders] = useState<InboxFolder[]>(initialFolders);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('list');
  const [filters, setFilters] = useState<InboxFilters>({
    channel: null,
    stage: null,
    partyKind: null,
    folderId: null,
  });

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

  // Применение фильтров: партийная папка («Репетиторы», «Рабочие группы») идёт через partyKind.
  const filteredDialogs = useMemo(() => {
    return dialogs.filter((d) => {
      if (filters.channel && d.channel !== filters.channel) return false;
      if (filters.stage && d.stage !== filters.stage) return false;
      if (filters.partyKind && d.partyKind !== filters.partyKind) return false;
      if (filters.folderId && d.folderId !== filters.folderId) return false;
      // Если ни одна папка не выбрана — по умолчанию скрываем системные папки tutor/work_group
      if (!filters.partyKind && !filters.folderId && d.partyKind !== 'client') {
        return false;
      }
      return true;
    });
  }, [dialogs, filters]);

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
      const res = await api.post<{ dialog: Dialog; message: Message }>(
        '/api/dialogs/initiate',
        data,
      );
      setDialogs((p) => [res.dialog, ...p]);
      setActiveId(res.dialog.id);
      setMessages([res.message]);
      toast.success('Диалог создан');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function handleCreateFolder(name: string) {
    try {
      const res = await api.post<{ folder: InboxFolder }>('/api/inbox-folders', { name });
      setFolders((p) => [...p, res.folder]);
      toast.success('Папка создана');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      await api.delete(`/api/inbox-folders/${id}`);
      setFolders((p) => p.filter((f) => f.id !== id));
      if (filters.folderId === id) {
        setFilters((f) => ({ ...f, folderId: null }));
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function handleUpdateDialog(next: Dialog) {
    setDialogs((p) => p.map((d) => (d.id === next.id ? next : d)));
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setMobilePane('thread');
  }

  return (
    <div className="bg-background flex h-full md:grid md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <div className={cn('w-full md:block', mobilePane === 'list' ? 'block' : 'hidden')}>
        <DialogList
          items={filteredDialogs}
          loading={loadingList}
          activeId={activeId}
          stages={stages}
          folders={folders}
          filters={filters}
          onFiltersChange={setFilters}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onSelect={handleSelect}
          onInitiate={(data) => {
            handleInitiate(data);
            setMobilePane('thread');
          }}
        />
      </div>

      <div className={cn('w-full flex-col md:flex', mobilePane === 'list' ? 'hidden' : 'flex')}>
        <div className="bg-card flex items-center justify-between gap-2 border-b px-3 py-2 md:hidden">
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
              onClick={() => setMobilePane(mobilePane === 'context' ? 'thread' : 'context')}
              className="h-8 px-2"
            >
              <Info className="h-4 w-4" />
              {mobilePane === 'context' ? 'Чат' : 'Контекст'}
            </Button>
          ) : null}
        </div>

        <div
          className={cn('min-h-0 flex-1', mobilePane === 'context' ? 'hidden md:block' : 'block')}
        >
          <DialogThread
            dialog={activeDialog}
            messages={messages}
            loading={loadingThread}
            scripts={scripts}
            onSend={handleSend}
            onSimulateIncoming={handleSimulateIncoming}
          />
        </div>

        <div className={cn('md:hidden', mobilePane === 'context' ? 'block' : 'hidden')}>
          <ContextPanel
            dialog={activeDialog}
            subjects={subjects}
            stages={stages}
            onDialogUpdated={handleUpdateDialog}
          />
        </div>
      </div>

      <div className="hidden xl:block">
        <ContextPanel
          dialog={activeDialog}
          subjects={subjects}
          stages={stages}
          onDialogUpdated={handleUpdateDialog}
        />
      </div>
    </div>
  );
}
