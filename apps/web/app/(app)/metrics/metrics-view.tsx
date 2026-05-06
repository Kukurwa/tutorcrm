'use client';

import { useMemo, useState } from 'react';

import type { RegularPricing } from '@tutorcrm/contracts';
import { Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@tutorcrm/ui';

import type {
  ContractRow,
  DialogRow,
  DispatcherRow,
  LeadRow,
  OneTimePaymentRow,
  RejectionReasonRow,
  RequestRow,
  SubjectRow,
  TrialRow,
} from '@/lib/metrics/extended';
import { currentMonthKey, formatMonthKey, parseMonthKey } from '@/lib/metrics/period';

import { ContractsTab } from './tabs/contracts-tab';
import { DispatchersTab } from './tabs/dispatchers-tab';
import { PlanFactTab } from './tabs/plan-fact-tab';
import { ProfitTab } from './tabs/profit-tab';
import { ProfitabilityTab } from './tabs/profitability-tab';
import { RetentionTab } from './tabs/retention-tab';

interface Props {
  dispatchers: DispatcherRow[];
  contracts: ContractRow[];
  oneTimePayments: OneTimePaymentRow[];
  requests: RequestRow[];
  trials: TrialRow[];
  subjects: SubjectRow[];
  rejectionReasons: RejectionReasonRow[];
  dialogs: DialogRow[];
  leads: LeadRow[];
  regularPricing: RegularPricing;
  regularPricingBySubject: Record<string, RegularPricing>;
  cutoffDays: number;
}

export function MetricsView({
  dispatchers,
  contracts,
  oneTimePayments,
  requests,
  trials,
  subjects,
  rejectionReasons,
  dialogs,
  leads,
  regularPricing,
  regularPricingBySubject,
  cutoffDays,
}: Props) {
  const [monthValue, setMonthValue] = useState(formatMonthKey(currentMonthKey()));
  const month = useMemo(() => parseMonthKey(monthValue), [monthValue]);

  return (
    <div className="space-y-4">
      <div className="bg-background sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 px-1 pb-2">
        <Input
          type="month"
          className="h-9 w-full sm:w-44"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
        />
        <span className="text-muted-foreground hidden text-xs lg:inline">
          «Контрактные» — последние 6 мес, «Удержание» — последние 4 мес, остальное — за выбранный
          месяц
        </span>
      </div>

      <Tabs defaultValue="profit" className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="profit">Прибыль</TabsTrigger>
            <TabsTrigger value="plan-fact">План / Факт</TabsTrigger>
            <TabsTrigger value="contracts">Контрактные</TabsTrigger>
            <TabsTrigger value="profitability">Рентабельность</TabsTrigger>
            <TabsTrigger value="retention">Удержание</TabsTrigger>
            <TabsTrigger value="dispatchers">Диспетчеры</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profit">
          <ProfitTab
            dispatchers={dispatchers}
            contracts={contracts}
            oneTimePayments={oneTimePayments}
            requests={requests}
            month={month}
          />
        </TabsContent>

        <TabsContent value="plan-fact">
          <PlanFactTab
            dispatchers={dispatchers}
            requests={requests}
            subjects={subjects}
            rejectionReasons={rejectionReasons}
            month={month}
          />
        </TabsContent>

        <TabsContent value="contracts">
          <ContractsTab contracts={contracts} dispatchers={dispatchers} subjects={subjects} />
        </TabsContent>

        <TabsContent value="profitability">
          <ProfitabilityTab
            contracts={contracts}
            trials={trials}
            initialPricing={regularPricing}
            pricingBySubject={regularPricingBySubject}
            initialCutoffDays={cutoffDays}
          />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionTab
            contracts={contracts}
            trials={trials}
            requests={requests}
            subjects={subjects}
          />
        </TabsContent>

        <TabsContent value="dispatchers">
          <DispatchersTab
            dispatchers={dispatchers}
            leads={leads}
            requests={requests}
            dialogs={dialogs}
            rejectionReasons={rejectionReasons}
            month={month}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
