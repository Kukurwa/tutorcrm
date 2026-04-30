import type { Role } from '@tutorcrm/contracts';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  roles: Role[];
}

export type NavIcon =
  | 'dashboard'
  | 'inbox'
  | 'funnel'
  | 'requests'
  | 'contracts'
  | 'clients'
  | 'tutors'
  | 'users'
  | 'scripts'
  | 'settings'
  | 'calendar'
  | 'profile';

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Дашборд',
    icon: 'dashboard',
    roles: ['admin', 'dispatcher', 'leadgen'],
  },
  { href: '/inbox', label: 'Inbox', icon: 'inbox', roles: ['admin', 'dispatcher'] },
  { href: '/funnel', label: 'Воронка', icon: 'funnel', roles: ['admin', 'dispatcher'] },
  { href: '/requests', label: 'Заявки', icon: 'requests', roles: ['admin', 'dispatcher'] },
  { href: '/contracts', label: 'Контракты', icon: 'contracts', roles: ['admin', 'dispatcher'] },
  { href: '/clients', label: 'Клиенты', icon: 'clients', roles: ['admin', 'dispatcher'] },
  { href: '/tutors', label: 'Репетиторы', icon: 'tutors', roles: ['admin', 'dispatcher'] },
  { href: '/calendar', label: 'Календарь', icon: 'calendar', roles: ['admin', 'dispatcher'] },
  { href: '/users', label: 'Пользователи', icon: 'users', roles: ['admin'] },
  { href: '/scripts', label: 'Скрипты', icon: 'scripts', roles: ['admin'] },
  { href: '/settings', label: 'Настройки', icon: 'settings', roles: ['admin'] },
];

export function filterNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
