# 03 — Edit-flow polish (relabel, gating, flash)

Status: ready-for-agent

Part of `.scratch/edit-existing-response/spec.md`. Blocked by: 02.

## Scope

- Relabel the global toolbar button "Edit availability" → **"Add availability"** (it starts a new response).
- Submit gating: `disabled={!hasChanges}` (drop `!loadedFromMemory`, already gone after 01); `handleOpenSubmit` bails when `!hasChanges`.
- Success flash: state carries text instead of a boolean — `Updated {name}’s availability` when the save edited an existing response, `Saved` for a new response.
- Update helpers/tests that click "Edit availability" (`startEditAndMarkSlot` and friends).

## Done when

- Button reads "Add availability"; Submit disabled until a grid change.
- Flash text distinguishes edit vs new response (asserted in tests).
- `npm test`, `npx tsc -b`, `npm run lint` pass.
