import type { Preview } from '@storybook/react-vite'
import '@corner-click/ui/styles/base.css'
import '@corner-click/ui/styles/tokens.css'
import '../src/styles/global.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo',
    },
  },
}

export default preview
