import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { funnelStagesStore, scriptsStore } from '@/mocks/store';

import { ScriptsList } from './scripts-list';

export const metadata = { title: 'Скрипты — TutorCRM' };

export default async function ScriptsPage() {
  await requireRole('admin');

  const [scripts, stages] = await Promise.all([
    scriptsStore.list(),
    funnelStagesStore.list(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Скрипты переписки"
        description="Привязываются к этапам воронки, подсказывают диспетчеру."
      />
      <ScriptsList
        initial={scripts.sort((a, b) => a.title.localeCompare(b.title))}
        stages={stages}
      />
    </div>
  );
}
