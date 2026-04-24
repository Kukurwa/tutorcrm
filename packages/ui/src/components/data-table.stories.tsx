import type { Meta, StoryObj } from '@storybook/react';

import { DataTable, type DataTableColumn } from './data-table';
import { RoleBadge } from './role-badge';

type Row = { id: string; name: string; email: string; role: 'admin' | 'dispatcher' | 'leadgen' };

const rows: Row[] = [
  { id: '1', name: 'Анна Смирнова', email: 'anna@example.com', role: 'dispatcher' },
  { id: '2', name: 'Игорь Петров', email: 'igor@example.com', role: 'leadgen' },
  { id: '3', name: 'Олег Админ', email: 'oleg@example.com', role: 'admin' },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Имя', cell: (r) => r.name },
  { key: 'email', header: 'Email', cell: (r) => r.email },
  { key: 'role', header: 'Роль', cell: (r) => <RoleBadge role={r.role} /> },
];

const meta: Meta<typeof DataTable<Row>> = {
  title: 'UI/DataTable',
  component: DataTable<Row>,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof DataTable<Row>>;

export const Filled: Story = {
  args: { columns, rows, getRowId: (r) => r.id },
};

export const Loading: Story = {
  args: { columns, rows: [], getRowId: (r) => r.id, isLoading: true },
};

export const Empty: Story = {
  args: {
    columns,
    rows: [],
    getRowId: (r) => r.id,
    emptyTitle: 'Ничего не найдено',
    emptyDescription: 'Попробуйте изменить фильтры поиска.',
  },
};
