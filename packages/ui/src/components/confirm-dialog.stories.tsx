import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

export const Destructive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Удалить
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Удалить клиента?"
          description="Все связанные заявки и контракты останутся в истории."
          confirmLabel="Удалить"
          destructive
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
};
