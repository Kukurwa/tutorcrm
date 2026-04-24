import { EmptyState, PageHeader } from '@tutorcrm/ui';

export interface ComingSoonProps {
  title: string;
  description?: string;
  stage: string;
}

export function ComingSoon({ title, description, stage }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Раздел появится на следующих этапах"
        description={`Раздел будет реализован на этапе ${stage} согласно ROADMAP.`}
      />
    </div>
  );
}
