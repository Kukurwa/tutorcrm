import type { Meta, StoryObj } from '@storybook/react';

import { FormField } from './form-field';
import { Input } from './input';

const meta: Meta<typeof FormField> = {
  title: 'UI/FormField',
  component: FormField,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof FormField>;

export const WithError: Story = {
  render: () => (
    <FormField
      label="Email"
      htmlFor="email"
      required
      description="Мы не передаём email третьим лицам."
      error="Неверный формат"
    >
      <Input id="email" placeholder="you@example.com" />
    </FormField>
  ),
};
