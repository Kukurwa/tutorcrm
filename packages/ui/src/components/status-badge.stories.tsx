import type { Meta, StoryObj } from '@storybook/react';

import { StatusBadge } from './status-badge';

const meta: Meta<typeof StatusBadge> = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge tone="neutral" label="Draft" />
      <StatusBadge tone="info" label="Sent" />
      <StatusBadge tone="success" label="Paid" />
      <StatusBadge tone="warning" label="Due soon" />
      <StatusBadge tone="danger" label="Overdue" />
    </div>
  ),
};
