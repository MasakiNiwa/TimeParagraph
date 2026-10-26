# アーキテクチャ

## 技術スタック

- Vite + React + TypeScript
- UI: Mantine(ダークモード / Accordion / AppShell)
- 状態管理: Zustand(設定は localStorage に永続化)+ zundo(元に戻す/やり直す)
- 保存: Dexie(IndexedDB)に原稿を自動保存
- 並べ替え: dnd-kit
- スキーマ: Zod(保存データ・取込データ・AI 入出力の検証を一元化)
- ルーティング: React Router(GitHub Pages のため HashRouter)

## ディレクトリ構成

```
src/
  app/            レイアウト・ナビゲーション定義(routes.tsx にページを追加)
  components/     汎用 UI(CollapsibleSections など)
  domain/         UI に依存しないロジック(文書スキーマ・時間推定・整形)
  features/       機能単位のモジュール
    editor/       パラグラフエディタ
    settings/     設定(スキーマ・ストア・ページ)
    help/         ヘルプ・クレジット
  lib/            アプリ情報などの共通処理
  generated/      ビルド時に生成(Git 管理外)
scripts/          ビルド用スクリプト
```

## 設計方針

- **スキーマに既定値を持たせる**: 設定は `.catch()` で項目ごとに既定値を持つため、項目の追加・削除をしても古い保存データを安全に読み込めます。
- **ナビゲーションは定義駆動**: `src/app/routes.tsx` の `navItems` に追加すると、PC のサイドバーとスマホの下部ナビの両方に反映されます。
- **折りたたみセクション**: 設定・ヘルプは `CollapsibleSections` で構成し、既定はすべて閉じた状態です。

## 文書モデル

`src/domain/document.ts` で Zod スキーマとして定義しています。

- ブロック(`paragraph` / `heading`)のフラットな配列。見出しがセクションの区切りになります。
- 段落ごとに `speedFactor`(話す速さの倍率)、`pauseAfterSec`(後の間)、`note`(話さないメモ)を持ちます。
- `schemaVersion` を持ち、`parseDocument` で読み込み時の検証・移行を行います。

## 時間推定

`src/domain/estimate.ts` の `Estimator` インターフェースで推定方式を差し替えられます。

| 方式             | 実装                                                                     | 単位 |
| ---------------- | ------------------------------------------------------------------------ | ---- |
| 文字数           | `countSpokenChars`                                                       | 字   |
| 拍数(簡易)       | `estimateMoraHeuristic`(`domain/mora.ts`)                                | 拍   |
| 拍数(形態素解析) | `workers/morph.worker.ts`(kuromoji)+ `features/estimation/morphStore.ts` | 拍   |

形態素解析は Web Worker(Comlink)で実行し、結果はテキストをキーにキャッシュします。解析が終わるまでは簡易推定で代用するため、UI は常に即座に更新されます。
辞書は `npm run copy-dict` で `public/dict/kuromoji/` にコピーされます(Git 管理外)。
`estimateDocument` が段落ごとの所要時間・開始時刻・合計を、`summarizeSections` が見出しごとの合計を返します。

## 状態と履歴

- `features/editor/documentStore.ts` が編集操作(追加・分割・結合・移動・クリアなど)をすべて持ちます。
- 同じ段落への連続入力は 1 秒以内なら 1 つの履歴にまとめます。
- `features/editor/persistence.ts` が起動時の読み込みと変更の自動保存(400ms デバウンス)を担当します。

## 練習(リハーサル・読み上げ)

- `features/rehearsal/rehearsalStore.ts`:段落ごとのラップ計測(一時停止対応、`performance.now` ベース)。終了時に IndexedDB の `rehearsals` テーブルへ保存します。
- `domain/rehearsal.ts`:記録のスキーマと、実測からの話速の補正(`calibrateSpeed`)。
- `features/speech/speechStore.ts`:Web Speech API による読み上げ。ブラウザによっては長い発話が途中で止まるため、文単位(`domain/sentences.ts`)で発話します。一時停止は停止+位置の記憶で実装しています。

## 分析ツール

`features/analysis/` に、登録制の分析ツールを置いています。

1. `features/analysis/tools/` に `AnalysisTool`(`types.ts`)を実装したファイルを作る
2. `tools/index.ts` の `analysisTools` に追加する

これだけで分析ページのタブに表示されます。ツールは共通の `AnalysisContext`(原稿・推定・時間ツリー・段落統計・リハーサル履歴)を受け取ります。
`summarize` を実装すると、`buildAnalysisSnapshot` 経由で構造化データとして AI 連携に使われます。

計算は `domain/analysis.ts`(UI 非依存・テスト済み)、グラフは `components/EChart.tsx`(ECharts の必要なモジュールだけを登録)を使います。

## ライセンス管理

- アプリ本体: MIT(`LICENSE`)
- 依存ライブラリ: `npm run licenses`(`dev` / `build` 時に自動実行)が `package-lock.json` の本番依存からライセンス情報を収集し、
  - `src/generated/licenses.json`(ヘルプページのクレジット表示用)
  - `public/THIRD_PARTY_LICENSES.txt`(配布物に同梱)

  を生成します。

- npm 以外の資産や、パッケージに同梱された別ライセンスのデータ(IPADIC 辞書など)は `scripts/extra-licenses.json` に追記します(`textFrom` で本文のファイルを指定可能)。
