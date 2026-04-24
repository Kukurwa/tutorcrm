import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { SortableList } from './sortable-list';

const meta: Meta = {
  title: 'UI/SortableList',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const Basic: Story = {
  render: () => {
    const [items, setItems] = useState([
      { id: '1', label: 'Новый диалог' },
      { id: '2', label: 'Лид создан' },
      { id: '3', label: 'Заявка сформирована' },
      { id: '4', label: 'Опубликована' },
    ]);
    return (
      <div className="w-80">
        <SortableList
          items={items}
          onReorder={setItems}
          renderItem={(it) => <span>{it.label}</span>}
        />
      </div>
    );
  },
};
