# taskliner_taskchute-line

TaskLiner / taskchute-line の考え方を、Obsidian プラグインではなく **単体HTMLで動かす実験版**です。

## 現在の構成

- `index.html` — GitHub Pages の入口。TaskLiner本体を表示し、設定UIを重ねる
- `app.html` — TaskLinerのビュー・操作本体
- `taskliner_taskchute-line.html` — 直接アクセス時に `index.html` へ戻す互換入口
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

TokenはHTMLやGitHubリポジトリには保存せず、**このブラウザの `localStorage` に保存**します。そのため、ブラウザを閉じても次回アクセス時に再利用できます。

`Tokenを消去` を押すと、`localStorage` からTokenを削除します。

> Tokenを保存するブラウザは自分専用端末を前提とします。Fine-grained token は対象Repositoryだけに限定し、必要最小限の `Contents: Read and write` 権限にしてください。

### 公開範囲に注意

既定の `plzsayyes3/taskliner_taskchute-line` は public repository です。そのため、このrepositoryの `task-data` branchへ保存したタスクMarkdownも公開情報になります。

タスク内容を非公開にしたい場合は、設定パネルのGitHub同期にある `Repository` を自分の private repository に変更してください。HTML側は任意の `owner/repo`、branch、folderを指定できます。

## Markdown例

```md
## 午前
- [ ] タスク名
- [/] 実行中タスク 【09:00-】

## 午後
- [x] 完了タスク 【13:00-13:25 / 25m】
- [>] 保留タスク
```

見積時間を入力した場合は、HTML版では次のように保持します。

```md
- [ ] タスク名 ⏳25m
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
