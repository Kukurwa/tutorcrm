import { Avatar, AvatarFallback, cn } from '@tutorcrm/ui';

import { getAvatarColor, getInitials } from '@/lib/avatar-color';

interface Props {
  name: string;
  className?: string;
}

// Аватар с цветными инициалами на основе хеша имени —
// разные люди = разные цвета, всегда стабильно.
export function ColoredAvatar({ name, className }: Props) {
  const color = getAvatarColor(name);
  return (
    <Avatar className={cn('border', className)}>
      <AvatarFallback className={cn('font-medium', color.bg, color.fg)}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
