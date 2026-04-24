import type { Meta, StoryObj } from '@storybook/react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Заголовок</CardTitle>
        <CardDescription>Описание карточки</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Содержимое карточки.</p>
      </CardContent>
    </Card>
  ),
};
