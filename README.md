# taskliner_taskchute-line

TaskLiner / taskchute-line の考え方を、Obsidian プラグインではなく **単体HTMLで動かす実験版**です。

## 現在の構成

- `index.html` — GitHub Pages の入口。TaskLiner本体を表示し、設定UIを重ねる
- `app.html` — TaskLinerのビュー・操作本体
- `taskliner_taskchute-line.html` — 直接アクセス時に `index.html` へ戻す互換入口
- GitHub同期の既定保存先 — `plzsayyes3/mynotebook` の `task-data` branch / `09_taskchute`

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
- `## 見出し` を使ったセクション表示
- セクション単位の非表示 / 再表示
- TaskLiner風Markdownへの書き出し
- Markdownからの取り込み
- `.md` ダウンロード
- GitHub tokenを使ったMarkdownの読込 / 保存

## セクション

Markdownのレベル2見出しをセクションとして扱います。

```md
## A
- [ ] タスク1
- [ ] タスク2

## B
- [ ] タスク3
```

画面では `A`、`B` の見出しごとにタスクを表示します。

各セクション見出しの `非表示` を押すと、**そのセクションの見出しとタスクをまとめてビューから隠します**。タスク自体は削除せず、MarkdownやGitHub保存内容にも残ります。

上部の `セクション` ボタンから、非表示にしたセクションを再表示できます。非表示状態はブラウザの `localStorage` に保存し、同名セクションでは日付を切り替えても設定を維持します。

## 設定

画面右下の **`⚙`** がHTML版TaskLinerの設定入口です。

現在は設定パネル内に `GitHub同期` を置いています。今後、表示・保存・同期などの設定もこの歯車へ集約します。

## 保存方式

通常操作はブラウザの `localStorage` へ即時保存します。

GitHub同期を使う場合は、画面右下の `⚙` を開き、`GitHub同期` から日別MarkdownをGitHubへ保存できます。

既定値:

```text
Repository: plzsayyes3/mynotebook
Branch: task-data
Folder: 09_taskchute
```

保存先は次の形式です。

```text
09_taskchute/YYYY-MM-DD.md
```

例:

```text
09_taskchute/2026-09-10.md
```

HTML本体を置く `plzsayyes3/taskliner_taskchute-line` の `main` と、タスクデータを置く `plzsayyes3/mynotebook` の `task-data` branch を分離しています。そのため、タスク保存のたびにGitHub Pagesを再デプロイしません。

### GitHub token

Fine-grained Personal Access Token を使用します。

必要権限:

```text
Repository access: plzsayyes3/mynotebook
Contents: Read and write
```

TokenはHTMLやGitHubリポジトリには保存せず、**このブラウザの `localStorage` に保存**します。そのため、ブラウザを閉じても次回アクセス時に再利用できます。

`Tokenを消去` を押すと、`localStorage` からTokenを削除します。

> Tokenを保存するブラウザは自分専用端末を前提とします。Fine-grained token は対象Repositoryだけに限定し、必要最小限の `Contents: Read and write` 権限にしてください。

### 公開範囲

HTML本体の `plzsayyes3/taskliner_taskchute-line` は public repository です。一方、既定のタスク保存先 `plzsayyes3/mynotebook` は private repository として運用し、タスクMarkdownをHTML本体の公開Repositoryへ保存しない構成にしています。

設定パネルでは任意の `owner/repo`、branch、folderを指定できます。保存先を変更する場合は、接続確認でpublic/privateとBranchの存在を確認してください。

## Markdown例

```md
## 午前
- [ ] タスク名
- [/] 実行中タスク 【09:00-】

## 午後
- [x] 完了タスク 【13:00-13:25 / 25m】
- [>] 保留タスク
```

見積時間はHTML版の `⏳25m` と、既存TaskLinerで使っている `(25m)` の両方を読み取ります。既存の `(25m)` を読み込んだ場合は、その表記を維持して書き戻します。

```md
- [ ] 新規タスク ⏳25m
- [ ] 既存タスク (25m)
```

### 既存Markdownの保持

`mynotebook/task-data/09_taskchute` の既存MarkdownをHTML版で扱っても、タスクとして解釈しない行を捨てないようにしています。

保持対象には、次のような内容を含みます。

- `# YYYY-MM-DD` などのレベル1見出し
- AIアドバイスや通常のMarkdown本文
- 空のセクション見出し
- タスク直下のインデントされた子メモ
- 空行やその他の非タスク行

チェックボックスのないトップレベルの箇条書きもタスクとして読み取ります。未操作のまま書き戻す場合は、チェックボックスなしの表記を維持します。

```md
- 20:00-21:00 予定
```

また、時刻を持たない完了タスクは完了状態として扱いつつ、存在しない `00:00-00:00` を補わず、そのまま保持します。

```md
- [x] 発育測定
```

## GitHub同期の使い方

1. GitHubでFine-grained Personal Access Tokenを作る
2. Pagesを開く
3. 右下の `⚙` を押して設定を開く
4. `GitHub同期` のToken欄へ入力する
5. `接続確認` を押す
6. 必要に応じて `GitHubから読込` または `GitHubへ保存` を使う

入力したTokenは `localStorage` に保存され、次回アクセス時に復元されます。

接続確認ではRepositoryだけでなく、指定Branchの存在とprivate/publicも確認します。

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
