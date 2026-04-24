import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'Введите текст' } };
export const Disabled: Story = { args: { placeholder: 'Недоступно', disabled: true } };
export const WithValue: Story = { args: { defaultValue: 'Имя клиента' } };
