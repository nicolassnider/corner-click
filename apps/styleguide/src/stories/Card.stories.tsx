import { Card } from '@corner-click/ui'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: { type: 'select' },
      options: ['none', 'small', 'medium', 'large'],
    },
    elevation: {
      control: { type: 'select' },
      options: ['low', 'medium', 'high'],
    },
    bordered: {
      control: 'boolean',
    },
    interactive: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: 0, paddingBottom: '8px' }}>Card Title</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          This is a simple card component with some content.
        </p>
      </div>
    ),
    padding: 'medium',
    elevation: 'low',
    bordered: true,
  },
}

export const Interactive: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: 0, paddingBottom: '8px' }}>Interactive Card</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Hover me to see the effect!</p>
      </div>
    ),
    padding: 'medium',
    elevation: 'medium',
    interactive: true,
  },
}
