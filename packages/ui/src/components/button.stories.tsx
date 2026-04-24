import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: 'Кнопка' } };
export const Destructive: Story = { args: { children: 'Удалить', variant: 'destructive' } };
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } };
export const Small: Story = { args: { children: 'Small', size: 'sm' } };
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };
