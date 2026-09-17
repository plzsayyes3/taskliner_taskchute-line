# TaskLiner Task Master / Repeat / Daily Instance Design

## Scope

This design adds a new template layer to TaskLiner without changing the existing daily Markdown execution log yet. The Web App is the first implementation target. The existing `09_taskchute/templates/all day.md` remains untouched during the beta.

## Model

### Task Master

A Task Master represents the identity of a task, not a schedule. All tasks can have a Master, including one-off tasks. New task additions create a Master by default unless the title exactly matches an existing Master title or confirmed alias.

Master fields for the beta:

- immutable `id`
- canonical `title`
- `aliases`
- `status`: `active` or `archived`
- default `estimate`

The Master does not store section, planned time, execution history, or execution memo. Execution history is derived from Daily Instances.

### Repeat

A Master can have zero or more Repeats. Repeat owns scheduling context:

- immutable `id`
- `master_id`
- `status`
- repeat rule
- `section`
- `planned_at`
- optional estimate override

Supported rules: daily, weekday set, weekly, biweekly, nth weekday, month end. Biweekly requires an anchor date.

Editing Repeat does not modify existing Daily Instances.

### Daily Instance

Daily Instance is an execution snapshot. It keeps the title and estimate that were used on that day, and may later store hidden metadata in its Markdown line:

`<!-- tl:master=... repeat=... planned=... -->`

Task execution memo belongs only to the Daily Instance. Master and Repeat do not own memo.

## Generation

Repeat generation happens only when the user presses a generate button. Generation is idempotent for an existing `repeat_id` on the same day. If the generated instance is deleted, pressing generate again creates it again.

A single Master may generate multiple instances in one day via different Repeat IDs, such as morning and evening tooth brushing.

Section is the coarse time block. `planned_at` is a hidden ordering axis, not a strict appointment time.

## Master matching and review

Exact title or confirmed alias matches reuse the Master. Similar-but-not-exact text never auto-merges. A new Master is created and a review candidate is stored for later manual confirmation.

Review happens later in the Templates area; task execution is never blocked by review.

## Storage

Use the existing `mynotebook/09_taskchute/templates` directory.

- `templates/masters/<master_id>.md` — one Markdown file per Master
- `templates/repeats/<repeat_id>.md` — one Markdown file per Repeat
- `templates/review/<review_id>.md` — pending similarity/merge review
- existing `templates/all day.md` — retained during migration

The beta uses human-readable YAML frontmatter Markdown rather than a single JSON registry.

## Web beta

The beta exposes an isolated `templates.html` surface. It can:

- read Master and Repeat Markdown from GitHub using the existing TaskLiner GitHub config/token
- create Master files
- show suggestions on every input event, including the first character
- create Repeat files
- preview repeat generation for a selected date
- prevent duplicate repeat generation while an instance exists
- regenerate after the preview instance is deleted
- show the future Daily hidden metadata line
- record similarity candidates under `templates/review`

The beta does not yet write generated Daily Instances into the production daily Markdown. That integration follows after this model is validated.
