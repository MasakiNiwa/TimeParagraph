import '@mantine/core/styles.css';
import './global.css';
import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
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
      <App />
    </MantineProvider>
  </StrictMode>,
);
