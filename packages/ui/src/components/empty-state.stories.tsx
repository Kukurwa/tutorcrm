import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { EmptyState } from './empty-state';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Basic: Story = {
  args: {
    title: 'Пока нет заявок',
    description: 'Новые заявки появятся здесь после создания лида.',
  },
};

export const WithAction: Story = {
  args: {
    title: 'Пока нет клиентов',
    description: 'Добавьте первого клиента, чтобы начать работу.',
    action: <Button size="sm">Добавить клиента</Button>,
  },
};
