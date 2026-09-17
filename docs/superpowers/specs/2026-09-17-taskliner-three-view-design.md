# TaskLiner Three-View Design

## Goal

TaskLiner Web を Today / Master / Repeat の3ビューに分け、Task Master / Repeat / Daily Instance の3層モデルを日常運用へ接続する。

## Navigation

同一アプリ内に `Today | Master | Repeat` の常設ナビゲーションを置く。URL query `view=today|master|repeat` を使い、必要に応じて `id=<master_id|repeat_id>` で詳細を直接開く。

## Today

既存TaskLinerの実行画面を維持する。

- QUICK ADD は Master のメモリ索引から1文字入力ごとに最大3件サジェストする。
- サジェスト取得時に GitHub API や全Daily履歴を走査しない。
- 候補選択時は Master の標準見積をQUICK ADDの見積欄へコピーする。
- QUICK ADD からMaster候補を選んでも Repeat とは無関係な単発Daily Instanceとして追加する。
- 候補を選ばず追加した場合は、title/alias完全一致のMasterがあれば再利用し、なければMasterを自動生成する。
- 類似Masterは自動統合せずReview候補とする。
- Todayに「Repeatから今日分を生成」を置く。
- Repeat由来Dailyには見える小さなRepeatバッジを表示し、押すと `repeat_id` でRepeat詳細へ直接遷移する。
- Repeat生成時は、同Section内で `planned_at` ありを時刻順、`planned_at` なしを後ろへ置く。

## Master

一覧には以下を表示する。

- title
- aliases の有無
- 標準estimate
- active / archived
- Repeat本数

標準並び順は最近使った順。期間フィルタは初期実装では持たず、全Daily走査を避ける。検索はtitle/aliasesを対象にローカルメモリ索引で即時絞り込みする。

詳細では title / aliases / estimate / status を編集し、紐づくRepeat一覧を表示する。新規Masterの手動作成を許可する。Review入口を置き、類似候補について「統合 / 別物 / 後で見る」を選べるようにする。

## Repeat

一覧には以下を表示する。

- Master title
- repeat rule
- section
- planned_at
- estimate override の有無
- active / inactive

標準並び順は planned_at。フィルタは all / active / inactive / weekday。

新規作成は Master選択 → rule → section → planned_at → optional estimate override の順。Master選択はローカル索引からサジェストする。

Repeat編集は既存Daily Instanceへ反映しない。画面に「この変更は今後生成するDailyにだけ反映されます」と明示する。

Repeat画面にも「今日分を生成」を置く。

## Storage

既存 `09_taskchute/templates/all day.md` は変更しない。

- `09_taskchute/templates/masters/<master_id>.md`
- `09_taskchute/templates/repeats/<repeat_id>.md`
- `09_taskchute/templates/review/<review_id>.md`

Daily Instance は visible task line を維持し、machine metadata はHTML commentで持つ。

Example:

```md
- [ ] 歯を磨く (5m) <!-- tl:master=task_xxx repeat=repeat_xxx planned=07%3A15 -->
```

hidden metadata が消えていても通常Taskとして成立させる。childLinesはDailyだけに残し、Master / Repeatには持たせない。

## Performance

- Master / Repeat はページ起動時に軽い索引を一度だけロードし、入力時はメモリ検索のみ。
- QUICK ADDサジェストは最大3件。
- Daily履歴の全走査を通常UI操作では行わない。
- IDから詳細へ直接遷移し、再検索を避ける。

## Repeat generation

- user button press only
- active repeat only
- same date + same repeat_id already present => skip
- deleted Daily Instance => can be regenerated
- one Master may have multiple Repeat rules on the same date
- planned_at affects initial order only
- editing Repeat never mutates existing Daily Instance
