import type { Meta, StoryObj } from '@storybook/react';

import { RoleBadge } from './role-badge';

const meta: Meta<typeof RoleBadge> = {
  title: 'UI/RoleBadge',
  component: RoleBadge,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof RoleBadge>;

export const Admin: Story = { args: { role: 'admin' } };
export const Dispatcher: Story = { args: { role: 'dispatcher' } };
export const LeadGen: Story = { args: { role: 'leadgen' } };

export const All: Story = {
  render: () => (
    <div className="flex gap-2">
      <RoleBadge role="admin" />
      <RoleBadge role="dispatcher" />
      <RoleBadge role="leadgen" />
    </div>
  ),
};
