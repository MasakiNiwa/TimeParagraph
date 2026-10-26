import { Anchor, Badge, Card, Code, Group, List, Stack, Table, Text, Title } from '@mantine/core';
import {
  IconBook,
  IconBrandGithub,
  IconCertificate,
  IconClock,
  IconDatabase,
  IconHeart,
  IconKeyboard,
  IconMicrophone,
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
      <List.Item>
        上部のバーに合計時間が表示されます。各段落には「何分何秒から話し始めるか」も表示されます。
      </List.Item>
      <List.Item>「見出し」を入れると、見出しごとの合計時間も確認できます。</List.Item>
      <List.Item>
        「目標」を押すと目標時間を設定できます。残り時間/超過時間と、時間配分バー(縦線が目標)が表示されます。配分バーを押すとその箇所へ移動します。
      </List.Item>
      <List.Item>左端のつまみをドラッグすると、段落を並べ替えられます。</List.Item>
      <List.Item>
        段落の「…」メニューから、段落ごとの話す速さ・間・メモ(話さない補足)を設定できます。
      </List.Item>
      <List.Item>
        右上の「︙」メニューから、原稿の切り替えや、テキストの一括入力(空行で段落を区切る)ができます。
      </List.Item>
    </List>
  );
}

function Shortcuts() {
  const rows = [
    ['Ctrl + Enter', 'カーソル位置で段落を分割(末尾なら新しい段落を追加)'],
    ['Backspace(段落の先頭で)', '前の段落と結合/空の段落を削除'],
    ['Alt + ↑ / ↓', '段落を上下に移動'],
    ['Ctrl + Z', '元に戻す'],
    ['Ctrl + Shift + Z / Ctrl + Y', 'やり直す'],
  ];
  return (
    <Table>
      <Table.Tbody>
        {rows.map(([key, desc]) => (
          <Table.Tr key={key}>
            <Table.Td>
              <Code>{key}</Code>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{desc}</Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function Estimation() {
  return (
    <Stack gap="xs">
      <Text size="sm">推定方式は「設定 → 時間の推定」で選べます。</Text>
      <List size="sm" spacing="xs">
        <List.Item>
          <b>文字数</b>:文字数 ÷ 話す速さ(字/分)。空白やかぎかっこは数えません。目安は 300
          字/分です。
        </List.Item>
        <List.Item>
          <b>拍数(簡易)</b>:かなは 1 拍、漢字は平均 1.8
          拍として拍(モーラ)数を見積もり、話す速さ(拍/分)で割ります。
        </List.Item>
        <List.Item>
          <b>拍数(形態素解析)</b>:辞書(kuromoji /
          IPADIC)で読みを調べ、拍数を正確に数えます。解析はバックグラウンド(Web
          Worker)で行うため、入力の邪魔をしません。初回だけ辞書(約 18MB)を読み込みます。
        </List.Item>
      </List>
      <Text size="sm">
        句読点は「間」として数えます(読点 1 拍、句点 2
        拍)。段落ごとの速さの倍率と段落間の間も加算します。見出しとメモは話さないものとして扱います。
      </Text>
    </Stack>
  );
}

function Practice() {
  return (
    <Stack gap="xs">
      <Text size="sm">下部(PC では左)の「練習」から、原稿を見ながら練習できます。</Text>
      <List size="sm" spacing="xs">
        <List.Item>
          <b>リハーサル(計測)</b>:自分で声に出して話し、段落を話し終えるたびに「次へ」(スペースキー
          /
          →)を押します。段落ごとの実際の時間を計測し、推定との差と「あなたの話す速さ」を表示します。
          「この速さを設定に反映」を押すと、以後の推定に使われます。P キーで一時停止/再開できます。
        </List.Item>
        <List.Item>
          <b>読み上げ</b>
          :ブラウザの音声合成で原稿を読み上げます。段落を押すとそこから読み上げます。声と速さを選べます(声の種類はお使いの端末によって異なります)。
        </List.Item>
        <List.Item>練習中は、対応している端末では画面が自動で消えないようにします。</List.Item>
      </List>
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
            id: 'practice',
            title: '練習(リハーサル・読み上げ)',
            icon: IconMicrophone,
            content: <Practice />,
          },
          {
            id: 'shortcuts',
            title: 'キーボードショートカット',
            icon: IconKeyboard,
            content: <Shortcuts />,
          },
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
