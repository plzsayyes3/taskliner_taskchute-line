# Task Master / Repeat Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe Web beta for Task Master, Repeat, Daily Instance generation, suggestions, and review without changing production Daily Markdown behavior.

**Architecture:** Keep schedule/model logic in a pure `template-core.js` module with Node tests. Add an isolated `templates.html` UI that uses the existing browser GitHub configuration to persist individual Markdown records under `09_taskchute/templates`. Keep the existing TaskLiner page and `all day.md` unchanged.

**Tech Stack:** Browser JavaScript, GitHub Contents API, Node 22 built-in test runner, Markdown/YAML-frontmatter records.

**Spec:** `docs/superpowers/specs/2026-09-17-task-master-repeat-design.md`

## Global Constraints

- Production Daily Markdown is not modified by the beta.
- Existing `09_taskchute/templates/all day.md` is preserved.
- Similar Masters are never auto-merged.
- Repeat generation is button-triggered and idempotent while an instance exists.
- Deleting an instance permits regeneration.

---

### Task 1: Template domain core

**Files:**
- Create: `template-core.js`
- Create: `template-core.test.js`

- [x] Write failing tests for title/alias matching, suggestions, six repeat rules, multiple repeats per Master, idempotency, regeneration, estimate inheritance, hidden metadata, and Markdown record parsing.
- [x] Run `node --test template-core.test.js` and confirm RED before implementation.
- [x] Implement the minimum pure domain logic.
- [x] Run `node --test template-core.test.js` and confirm all tests pass.

### Task 2: Templates beta UI

**Files:**
- Create: `templates.html`

- [x] Add a Quick Add prototype whose suggestions update on each `input` event.
- [x] Reuse exact title/alias Masters and create new Masters otherwise.
- [x] Persist new Masters and pending review records under the configured `09_taskchute/templates` directory.
- [x] Add Repeat creation for all supported rule types.
- [x] Add date-based generation preview, duplicate prevention, deletion, and regeneration.
- [x] Render the hidden metadata Markdown that future Daily integration will use.
- [x] Syntax-check the page script.

### Task 3: Template storage documentation

**Files:**
- Create: `mynotebook/09_taskchute/templates/README.md`

- [x] Document the beta folders and record format while preserving `all day.md`.

### Task 4: Verification

- [x] Re-run `node --test template-core.test.js`.
- [x] Re-run JavaScript syntax checks.
- [x] Confirm repository HEAD has not moved before publishing beta files.
