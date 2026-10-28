import { Anchor, Badge, Card, Code, Group, List, Stack, Table, Text, Title } from '@mantine/core';
import {
  IconBook,
  IconBrandGithub,
  IconChartBar,
  IconCertificate,
  IconClock,
  IconDatabase,
  IconHeart,
  IconKeyboard,
  IconMicrophone,
  IconSparkles,
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
        見出しと、その次の見出しまでの段落は 1
        つの「セクション」です。見出しをドラッグ(または「…」メニューの上へ/下へ、Alt+↑↓)すると、配下の段落もまとめて移動します。見出しの左の矢印でセクションをたたむこともできます。
      </List.Item>
      <List.Item>
        段落や見出しの「タイプ」を押すと、内容のタイプ(導入・結論・理由・具体例・まとめなど)を付けられます。構成がひと目でわかり、AI
        も構成を把握して助言します。
      </List.Item>
      <List.Item>
        「︙」メニューの「構成テンプレート」から、PREP
        法・問題解決型プレゼン・業務報告・講義などの構成で書き始められます。空の段落には書き方の案内が表示されます。今の原稿の構成を、自分のテンプレートとして保存することもできます(本文は保存しません)。
      </List.Item>
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
    ['Alt + ↑ / ↓', '段落を上下に移動(見出しではセクションごと移動)'],
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
          <b>リハーサル(計測)</b>
          :「開始」を押してから自分で声に出して話し、段落を話し終えるたびに「次の段落へ」を押します(強調中の段落をタップ、またはスペースキー
          / →
          でも進めます)。段落ごとの実際の時間を計測し、推定との差と「あなたの話す速さ」を表示します。「この速さを設定に反映」を押すと、以後の推定に使われます。P
          キーで一時停止/再開できます。
        </List.Item>
        <List.Item>
          計測に失敗したときは、計測中は「終了・破棄 →
          破棄する」、終了後は結果の「この記録を破棄」で記録を残さずに済みます。
        </List.Item>
        <List.Item>
          <b>読み上げ</b>
          :ブラウザの音声合成で原稿を読み上げます。段落を押すとそこから読み上げます。声と速さを選べます(声の種類はお使いの端末によって異なります)。
          「読み上げで計測」を押すと、最初から読み上げて段落ごとの時間を計測し、リハーサル履歴に保存します(読み上げの速さの確認や、話す速さの目安に使えます)。
        </List.Item>
        <List.Item>
          <b>発表モード</b>
          :現在の段落を画面いっぱいに大きく表示し、経過時間と遅れ/先行を表示します。画面のタップ(またはスペースキー)で次の段落へ進みます。本番の手元原稿としても使えます。
        </List.Item>
        <List.Item>練習中は、対応している端末では画面が自動で消えないようにします。</List.Item>
      </List>
    </Stack>
  );
}

function Analysis() {
  return (
    <Stack gap="xs">
      <Text size="sm">「分析」ページでは、原稿とリハーサルの記録を分析できます。</Text>
      <List size="sm" spacing="xs">
        <List.Item>
          <b>時間の内訳</b>:全体 → セクション → 段落 →
          文の順に掘り下げて(ドリルダウン)、どこに時間を使っているかを確認できます。棒や表の名前を押すと一段深く、上部のパンくずで戻れます。
        </List.Item>
        <List.Item>
          <b>段落のバランス</b>:段落ごとの長さを比べ、中央値より極端に長い・短い段落を示します。
        </List.Item>
        <List.Item>
          <b>長い文</b>:一息で話すには長い文を見つけます。
        </List.Item>
        <List.Item>
          <b>リハーサルの比較</b>:回ごとの合計時間の推移と、段落ごとの推定と実測の差を表示します。
        </List.Item>
      </List>
      <Text size="sm">
        「分析結果を JSON でコピー」で、分析結果を構造化データとして取り出せます(AI
        連携でも使います)。
      </Text>
    </Stack>
  );
}

