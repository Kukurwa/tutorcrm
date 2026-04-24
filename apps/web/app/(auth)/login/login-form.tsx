'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { loginRequestSchema, type LoginRequest } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  toast,
} from '@tutorcrm/ui';

const DEMO_ACCOUNTS = [
  { role: 'admin', email: 'admin@tutorcrm.local', password: 'admin123' },
  { role: 'dispatcher', email: 'dispatcher@tutorcrm.local', password: 'dispatcher123' },
  { role: 'leadgen', email: 'leadgen@tutorcrm.local', password: 'leadgen123' },
] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginRequest) {
    setSubmitting(true);
    const res = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);

    if (res?.error) {
      toast.error('Неверный email или пароль');
      return;
    }
    toast.success('Вход выполнен');
    const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
    router.replace(callbackUrl);
    router.refresh();
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    form.setValue('email', account.email);
    form.setValue('password', account.password);
  }

  const errors = form.formState.errors;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Вход в TutorCRM</CardTitle>
        <CardDescription>Введите email и пароль. В dev — используйте демо-аккаунты.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...form.register('email')}
            />
          </FormField>
          <FormField label="Пароль" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Вход…' : 'Войти'}
          </Button>

          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Демо-аккаунты
            </p>
            <div className="flex flex-col gap-1">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.role}
                  type="button"
                  className="rounded border px-2 py-1 text-left text-xs hover:bg-accent"
                  onClick={() => fillDemo(a)}
                >
                  <span className="font-medium capitalize">{a.role}</span>{' '}
                  <span className="text-muted-foreground">— {a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
