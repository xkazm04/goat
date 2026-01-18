import React from 'react';
import type { Preview } from '@storybook/react-webpack5';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: 'hsl(222.2 84% 4.9%)',
        },
        {
          name: 'light',
          value: 'hsl(0 0% 100%)',
        },
        {
          name: 'experimental-dark',
          value: 'hsl(240 15% 8%)',
        },
      ],
    },
    layout: 'centered',
    docs: {
      toc: true,
    },
  },
  decorators: [
    (Story, context) => {
      // Apply theme class based on background
      const background = context.globals?.backgrounds?.value;
      const themeClass = background === 'hsl(0 0% 100%)' ? '' : 'dark';

      return (
        <div className={themeClass} style={{ padding: '2rem' }}>
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark', 'experimental-dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
