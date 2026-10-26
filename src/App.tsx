import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/app/AppLayout';
import { EditorPage } from '@/features/editor/EditorPage';
import { HelpPage } from '@/features/help/HelpPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// GitHub Pages では SPA のパスを解決できないため HashRouter を使う
const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <EditorPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/help', element: <HelpPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
