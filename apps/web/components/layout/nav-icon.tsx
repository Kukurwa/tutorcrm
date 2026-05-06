import {
  BarChart3,
  Calendar,
  Contact,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from 'lucide-react';

import type { NavIcon as NavIconName } from '@/lib/navigation';

const ICONS: Record<NavIconName, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  inbox: Inbox,
  funnel: ListChecks,
  requests: FileText,
  contracts: ShieldCheck,
  clients: Contact,
  tutors: GraduationCap,
  users: Users,
  scripts: MessageSquare,
  settings: Settings,
  calendar: Calendar,
  profile: User,
  payroll: Wallet,
  metrics: BarChart3,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
