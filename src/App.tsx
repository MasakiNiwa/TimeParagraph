import { Group, Loader } from '@mantine/core';
import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/app/AppLayout';
import { EditorPage } from '@/features/editor/EditorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// エディタ以外のページは必要になったときに読み込む
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const PracticePage = lazy(() =>
  import('@/features/practice/PracticePage').then((m) => ({ default: m.PracticePage })),
);
const AnalysisPage = lazy(() =>
  import('@/features/analysis/AnalysisPage').then((m) => ({ default: m.AnalysisPage })),
);
const AiPage = lazy(() => import('@/features/ai/AiPage').then((m) => ({ default: m.AiPage })));
const HelpPage = lazy(() =>
  import('@/features/help/HelpPage').then((m) => ({ default: m.HelpPage })),
);

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Group justify="center" mt="xl">
          <Loader size="sm" />
        </Group>
      }
    >
      {children}
    </Suspense>
  );
}

// GitHub Pages では SPA のパスを解決できないため HashRouter を使う
const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <EditorPage /> },
      {
        path: '/practice',
        element: (
          <Lazy>
            <PracticePage />
          </Lazy>
        ),
      },
      {
        path: '/analysis',
        element: (
          <Lazy>
            <AnalysisPage />
          </Lazy>
        ),
      },
      {
        path: '/ai',
        element: (
          <Lazy>
            <AiPage />
          </Lazy>
        ),
      },
      {
        path: '/settings',
        element: (
          <Lazy>
            <SettingsPage />
          </Lazy>
        ),
      },
      {
        path: '/help',
        element: (
          <Lazy>
            <HelpPage />
          </Lazy>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
