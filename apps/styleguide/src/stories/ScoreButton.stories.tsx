import type { Meta, StoryObj } from '@storybook/react'
import { ScoreButton } from '../../../web-judges/src/components/ScorePad'

const meta: Meta<typeof ScoreButton> = {
  title: 'Judges/ScoreButton',
  component: ScoreButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onAction: { action: 'clicked' },
  },
  decorators: [
    (Story) => (
      <div className="bg-slate-950 p-10 h-64 w-64 flex">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ScoreButton>

export const RedPoint1: Story = {
  args: {
    className:
      'flex-1 bg-rose-600 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(225,29,72,0.3)] border-t border-rose-400/30 group cursor-pointer w-full',
    children: (
      <>
        <span className="text-7xl font-black drop-shadow-md">+1</span>
        <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">Mano</span>
      </>
    ),
  },
}

export const BluePoint3: Story = {
  args: {
    className:
      'flex-1 bg-blue-600 text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(37,99,235,0.3)] border-t border-blue-400/30 group cursor-pointer w-full',
    children: (
      <>
        <span className="text-7xl font-black drop-shadow-md">+3</span>
        <span className="text-xs font-black uppercase tracking-widest opacity-90 mt-2">
          Patada A
        </span>
      </>
    ),
  },
}

export const Warning: Story = {
  args: {
    className:
      'flex-1 bg-amber-500 text-amber-950 rounded-2xl font-black uppercase tracking-widest shadow-lg flex flex-col items-center justify-center text-xs border-t border-amber-300/50 cursor-pointer w-full',
    children: 'Warn',
  },
}

export const Deduction: Story = {
  args: {
    className:
      'flex-1 bg-slate-900 border-2 border-rose-900/50 text-rose-500 rounded-2xl font-black uppercase tracking-widest shadow-lg flex flex-col items-center justify-center text-xs cursor-pointer w-full',
    children: 'Dedct',
  },
}
