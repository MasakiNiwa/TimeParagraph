import { Anchor, Button, Card, Code, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { APP_VERSION, REPOSITORY_URL } from '@/lib/appInfo';

function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return `${error.message}\n\n${error.stack ?? ''}`;
  return String(error);
}

/**
 * ページの表示中に予期しないエラーが起きたときの画面。
 * ヘッダとナビゲーションは残し、ほかのページへ移動したり再読み込みしたりできるようにする。
 */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  const detail = describe(error);
  return (
    <Card withBorder padding="lg" maw={720} mx="auto">
      <Stack gap="sm">
        <Group gap="xs">
          <IconAlertTriangle size={22} />
          <Title order={2} size="h4">
            このページを表示できませんでした
          </Title>
        </Group>
        <Text size="sm">
          予期しないエラーが発生しました。原稿や設定はブラウザに保存されているため、失われていません。
          再読み込みするか、ほかのページへ移動してください。
        </Text>
        <Group gap="xs">
          <Button onClick={() => window.location.reload()}>再読み込み</Button>
          <Button component={Link} to="/" variant="default">
            エディタに戻る
          </Button>
        </Group>
        <Text size="sm">
          繰り返し発生する場合は、下のエラー内容を添えて{' '}
          <Anchor href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noopener noreferrer">
            GitHub の Issue
          </Anchor>{' '}
          でお知らせください。
        </Text>
        <Code block style={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>
          {`TimeParagraph v${APP_VERSION}\n${navigator.userAgent}\n\n${detail}`}
        </Code>
      </Stack>
    </Card>
  );
}