function AiHelp() {
  return (
    <Stack gap="xs">
      <Text size="sm">
        AI は任意の機能です。使わなくても、エディタ・練習・分析はすべて利用できます。Google
        Gemini・OpenAI・Anthropic Claude・OpenRouter に対応し、モデルも選べます。
      </Text>
      <List size="sm" spacing="xs">
        <List.Item>
          <b>OpenRouter</b>:1 つのキーで多数のモデル(無料モデルを含む)を使えます。「設定 → AI →
          OpenRouter」の「OpenRouter
          でログイン」を押すと、キーを貼り付けずに使い始められます。モデルは選択パネルで検索・「無料のみ」「ツール対応のみ」などで絞り込み、★
          でお気に入りに固定できます。アプリの機能を使う依頼(編集案など)には「ツール」対応のモデルが必要です。
        </List.Item>
        <List.Item>
          「設定 → AI」で API キーを登録します。Google AI Studio の無料枠で試すのがおすすめです。
        </List.Item>
        <List.Item>
          AI ページ上部で、AI
          サービスとモデルをいつでも切り替えられます。モデル欄は入力して絞り込めます。🔄
          で各サービスから最新のモデル一覧を取得し、鉛筆ボタンでモデル名を直接入力できます。
        </List.Item>
        <List.Item>
          入力欄の「考える深さ」で、速さ優先 / バランス / じっくり
          を切り替えられます。深く考えるほど丁寧になりますが、応答に時間がかかります(flash
          系でも数分かかることがあります)。普段は「速さ優先」がおすすめです。
        </List.Item>
        <List.Item>
          対応しているモデル(Gemini・OpenAI の推論モデル・Claude)では、AI
          が考えている内容(思考過程)をリアルタイムに表示します。「設定 →
          AI」で表示しないようにもできます。
        </List.Item>
        <List.Item>
          パソコンでは Enter で送信、Shift+Enter で改行します。スマホでは Enter
          は改行になり、送信ボタンで送ります。
        </List.Item>
        <List.Item>
          AI
          は原稿の状態(段落・推定時間・目標・分析結果)を構造化データとして受け取り、時間の計算や分析はアプリの機能をツールとして呼び出して行います。AI
          が時間を推測で答えることはありません。
        </List.Item>
        <List.Item>
          原稿の変更は「編集案」として表示されます。変更前後の文章と合計時間を確認し、「適用する」を押したときだけ原稿に反映されます(エディタの「元に戻す」で戻せます)。
        </List.Item>
        <List.Item>
          API キーはこのブラウザにのみ保存され、選んだ AI サービスへ直接送信されます。AI
          を使うと原稿の内容がそのサービスに送られます。
        </List.Item>
      </List>
    </Stack>
  );
}

function DataStorage() {
  return (
    <Stack gap="xs">
      <Text size="sm">
        入力した内容や設定は、お使いのブラウザ内(ローカルストレージ / IndexedDB)にのみ保存され、
        サーバーには送信されません。ただし AI アシスタントを使ったときは、原稿の内容が選んだ AI
        サービスに送信されます。
      </Text>
      <Text size="sm">
        エディタの「︙」メニューから、Markdown・時間つきテキスト・バックアップ(JSON)として書き出せます。Markdown
        / テキスト / JSON
        のファイルを新しい原稿として取り込むこともできます。ブラウザのデータを消すと原稿も消えるため、大切な原稿はバックアップしてください。
      </Text>
      <Text size="sm">
        ホーム画面に追加(インストール)すると、アプリのように起動でき、一度開いたあとはオフラインでも使えます(AI
        を除く)。
      </Text>
    </Stack>
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
            id: 'analysis',
            title: '分析',
            icon: IconChartBar,
            content: <Analysis />,
          },
          {
            id: 'ai',
            title: 'AI アシスタント',
            icon: IconSparkles,
            content: <AiHelp />,
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
