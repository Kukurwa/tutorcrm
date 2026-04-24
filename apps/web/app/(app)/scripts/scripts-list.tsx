'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { FunnelStage, Script } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
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

interface Props {
  initial: Script[];
  stages: FunnelStage[];
}

export function ScriptsList({ initial, stages }: Props) {
  const [items, setItems] = useState<Script[]>(initial);
  const [editing, setEditing] = useState<Script | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(next: Script) {
    try {
      const res = await api.patch<{ script: Script }>(`/api/scripts/${next.id}`, {
        title: next.title,
        body: next.body,
        stageKind: next.stageKind,
        active: next.active,
      });
      setItems((p) => p.map((x) => (x.id === next.id ? res.script : x)));
      setEditing(null);
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function create(d: { title: string; body: string; stageKind: string | null }) {
    try {
      const res = await api.post<{ script: Script }>('/api/scripts', { ...d, active: true });
      setItems((p) => [...p, res.script].sort((a, b) => a.title.localeCompare(b.title)));
      setCreating(false);
      toast.success('Скрипт создан');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function remove(id: string) {
    if (!confirm('Удалить скрипт?')) return;
    try {
      await api.delete(`/api/scripts/${id}`);
      setItems((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Все скрипты</CardTitle>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Новый
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((s) => {
          const stage = stages.find((x) => x.kind === s.stageKind);
          return (
            <Card key={s.id} className="cursor-pointer hover:border-primary/60" onClick={() => setEditing(s)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.title}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(s.id);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stage ? `Этап: ${stage.name}` : 'Без привязки'} ·{' '}
                  {s.active ? 'активен' : 'неактивен'}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-5">{s.body}</pre>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>

      <ScriptDialog script={editing} onClose={() => setEditing(null)} onSave={save} stages={stages} />
      <CreateScriptDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={create}
        stages={stages}
      />
    </Card>
  );
}

function ScriptDialog({
  script,
  onClose,
  onSave,
  stages,
}: {
  script: Script | null;
  onClose: () => void;
  onSave: (s: Script) => void;
  stages: FunnelStage[];
}) {
  const [draft, setDraft] = useState<Script | null>(script);
  // sync on open
  if (script && (!draft || draft.id !== script.id)) setDraft(script);
  if (!draft) return null;

  return (
    <Dialog open={script !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Редактирование скрипта</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Название" required>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </FormField>
          <FormField label="Этап воронки">
            <Select
              value={draft.stageKind ?? ''}
              onValueChange={(v) => setDraft({ ...draft, stageKind: v === '' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без привязки" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.kind}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Текст скрипта" required>
            <Textarea
              rows={8}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </FormField>
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

function CreateScriptDialog({
  open,
  onClose,
  onCreate,
  stages,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { title: string; body: string; stageKind: string | null }) => void;
  stages: FunnelStage[];
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [stageKind, setStageKind] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setBody('');
    setStageKind(null);
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
          <DialogTitle>Новый скрипт</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Название" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Этап воронки">
            <Select
              value={stageKind ?? ''}
              onValueChange={(v) => setStageKind(v === '' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без привязки" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.kind}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Текст" required>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!title.trim() || !body.trim()}
            onClick={() => {
              onCreate({ title: title.trim(), body: body.trim(), stageKind });
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
