import { Anchor, Badge, Card, Group, List, Stack, Text, Title } from '@mantine/core';
import {
  IconBook,
  IconBrandGithub,
  IconCertificate,
  IconClock,
  IconDatabase,
  IconHeart,
} from '@tabler/icons-react';
import { CollapsibleSections } from '@/components/CollapsibleSections';
import { PageContainer } from '@/components/PageContainer';
import {
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  BUILD_TIME,
  COMMIT_SHA,
  REPOSITORY_URL,
} from '@/lib/appInfo';
import { Credits } from './Credits';

function VersionCard() {
  const built = new Date(BUILD_TIME).toLocaleString('ja-JP');
  return (
    <Card withBorder padding="lg">
      <Stack gap={6}>
        <Group gap="sm" align="baseline">
          <Title order={2} size="h3">
            {APP_NAME}
          </Title>
          <Badge variant="light" tt="none">
            v{APP_VERSION}
          </Badge>
        </Group>
        <Text c="dimmed" size="sm">
          {APP_TAGLINE}
        </Text>
        <Text size="xs" c="dimmed">
          ビルド: {built} / コミット: {COMMIT_SHA}
        </Text>
      </Stack>
    </Card>
  );
}

function Usage() {
  return (
    <List size="sm" spacing="xs">
      <List.Item>話す内容をパラグラフ(段落)ごとに書いていきます。</List.Item>
      <List.Item>各パラグラフの文字数から、話すのにかかる時間を自動で推定します。</List.Item>
      <List.Item>全パラグラフの合計時間を見ながら、内容と時間配分を調整できます。</List.Item>
    </List>
  );
}

function Estimation() {
  return (
    <Stack gap="xs">
      <Text size="sm">推定時間 = 文字数 ÷ 話す速さ(字/分)+ パラグラフ間の間(秒)で計算します。</Text>
      <Text size="sm">
        話す速さは「設定 → 時間の推定」で変更できます。日本語のニュース読み上げはおよそ 300
        字/分が目安です。
      </Text>
    </Stack>
  );
}

function DataStorage() {
  return (
    <Text size="sm">
      入力した内容や設定は、お使いのブラウザ内(ローカルストレージ / IndexedDB)にのみ保存され、
      サーバーには送信されません。
    </Text>
  );
}

function Repository() {
  return (
    <Stack gap="xs">
      <Text size="sm">ソースコード・不具合報告・要望は GitHub リポジトリで受け付けています。</Text>
      <Anchor href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" size="sm">
        {REPOSITORY_URL}
      </Anchor>
    </Stack>
  );
}

function AppLicense() {
  return (
    <Stack gap="xs">
      <Text size="sm">{APP_NAME} は MIT ライセンスで公開されています。</Text>
      <Anchor
        href={`${REPOSITORY_URL}/blob/main/LICENSE`}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
      >
        LICENSE を見る
      </Anchor>
    </Stack>
  );
}

export function HelpPage() {
  return (
    <PageContainer title="ヘルプ">
      <VersionCard />
      <CollapsibleSections
        sections={[
          { id: 'usage', title: '使い方', icon: IconBook, content: <Usage /> },
          {
            id: 'estimation',
            title: '時間の推定について',
            icon: IconClock,
            content: <Estimation />,
          },
          {
            id: 'data',
            title: 'データの保存について',
            icon: IconDatabase,
            content: <DataStorage />,
          },
          {
            id: 'repo',
            title: 'GitHub リポジトリ',
            icon: IconBrandGithub,
            content: <Repository />,
          },
          { id: 'license', title: 'ライセンス', icon: IconCertificate, content: <AppLicense /> },
          {
            id: 'credits',
            title: 'クレジット(利用ライブラリ)',
            icon: IconHeart,
            content: <Credits />,
          },
        ]}
      />
    </PageContainer>
  );
}
