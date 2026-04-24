import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { ColorPicker } from './color-picker';

const meta: Meta<typeof ColorPicker> = {
  title: 'UI/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ColorPicker>;

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState('#7c3aed');
    return (
      <div className="flex items-center gap-4">
        <ColorPicker value={value} onChange={setValue} />
        <span className="rounded p-3" style={{ backgroundColor: value, color: 'white' }}>
          пример
        </span>
      </div>
    );
  },
};
