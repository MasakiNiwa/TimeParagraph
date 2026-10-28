import {
  ActionIcon,
  AppShell,
  Group,
  NavLink,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconHelpCircle, IconMoon, IconSun } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { startPersistence } from '@/features/editor/persistence';
import { APP_NAME } from '@/lib/appInfo';
import classes from './AppLayout.module.css';
import { navItems } from './routes';
import { UpdatePrompt } from './UpdatePrompt';
import { useOpenRouterCallback } from './useOpenRouterCallback';

function isActive(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname.startsWith(path);
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light');
  const next = computed === 'dark' ? 'light' : 'dark';
  return (
    <Tooltip label={next === 'dark' ? 'ダークモードにする' : 'ライトモードにする'}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label="ダークモード切り替え"
        onClick={() => setColorScheme(next)}
      >
        {computed === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
      </ActionIcon>
    </Tooltip>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    void startPersistence();
  }, []);
  useOpenRouterCallback();
  const isMobile = useMediaQuery('(max-width: 48em)', false, { getInitialValueInEffect: false });

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: 60, collapsed: !isMobile }}
      padding="md"
    >
      <AppShell.Header className={classes.header}>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <UnstyledButton component={Link} to="/" className={classes.brand}>
            <Text fw={700} size="lg">
              {APP_NAME}
            </Text>
          </UnstyledButton>
          <Group gap={4} wrap="nowrap">
            <ColorSchemeToggle />
            <Tooltip label="ヘルプ">
              <ActionIcon
                component={Link}
                to="/help"
                variant={pathname.startsWith('/help') ? 'light' : 'subtle'}
                color="gray"
                size="lg"
                aria-label="ヘルプ"
              >
                <IconHelpCircle size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            component={Link}
            to={item.path}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.6} />}
            active={isActive(pathname, item.path)}
            variant="light"
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main className={classes.main}>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer className={classes.bottomNav}>
        <nav aria-label="メインナビゲーション" className={classes.bottomNavInner}>
          {navItems.map((item) => {
            const active = isActive(pathname, item.path);
            return (
              <UnstyledButton
                key={item.path}
                component={Link}
                to={item.path}
                className={classes.bottomNavItem}
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon size={22} stroke={1.6} />
                <span>{item.label}</span>
              </UnstyledButton>
            );
          })}
        </nav>
      </AppShell.Footer>
      <UpdatePrompt />
    </AppShell>
  );
}
