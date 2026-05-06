import { Facebook, Instagram, MessageCircle, Phone, Send } from 'lucide-react';

import type { MessengerChannel } from '@tutorcrm/contracts';
import { cn } from '@tutorcrm/ui';

// Брендовые цвета мессенджеров для иконок (Telegram-голубой, WhatsApp-зелёный и т.д.)
const STYLES: Record<
  MessengerChannel,
  { bg: string; fg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  telegram: { bg: 'bg-sky-100', fg: 'text-sky-600', icon: Send },
  whatsapp: { bg: 'bg-emerald-100', fg: 'text-emerald-600', icon: Phone },
  viber: { bg: 'bg-violet-100', fg: 'text-violet-600', icon: MessageCircle },
  instagram: { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-600', icon: Instagram },
  facebook: { bg: 'bg-blue-100', fg: 'text-blue-600', icon: Facebook },
};

const LABEL: Record<MessengerChannel, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

interface Props {
  channel: MessengerChannel;
  size?: 'sm' | 'md';
  className?: string;
}

// Цветной квадратный значок мессенджера в фирменном цвете.
export function MessengerIcon({ channel, size = 'md', className }: Props) {
  const s = STYLES[channel];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md',
        s.bg,
        s.fg,
        size === 'sm' ? 'h-5 w-5' : 'h-7 w-7',
        className,
      )}
      title={LABEL[channel]}
      aria-label={LABEL[channel]}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    </span>
  );
}
