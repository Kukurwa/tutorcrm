import type { Meta, StoryObj } from '@storybook/react';

import { Label } from './label';
import { Switch } from './switch';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="switch" defaultChecked />
      <Label htmlFor="switch">Включено</Label>
    </div>
  ),
};
