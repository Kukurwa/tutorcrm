'use client';

import type {
  FunnelStage,
  MessageTemplate,
  RejectionReason,
  Script,
  Subject,
  SubjectChannel,
  SystemSettings,
} from '@tutorcrm/contracts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tutorcrm/ui';

import { FunnelStagesTab } from './tabs/funnel-stages-tab';
import { RejectionReasonsTab } from './tabs/rejection-reasons-tab';
import { SubjectsTab } from './tabs/subjects-tab';
import { SystemSettingsTab } from './tabs/system-settings-tab';
import { TemplatesTab } from './tabs/templates-tab';

interface Props {
  initialSubjects: Subject[];
  initialChannels: SubjectChannel[];
  initialStages: FunnelStage[];
  initialReasons: RejectionReason[];
  initialTemplates: MessageTemplate[];
  initialScripts: Script[];
  initialSystemSettings: SystemSettings;
}

export function SettingsTabs({
  initialSubjects,
  initialChannels,
  initialStages,
  initialReasons,
  initialTemplates,
  initialScripts,
  initialSystemSettings,
}: Props) {
  return (
    <Tabs defaultValue="subjects" className="w-full">
      <TabsList>
        <TabsTrigger value="subjects">Предметы</TabsTrigger>
        <TabsTrigger value="stages">Этапы воронки</TabsTrigger>
        <TabsTrigger value="reasons">Причины отказа</TabsTrigger>
        <TabsTrigger value="templates">Шаблоны</TabsTrigger>
        <TabsTrigger value="system">Система</TabsTrigger>
      </TabsList>

      <TabsContent value="subjects">
        <SubjectsTab initial={initialSubjects} initialChannels={initialChannels} />
      </TabsContent>
      <TabsContent value="stages">
        <FunnelStagesTab initial={initialStages} scripts={initialScripts} />
      </TabsContent>
      <TabsContent value="reasons">
        <RejectionReasonsTab initial={initialReasons} />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesTab initial={initialTemplates} />
      </TabsContent>
      <TabsContent value="system">
        <SystemSettingsTab initial={initialSystemSettings} />
      </TabsContent>
    </Tabs>
  );
}
