import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  funnelStagesStore,
  getSystemSettings,
  messageTemplatesStore,
  rejectionReasonsStore,
  scriptsStore,
  subjectChannelsStore,
  subjectsStore,
} from '@/mocks/store';

import { SettingsTabs } from './settings-tabs';

export const metadata = { title: 'Настройки — TutorCRM' };

export default async function SettingsPage() {
  await requireRole('admin');

  const [subjects, channels, stages, reasons, templates, scripts] = await Promise.all([
    subjectsStore.list(),
    subjectChannelsStore.list(),
    funnelStagesStore.list(),
    rejectionReasonsStore.list(),
    messageTemplatesStore.list(),
    scriptsStore.list(),
  ]);
  const systemSettings = getSystemSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки"
        description="Все справочники и системные параметры. Только admin."
      />
      <SettingsTabs
        initialSubjects={subjects.sort((a, b) => a.name.localeCompare(b.name))}
        initialChannels={channels}
        initialStages={stages.sort((a, b) => a.order - b.order)}
        initialReasons={reasons.sort((a, b) => a.label.localeCompare(b.label))}
        initialTemplates={templates.sort((a, b) => a.title.localeCompare(b.title))}
        initialScripts={scripts.sort((a, b) => a.title.localeCompare(b.title))}
        initialSystemSettings={systemSettings}
      />
    </div>
  );
}
