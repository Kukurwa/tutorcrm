'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { Notification, NotificationCategory } from '@tutorcrm/contracts';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  StatusBadge,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { useFakeRealtimePoll } from '@/lib/fake-realtime';
import { formatRelativeTime } from '@/lib/format';

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  inbox: 'Inbox',
  responses: 'Отклики',
  feedback: 'Фидбек',
  invoices: 'Инвойсы',
  sla: 'SLA',
  system: 'Система',
};

const CATEGORY_TONE: Record<NotificationCategory, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  inbox: 'info',
  responses: 'info',
  feedback: 'warning',
  invoices: 'warning',
  sla: 'danger',
  system: 'neutral',
};

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [prevIds, setPrevIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ items: Notification[] }>('/api/notifications');
      const newOnes = res.items.filter((n) => !prevIds.has(n.id) && !n.read);
      if (newOnes.length > 0 && prevIds.size > 0) {
        for (const n of newOnes) {
          toast.info(n.title, { description: n.body });
        }
      }
      setPrevIds(new Set(res.items.map((n) => n.id)));
      setItems(res.items);
    } catch (err) {
      if (err instanceof ApiClientError && err.status !== 401) {
        // quietly
      }
    }
  }, [prevIds]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useFakeRealtimePoll(() => {
    void fetchNotifications();
  });

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    try {
      await api.post('/api/notifications/mark-read', {});
      setItems((p) => p.map((n) => ({ ...n, read: true })));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Уведомления" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Уведомления</DropdownMenuLabel>
          {unread > 0 ? (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={markAllRead}>
              Отметить всё прочитанным
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-3">
              <EmptyState title="Нет уведомлений" />
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className={cn('border-b last:border-b-0', !n.read && 'bg-muted/30')}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block p-2 hover:bg-accent"
                      onClick={async () => {
                        try {
                          await api.post('/api/notifications/mark-read', { ids: [n.id] });
                          setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                        } catch {
                          /* noop */
                        }
                      }}
                    >
                      <Row n={n} />
                    </Link>
                  ) : (
                    <div className="p-2">
                      <Row n={n} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Row({ n }: { n: Notification }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <StatusBadge tone={CATEGORY_TONE[n.category]} label={CATEGORY_LABEL[n.category]} className="text-[10px]" />
        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
      </div>
      <div className="mt-0.5 text-sm font-medium">{n.title}</div>
      {n.body ? <p className="text-xs text-muted-foreground">{n.body}</p> : null}
    </div>
  );
}
