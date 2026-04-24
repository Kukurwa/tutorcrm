import type { Meta, StoryObj } from '@storybook/react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const meta: Meta = {
  title: 'UI/Select',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Выберите роль" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="dispatcher">Dispatcher</SelectItem>
        <SelectItem value="leadgen">LeadGen</SelectItem>
      </SelectContent>
    </Select>
  ),
};
