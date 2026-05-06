import {
  AtSign,
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  Send,
  type LucideIcon,
} from 'lucide-react';

import type { ContactKind } from '@tutorcrm/contracts';
import { cn } from '@tutorcrm/ui';

// Светлый круг + цветная иконка + заголовок + значение.
// Шаблон тайла контакта в стиле Ploobe-карточки.

const ICONS: Record<ContactKind, { icon: LucideIcon; bg: string; fg: string; label: string }> = {
  phone: { icon: Phone, bg: 'bg-emerald-100', fg: 'text-emerald-600', label: 'Телефон' },
  email: { icon: Mail, bg: 'bg-amber-100', fg: 'text-amber-600', label: 'Email' },
  telegram: { icon: Send, bg: 'bg-sky-100', fg: 'text-sky-600', label: 'Telegram' },
  whatsapp: { icon: Phone, bg: 'bg-emerald-100', fg: 'text-emerald-600', label: 'WhatsApp' },
  viber: { icon: MessageCircle, bg: 'bg-violet-100', fg: 'text-violet-600', label: 'Viber' },
  instagram: { icon: Instagram, bg: 'bg-fuchsia-100', fg: 'text-fuchsia-600', label: 'Instagram' },
  facebook: { icon: Facebook, bg: 'bg-blue-100', fg: 'text-blue-600', label: 'Facebook' },
};

interface Props {
  kind?: ContactKind;
  icon?: LucideIcon;
  iconBg?: string;
  iconFg?: string;
  label: string;
  value: string | null | undefined;
  href?: string | null;
  className?: string;
}

export function ContactTile({
  kind,
  icon: customIcon,
  iconBg: customBg,
  iconFg: customFg,
  label,
  value,
  href,
  className,
}: Props) {
  const preset = kind ? ICONS[kind] : null;
  const Icon = customIcon ?? preset?.icon ?? AtSign;
  const bg = customBg ?? preset?.bg ?? 'bg-muted';
  const fg = customFg ?? preset?.fg ?? 'text-muted-foreground';
  const display = value ?? '—';

  const content = (
    <>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', bg, fg)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="truncate text-sm font-medium">{display}</div>
      </div>
    </>
  );

  const baseCn = cn(
    'flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors',
    href && value ? 'hover:bg-muted cursor-pointer' : '',
    className,
  );

  if (href && value) {
    return (
      <a
        href={href}
        className={baseCn}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }
  return <div className={baseCn}>{content}</div>;
}
