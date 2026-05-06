import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge, Button, Card, CardContent, StatusBadge } from '@tutorcrm/ui';

import { ColoredAvatar } from '@/components/colored-avatar';
import { requireRole } from '@/lib/auth/session';
import {
  contractEventsStore,
  contractsStore,
  lessonsStore,
  oneTimePaymentsStore,
  tutorsStore,
  weeklyLessonCountsStore,
} from '@/mocks/store';

import { ContractDetail } from './contract-detail';

interface Props {
  params: { id: string };
}

export default async function ContractPage({ params }: Props) {
  const session = await requireRole('admin', 'dispatcher');
  const contract = await contractsStore.findById(params.id);
  if (!contract) notFound();
  if (session.user.role === 'dispatcher' && contract.dispatcherId !== session.user.id) {
    notFound();
  }

  const [allEvents, weeklyAll, lessonsAll, allTutors, payments] = await Promise.all([
    contractEventsStore.list(),
    weeklyLessonCountsStore.list(),
    lessonsStore.list(),
    tutorsStore.list(),
    oneTimePaymentsStore.list(),
  ]);

  const events = allEvents
    .filter((e) => e.contractId === contract.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const weekly = weeklyAll
    .filter((w) => w.contractId === contract.id)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const lessons = lessonsAll
    .filter((l) => l.contractId === contract.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const contractPayments = payments.filter((p) => p.requestId === contract.requestId);

  const studentName = contract.studentName ?? contract.clientName;
  const isContractDeal = (contract.code ?? '').includes('К'); // АК/НДК/УК — контрактный
  const dealLabel = isContractDeal ? 'Контрактный' : 'Разовый';
  const dealClass = isContractDeal
    ? 'bg-violet-100 text-violet-700'
    : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-6">
      {/* Цветной хедер карточки ученика — в стиле Ploobe */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-1 items-start gap-4">
            <ColoredAvatar name={studentName} className="h-16 w-16 text-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={`${dealClass} font-normal`}>
                  {dealLabel}
                </Badge>
                {contract.code ? (
                  <Badge variant="outline" className="font-mono text-xs font-semibold">
                    {contract.code}
                  </Badge>
                ) : null}
                <StatusBadge
                  tone={
                    contract.status === 'active'
                      ? 'success'
                      : contract.status === 'paused'
                        ? 'warning'
                        : contract.status === 'closed_won'
                          ? 'neutral'
                          : 'danger'
                  }
                  label={
                    contract.status === 'active'
                      ? 'Активен'
                      : contract.status === 'paused'
                        ? 'На паузе'
                        : contract.status === 'closed_won'
                          ? 'Завершён'
                          : 'Закрыт'
                  }
                />
              </div>
              <h1 className="text-2xl font-semibold leading-tight">{studentName}</h1>
              <p className="text-muted-foreground text-sm">
                {contract.subjectName ?? '—'}
                {contract.level ? ` · ${contract.level}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
                <span className="text-muted-foreground">Репетитор:</span>
                <Link href={`/tutors`} className="text-primary font-medium hover:underline">
                  {contract.tutorName}
                </Link>
                {contract.tutorContact ? (
                  <span className="text-muted-foreground">· {contract.tutorContact}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Редактировать">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ContractDetail
        contract={contract}
        events={events}
        weekly={weekly}
        lessons={lessons}
        tutors={allTutors.filter((t) => t.status === 'active')}
        payments={contractPayments}
      />
    </div>
  );
}
