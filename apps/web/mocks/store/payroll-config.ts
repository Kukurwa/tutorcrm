import type {
  PayrollConfig,
  PayrollDispatcherCell,
  PayrollRopRow,
  UpdatePayrollConfigRequest,
} from '@tutorcrm/contracts';

const cell = (percent: number, fixed: number): PayrollDispatcherCell => ({ percent, fixed });

const defaultRopScale: PayrollRopRow[] = [
  { from: 0, to: 25_000, percent: 5.0, fixed: 2_000 },
  { from: 25_001, to: 50_000, percent: 5.5, fixed: 2_500 },
  { from: 50_001, to: 75_000, percent: 6.0, fixed: 3_000 },
  { from: 75_001, to: 100_000, percent: 6.5, fixed: 3_500 },
  { from: 100_001, to: null, percent: 7.0, fixed: 4_000 },
];

// Колонки матрицы: < 6 мес / 6+ мес / 12+ мес / 3+ года / 4+ года
const defaultMatrix: PayrollDispatcherCell[][] = [
  // 0 – 25 000 — везде 10% + 4500
  [cell(10, 4500), cell(10, 4500), cell(10, 4500), cell(10, 4500), cell(10, 4500)],
  // 25 001 – 50 000 — везде 11% + 4000
  [cell(11, 4000), cell(11, 4000), cell(11, 4000), cell(11, 4000), cell(11, 4000)],
  // 50 001 – 75 000
  [cell(12, 3500), cell(12.5, 3500), cell(13, 3500), cell(14, 3500), cell(15, 3500)],
  // 75 001 – 100 000
  [cell(13, 3000), cell(13.5, 3000), cell(14, 3000), cell(15, 3000), cell(16, 3000)],
  // 100 001 +
  [cell(14, 2000), cell(14.5, 2000), cell(15, 2000), cell(16, 2000), cell(17, 2000)],
];

let config: PayrollConfig = {
  ropScale: defaultRopScale,
  dispatcherRanges: defaultRopScale.map(({ from, to }) => ({ from, to })),
  dispatcherMatrix: defaultMatrix,
  updatedAt: new Date().toISOString(),
};

export function getPayrollConfig(): PayrollConfig {
  return config;
}

export function updatePayrollConfig(patch: UpdatePayrollConfigRequest): PayrollConfig {
  config = {
    ...config,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return config;
}
