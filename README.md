# taskliner_taskchute-line

TaskLiner / taskchute-line の考え方を、Obsidian プラグインではなく **単体HTMLで動かす実験版**です。

## 現在の構成

- `taskliner_taskchute-line.html` — 本体。HTML/CSS/JavaScriptを1ファイルに収録
- `index.html` — GitHub Pages 用の入口。本体HTMLへ転送

## 現在できること

- 日付ごとのタスク管理
- タスク追加
- 見積時間の入力
- タスク開始 / 終了
- 前回の終了時刻から開始
- 実行中タスクを開始した際、既存の実行中タスクを終了
- 完了 / 保留 / リセット
- 上下移動
- 翌日へ移動
- 前日の未完了タスクを持ち越し
- 実績時間・進捗・残り見積の表示
- TaskLiner風Markdownへの書き出し
- Markdownからの取り込み
- `.md` ダウンロード

## 保存方式

現段階ではブラウザの `localStorage` を使います。

そのため、同じブラウザ・同じサイト内では再読込後もデータが残りますが、端末間同期はまだ行いません。

## Markdown例

```md
- [ ] タスク名
- [/] 実行中タスク 【09:00-】
- [x] 完了タスク 【09:00-09:25 / 25m】
- [>] 保留タスク
```

見積時間を入力した場合は、HTML版では次のように保持します。

```md
- [ ] タスク名 ⏳25m
```

## 今後の方向

元の `plzsayyes3/taskliner` の機能を、必要なものからHTML版へ移植します。

候補:

- TaskLinerと同じ行パーサー / シリアライズ互換性の向上
- タイムライン表示
- Calendar View 相当
- Scroll View 相当
- Techo取り込み
- テンプレート
- 過去タスクサジェスト
- GitHub等を保存先にして端末間同期
- PWA化 / iPhoneホーム画面対応

## 方針

元TaskLinerをそのままブラウザへコピーするのではなく、**「Markdownがデータ本体」「開始・終了を打刻しながら1日の流れを扱う」**という中心思想をHTML向けに再実装します。
