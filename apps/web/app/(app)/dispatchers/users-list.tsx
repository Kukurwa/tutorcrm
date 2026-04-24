'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { Role, UserPublic, UserStatus } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  RoleBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Switch,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

export function UsersList({ initial }: { initial: UserPublic[] }) {
  const [users, setUsers] = useState<UserPublic[]>(initial);
  const [creating, setCreating] = useState(false);

  async function create(d: { email: string; name: string; role: Role; password: string }) {
    try {
      const res = await api.post<{ user: UserPublic }>('/api/users', d);
      setUsers((p) => [...p, res.user].sort((a, b) => a.name.localeCompare(b.name)));
      setCreating(false);
      toast.success('Пользователь создан');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function update(id: string, patch: { role?: Role; status?: UserStatus; name?: string }) {
    try {
      const res = await api.patch<{ user: UserPublic }>(`/api/users/${id}`, patch);
      setUsers((p) => p.map((u) => (u.id === id ? res.user : u)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Все пользователи</CardTitle>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          getRowId={(u) => u.id}
          rows={users}
          emptyTitle="Нет пользователей"
          columns={[
            {
              key: 'name',
              header: 'Имя',
              cell: (u) => (
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Роль',
              cell: (u) => (
                <Select
                  value={u.role}
                  onValueChange={(v) => update(u.id, { role: v as Role })}
                >
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue>
                      <RoleBadge role={u.role} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="leadgen">LeadGen</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: 'status',
              header: 'Статус',
              cell: (u) =>
                u.status === 'active' ? (
                  <StatusBadge tone="success" label="Активен" />
                ) : (
                  <StatusBadge tone="danger" label="Заблокирован" />
                ),
            },
            {
              key: 'toggle',
              header: 'Блокировка',
              align: 'right',
              cell: (u) => (
                <Switch
                  checked={u.status === 'active'}
                  onCheckedChange={(checked) =>
                    update(u.id, { status: checked ? 'active' : 'blocked' })
                  }
                />
              ),
            },
          ]}
        />
      </CardContent>
      <CreateUserDialog open={creating} onClose={() => setCreating(false)} onCreate={create} />
    </Card>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { email: string; name: string; role: Role; password: string }) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('dispatcher');
  const [password, setPassword] = useState('');

  function reset() {
    setEmail('');
    setName('');
    setRole('dispatcher');
    setPassword('');
  }

  const valid = /^[^@\s]+@[^@\s]+$/.test(email) && name.trim() && password.length >= 8;

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый пользователь</DialogTitle>
          <DialogDescription>Пароль минимум 8 символов. Email уникален.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Имя" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Роль">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="dispatcher">Dispatcher</SelectItem>
                <SelectItem value="leadgen">LeadGen</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Пароль" required>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onCreate({ email: email.trim(), name: name.trim(), role, password });
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
