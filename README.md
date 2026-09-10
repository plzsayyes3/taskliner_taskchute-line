# taskliner_taskchute-line

TaskLiner / taskchute-line の考え方を、Obsidian プラグインではなく **単体HTMLで動かす実験版**です。

## 現在の構成

- `taskliner_taskchute-line.html` — TaskLiner本体。HTML/CSS/JavaScriptを1ファイルに収録
- `index.html` — GitHub Pages 用の入口。TaskLiner本体を表示し、GitHub同期UIを重ねる
- `task-data` branch — GitHub同期用の既定データ保存ブランチ

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
- GitHub tokenを使ったMarkdownの読込 / 保存

## 保存方式

通常操作はブラウザの `localStorage` へ即時保存します。

GitHub同期を使う場合は、画面右下の `☁ GitHub` から接続し、日別MarkdownをGitHubへ保存できます。

既定値:

```text
Repository: plzsayyes3/taskliner_taskchute-line
Branch: task-data
Folder: data
```

保存先は次の形式です。

```text
data/YYYY-MM-DD.md
```

例:

```text
data/2026-09-10.md
```

`main` ではなく `task-data` branch へ保存するため、タスク保存のたびにGitHub Pagesを再デプロイしません。

### GitHub token

Fine-grained Personal Access Token を使用します。

必要権限:

```text
Repository access: 保存先repository
Contents: Read and write
```

TokenはHTMLやGitHubリポジトリには保存せず、ブラウザの `sessionStorage` のみに保持します。ブラウザのタブ/セッションを終了した後は再入力が必要になる場合があります。

### 公開範囲に注意

既定の `plzsayyes3/taskliner_taskchute-line` は public repository です。そのため、このrepositoryの `task-data` branchへ保存したタスクMarkdownも公開情報になります。

タスク内容を非公開にしたい場合は、GitHub同期画面の `Repository` を自分の private repository に変更してください。HTML側は任意の `owner/repo`、branch、folderを指定できます。

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

## GitHub同期の使い方

1. GitHubでFine-grained Personal Access Tokenを作る
2. Pagesを開く
3. 右下の `☁ GitHub` を押す
4. Tokenを入力する
5. `接続確認` を押す
6. 必要に応じて `GitHubから読込` または `GitHubへ保存` を使う

GitHub上のファイルが前回読込後に更新されていた場合は、上書き前に確認を出します。

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
- GitHub同期の自動化 / 競合解決強化
- PWA化 / iPhoneホーム画面対応

## 方針

元TaskLinerをそのままブラウザへコピーするのではなく、**「Markdownがデータ本体」「開始・終了を打刻しながら1日の流れを扱う」**という中心思想をHTML向けに再実装します。
