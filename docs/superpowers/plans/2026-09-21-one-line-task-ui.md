# TaskLiner 1行タスクUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TaskLinerの通常タスクを1行で表示し、選択中のタスクだけ2行目に選択済み操作を表示できるUIへ変更する。

**Architecture:** 操作キー、表示文字、初期表示設定を小さな純粋JavaScriptモジュールへ切り出す。`app.html`は既存のタスク操作関数を維持し、行選択・表示設定・操作レールの表示だけを新モジュールへ接続する。設定は既存のDailyデータやGitHub同期とは独立したlocalStorageキーに保存する。

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js built-in test runner, existing iframe/srcdoc UI, localStorage.

**Spec:** `docs/superpowers/specs/2026-09-21-one-line-task-ui-design.md`

## Global Constraints

- 通常行は1行、選択行だけ2行に展開する。
- 表示文字は暫定UIであり、操作キーと表示文字を分離する。
- Repeatは薄い`↻`のみ表示し、Daily Markdownや同期データ形式は変更しない。
- 既存の開始・終了・時刻指定・保留・翌日・並べ替え・削除の動作を維持する。
- 操作ボタンには`title`と`aria-label`を付ける。

## Review Focus

- 未保存の設定値や壊れたlocalStorage値でも初期設定へ安全に戻ること — Task 1の設定パーサーテスト。
- 選択行を切り替えたとき、前の行が1行へ戻り新しい行だけが2行になること — Task 2のDOM状態テスト。
- 操作設定で非表示にした操作が行内にもメニューにも残らないこと — Task 2の表示フィルターテスト。
- タスクが完了・実行中・保留でも行レイアウトと既存操作が壊れないこと — Task 2の状態別UIテスト。
- Repeat表記が通常行の主張を強めず、既存のRepeat情報を失わないこと — Task 3の表示回帰テスト。

### Task 1: 操作表示設定モジュール

**Files:**
- Create: `task-ui-actions.js`
- Create: `task-ui-actions.test.js`

**Interfaces:**
- Produces `TaskLinerTaskUIActions.keys`: ordered action definitions with `key`, `label`, `title`, and `defaultVisible`.
- Produces `TaskLinerTaskUIActions.defaults()` returning the default visible-key array.
- Produces `TaskLinerTaskUIActions.load(storage)` returning a validated visible-key array.
- Produces `TaskLinerTaskUIActions.save(storage, keys)` persisting only supported keys.

- [ ] **Step 1: Write the failing tests**

Add tests for `defaults()`, invalid localStorage fallback, filtering unknown keys, preserving configured order, and the exact mapping for `済`, `始`, `終`, `時`, `保`, `翌`, `上`, `下`, `削`, `…`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test task-ui-actions.test.js`

Expected: FAIL because `task-ui-actions.js` does not yet exist.

- [ ] **Step 3: Write the minimal implementation**

Implement the module with a single storage key, JSON validation, supported-key filtering, and a default list containing only the low-noise daily actions. Export the same API through CommonJS and `window.TaskLinerTaskUIActions`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test task-ui-actions.test.js`

Expected: all configuration tests pass.

- [ ] **Step 5: Commit**

Run: `git add task-ui-actions.js task-ui-actions.test.js && git commit -m "Add configurable task row actions"`

### Task 2: 1行・選択時2行の本体UI

**Files:**
- Modify: `app.html` task row CSS, `createTaskRow`, render state, and settings event wiring.
- Modify: `ui-syntax.test.js` static/runtime assertions for the new UI hooks.
- Test: `task-ui-actions.test.js` for pure display filtering helpers if extracted.

**Interfaces:**
- Consumes `TaskLinerTaskUIActions.load(localStorage)` and its ordered action definitions.
- Uses existing functions `startTask`, `endTask`, `startTaskAt`, `endTaskAt`, `deferTask`, `moveTomorrow`, `moveTask`, and `deleteTask` without changing their persistence behavior.
- Produces one selected-task state at a time and renders the selected row's action rail in a second grid row.

- [ ] **Step 1: Write the failing tests**

Add assertions for the selected-task state model: selecting `task-a` returns `task-a`, selecting `task-b` replaces it, and filtering with a configured key list returns only enabled action definitions. Add a UI syntax assertion that `app.html` contains the selected-row and action-settings hooks.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test task-ui-actions.test.js ui-syntax.test.js`

Expected: the new selected-state and hook assertions fail against the current `app.html`.

- [ ] **Step 3: Implement the minimal UI integration**

Load `task-ui-actions.js` before the app runtime. Add a single `selectedTaskId` state, add `data-task-id`/selected classes to task rows, and make row selection render exactly one expanded row. Move the existing task action callbacks into the selected row's second grid line, filtering them through the saved visible-key list. Add a settings sheet/menu that toggles keys and saves them to localStorage. Keep the existing task buttons and storage calls as the action implementations.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test task-ui-actions.test.js ui-syntax.test.js template-core.test.js daily-integration.test.js techo-import.test.js`

Expected: all tests pass with no syntax errors.

- [ ] **Step 5: Commit**

Run: `git add app.html ui-syntax.test.js task-ui-actions.js task-ui-actions.test.js && git commit -m "Render task actions in selected row"`

### Task 3: Repeat表示を弱める

**Files:**
- Modify: `app.html` Repeat metadata rendering.
- Modify: `ui-syntax.test.js` or `task-ui-actions.test.js` with a regression assertion for the muted repeat marker.

**Interfaces:**
- Consumes the existing repeat flag/state already present in each task.
- Produces a muted `↻` marker with an accessible label such as `繰り返し`; no Repeat data is removed.

- [ ] **Step 1: Write the failing regression test**

Assert that the app source uses a dedicated repeat marker with accessible text and does not render the prominent literal `↻ Repeat` label.

- [ ] **Step 2: Run the regression test to verify it fails**

Run: `node --test ui-syntax.test.js`

Expected: the old Repeat label assertion fails before the rendering change.

- [ ] **Step 3: Implement the minimal rendering change**

Render the marker in the low-contrast metadata style used by the design sample. Keep the marker's semantic label available to assistive technology and tooltips.

- [ ] **Step 4: Run the full test suite**

Run: `node --test template-core.test.js daily-integration.test.js techo-import.test.js ui-syntax.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run: `git add app.html ui-syntax.test.js && git commit -m "Tone down repeat metadata in task rows"`

### Task 4: Browser verification and delivery

**Files:**
- Modify: none unless verification finds a regression.

- [ ] **Step 1: Run the complete local test command**

Run: `node --test`

Expected: every repository test passes.

- [ ] **Step 2: Verify the branch and diff**

Run: `git status --short`, `git log --oneline -5`, and `git diff main...HEAD --stat`.

Expected: only the one-line UI implementation, tests, and design artifacts are present on `design/one-line-task-ui`.

- [ ] **Step 3: Open the branch build in a browser**

Use the existing local HTTP preview and verify: ordinary rows are one line, selecting a row expands only that row, changing settings persists after reload, and Repeat appears only as a muted marker.

- [ ] **Step 4: Push the branch for review**

Run: `git push -u origin design/one-line-task-ui`

Expected: the branch is available remotely without modifying `main`.

- [ ] **Step 5: Commit any verification-only corrections**

If browser verification finds a real defect, add a focused test first, fix the defect, run the full suite again, and commit the correction before reporting the branch as ready.
