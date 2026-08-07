import React, { useEffect } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import '../src/index.css';

/**
 * Compass theme toggle (Task #15).
 *
 * No @storybook/addon-themes installed → built with plain globalTypes +
 * decorator. The app's dark-mode engine (src/lib/theme.ts) keys everything
 * off a `dark` class on <html>; src/index.css defines the `.dark` token set
 * (semantic tokens + shadcn HSL vars, slate standard #1f2937). We reuse that
 * exact mechanism here so stories render with the real app tokens.
 */

const LIGHT_BG = '#ffffff';
const DARK_BG = '#1f2937'; // Compass dark standard: slate

type CompassTheme = 'light' | 'dark';

function ThemeFrame({
  theme,
  children,
}: {
  theme: CompassTheme;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    // Same switch the app engine uses → .dark token block in index.css kicks in,
    // including for portaled content (dialogs, popovers) mounted on <body>.
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    // Storybook's canvas padding sits outside the wrapper div → paint <body> too.
    document.body.style.backgroundColor = theme === 'dark' ? DARK_BG : LIGHT_BG;
  }, [theme]);

  return React.createElement(
    'div',
    {
      style: {
        backgroundColor: theme === 'dark' ? DARK_BG : LIGHT_BG,
        color: 'hsl(var(--foreground))',
        minHeight: '100%',
      },
    },
    children,
  );
}

const withCompassTheme: Decorator = (Story, context) => {
  const theme: CompassTheme =
    context.globals.theme === 'dark' ? 'dark' : 'light';
  return React.createElement(
    ThemeFrame,
    { theme },
    React.createElement(Story),
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Compass color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: 'light',
  },

  decorators: [withCompassTheme],

  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
