import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './global.css';
import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { theme } from './theme';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'timeparagraph:color-scheme' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      colorSchemeManager={colorSchemeManager}
    >
      <Notifications position="top-center" />
      <ModalsProvider>
        <App />
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);
