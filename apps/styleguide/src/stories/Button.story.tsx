import { Button } from '@corner-click/ui'
import type { Meta, StoryObj } from '@ladle/react'

const meta: Meta = {
  title: 'Components/Button',
}

export default meta

export const Primary: StoryObj = () => <Button variant="primary">Primary Button</Button>

export const Secondary: StoryObj = () => <Button variant="secondary">Secondary Button</Button>

export const Danger: StoryObj = () => <Button variant="danger">Danger Button</Button>

export const Small: StoryObj = () => (
  <Button variant="primary" size="sm">
    Small Button
  </Button>
)

export const Medium: StoryObj = () => (
  <Button variant="primary" size="md">
    Medium Button
  </Button>
)

export const Large: StoryObj = () => (
  <Button variant="primary" size="lg">
    Large Button
  </Button>
)

export const FullWidth: StoryObj = () => (
  <Button variant="primary" fullWidth>
    Full Width Button
  </Button>
)
