'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { MessageTemplate, MessageTemplateKind } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

const KINDS: { value: MessageTemplateKind; label: string }[] = [
  { value: 'greeting', label: 'Приветствие' },
  { value: 'qualify', label: 'Уточнение' },
  { value: 'request_brief', label: 'Бриф' },
  { value: 'assignment_client', label: 'Назначение клиенту' },
  { value: 'assignment_tutor', label: 'Назначение репетитору' },
  { value: 'trial_feedback', label: 'Фидбек после пробного' },
  { value: 'invoice_reminder', label: 'Инвойс' },
  { value: 'general', label: 'Общий' },
];

export function TemplatesTab({ initial }: { initial: MessageTemplate[] }) {
  const [items, setItems] = useState<MessageTemplate[]>(initial);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(patch: MessageTemplate) {
    try {
      const res = await api.patch<{ template: MessageTemplate }>(
        `/api/message-templates/${patch.id}`,
        {
          title: patch.title,
          body: patch.body,
          kind: patch.kind,
          active: patch.active,
          variables: patch.variables,
        },
      );
      setItems((p) => p.map((x) => (x.id === patch.id ? res.template : x)));
      toast.success('Шаблон сохранён');
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function create(data: {
    title: string;
    body: string;
    kind: MessageTemplateKind;
  }) {
    try {
      const res = await api.post<{ template: MessageTemplate }>('/api/message-templates', {
        ...data,
        variables: extractVariables(data.body),
        active: true,
      });
      setItems((p) => [...p, res.template].sort((a, b) => a.title.localeCompare(b.title)));
      toast.success('Создан');
      setCreating(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function remove(id: string) {
    if (!confirm('Удалить шаблон?')) return;
    try {
      await api.delete(`/api/message-templates/${id}`);
      setItems((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Шаблоны сообщений</CardTitle>
          <p className="text-sm text-muted-foreground">Переменные указываются как {'{{name}}'}.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Новый шаблон
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((t) => (
          <Card key={t.id} className="cursor-pointer hover:border-primary/60" onClick={() => setEditing(t)}>
            <CardHeader className="space-y-1 pb-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.title}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {KINDS.find((k) => k.value === t.kind)?.label ?? t.kind} ·{' '}
                {t.active ? 'активен' : 'неактивен'}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="line-clamp-3 text-sm">{t.body}</p>
              {t.variables.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.variables.map((v) => (
                    <span key={v} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {v}
                    </span>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </CardContent>

      <TemplateDialog
        template={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSave={save}
      />
      <CreateTemplateDialog open={creating} onClose={() => setCreating(false)} onCreate={create} />
    </Card>
  );
}

function extractVariables(body: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m[1]) set.add(m[1]);
  }
  return [...set];
}

function TemplateDialog({
  template,
  open,
  onClose,
  onSave,
}: {
  template: MessageTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (t: MessageTemplate) => void;
}) {
  const [draft, setDraft] = useState<MessageTemplate | null>(template);

  useMemo(() => {
    setDraft(template);
  }, [template]);

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft.title}</DialogTitle>
          <DialogDescription>Редактирование шаблона и preview переменных.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Название">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </FormField>
          <FormField label="Тип">
            <Select
              value={draft.kind}
              onValueChange={(v) => setDraft({ ...draft, kind: v as MessageTemplateKind })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Тело шаблона" description="Переменные: {{name}}">
            <Textarea
              rows={6}
              value={draft.body}
              onChange={(e) => {
                const body = e.target.value;
                setDraft({ ...draft, body, variables: extractVariables(body) });
              }}
            />
          </FormField>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Переменные
            </div>
            {draft.variables.length === 0 ? (
              <span className="text-sm text-muted-foreground">Нет переменных</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {draft.variables.map((v) => (
                  <span key={v} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <span className="text-sm">Активен</span>
            <Switch
              checked={draft.active}
              onCheckedChange={(checked) => setDraft({ ...draft, active: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={() => onSave(draft)}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTemplateDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { title: string; body: string; kind: MessageTemplateKind }) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<MessageTemplateKind>('general');

  function reset() {
    setTitle('');
    setBody('');
    setKind('general');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Новый шаблон</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Название" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Тип">
            <Select value={kind} onValueChange={(v) => setKind(v as MessageTemplateKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Тело" required>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!title.trim() || !body.trim()}
            onClick={() => {
              onCreate({ title: title.trim(), body: body.trim(), kind });
              reset();
            }}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
