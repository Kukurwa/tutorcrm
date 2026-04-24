'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  changePasswordRequestSchema,
  type ChangePasswordRequest,
  type Role,
  type UserSettings,
} from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Label,
  RoleBadge,
  Switch,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

interface Props {
  user: { id: string; email: string; name: string; role: Role };
  settings: UserSettings;
}

const CATEGORY_LABELS: Record<keyof UserSettings['notifications'], string> = {
  inbox: 'Входящие сообщения',
  responses: 'Отклики репетиторов',
  feedback: 'Фидбек по пробному',
  invoices: 'Инвойсы',
  sla: 'SLA-эскалации',
  system: 'Системные события',
};

export function ProfileForm({ user, settings: initial }: Props) {
  const [settings, setSettings] = useState<UserSettings>(initial);

  async function updateSettings(patch: Partial<UserSettings>) {
    const prev = settings;
    const optimistic: UserSettings = {
      ...prev,
      ...patch,
      notifications: { ...prev.notifications, ...(patch.notifications ?? {}) },
      quietHours: { ...prev.quietHours, ...(patch.quietHours ?? {}) },
    };
    setSettings(optimistic);
    try {
      const res = await api.put<{ settings: UserSettings }>('/api/me/settings', patch);
      setSettings(res.settings);
    } catch (err) {
      setSettings(prev);
      toast.error(err instanceof ApiClientError ? err.message : 'Не удалось сохранить');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Аккаунт</CardTitle>
          <CardDescription>Базовые данные текущего пользователя.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Имя</div>
            <div className="font-medium">{user.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Email</div>
            <div>{user.email}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Роль</div>
            <RoleBadge role={user.role} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Смена пароля</CardTitle>
            <CardDescription>Минимум 8 символов.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Выберите, какие категории получать.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(CATEGORY_LABELS) as (keyof UserSettings['notifications'])[]).map(
              (cat) => (
                <div key={cat} className="flex items-center justify-between">
                  <Label htmlFor={`notif-${cat}`} className="text-sm">
                    {CATEGORY_LABELS[cat]}
                  </Label>
                  <Switch
                    id={`notif-${cat}`}
                    checked={settings.notifications[cat] ?? false}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        notifications: { ...settings.notifications, [cat]: checked },
                      })
                    }
                  />
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Тихие часы</CardTitle>
            <CardDescription>В этот интервал уведомления отложатся.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-enabled">Включить тихие часы</Label>
              <Switch
                id="quiet-enabled"
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) =>
                  updateSettings({ quietHours: { ...settings.quietHours, enabled: checked } })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="С" htmlFor="quiet-from">
                <Input
                  id="quiet-from"
                  type="time"
                  value={settings.quietHours.from}
                  onChange={(e) =>
                    updateSettings({ quietHours: { ...settings.quietHours, from: e.target.value } })
                  }
                  disabled={!settings.quietHours.enabled}
                />
              </FormField>
              <FormField label="До" htmlFor="quiet-to">
                <Input
                  id="quiet-to"
                  type="time"
                  value={settings.quietHours.to}
                  onChange={(e) =>
                    updateSettings({ quietHours: { ...settings.quietHours, to: e.target.value } })
                  }
                  disabled={!settings.quietHours.enabled}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PasswordForm() {
  const form = useForm<ChangePasswordRequest>({
    resolver: zodResolver(changePasswordRequestSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(values: ChangePasswordRequest) {
    setSubmitting(true);
    try {
      await api.post('/api/me/password', values);
      toast.success('Пароль обновлён');
      form.reset();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Ошибка сохранения';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        label="Текущий пароль"
        htmlFor="currentPassword"
        error={form.formState.errors.currentPassword?.message}
        required
      >
        <Input id="currentPassword" type="password" {...form.register('currentPassword')} />
      </FormField>
      <FormField
        label="Новый пароль"
        htmlFor="newPassword"
        error={form.formState.errors.newPassword?.message}
        required
      >
        <Input id="newPassword" type="password" {...form.register('newPassword')} />
      </FormField>
      <FormField
        label="Повторите новый"
        htmlFor="confirmPassword"
        error={form.formState.errors.confirmPassword?.message}
        required
      >
        <Input id="confirmPassword" type="password" {...form.register('confirmPassword')} />
      </FormField>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Сохранение…' : 'Сменить пароль'}
      </Button>
    </form>
  );
}
