# 02 — Edit an existing response (pencil + Edit existing)

Status: ready-for-agent

Part of `.scratch/edit-existing-response/spec.md`. Blocked by: 01.

## Scope

- `src/components/TimeGrid.tsx`: pencil icon button beside each participant chip (always visible, muted, brightens on hover/focus), `onEditParticipant?: (key: string) => void` prop, `aria-label="Edit {name}"`. Keep the chip itself a separate button (no button-inside-button).
- `src/pages/Poll.tsx`:
  - `editTargetKey` state (lowercased response key) set when editing an existing response, cleared on exit/after submit.
  - Pencil handler loads `poll.responses[key]` into `myAvailabilities` + `participantName`, enters edit mode, `hasChanges = false`. If already editing with unsaved changes, route through the existing "Discard changes?" banner with the target stashed as the pending action; Discard loads it, "Keep editing" clears it.
  - Collision prompt's **Edit existing** loads that response the same way and closes the modal (explicit choice — no discard confirm; the new-response draft is abandoned).
  - `handleConfirmSubmit` skips the collision check when `editTargetKey` is set (we are updating that exact key).
- `src/components/SubmitModal.tsx`: replace Overwrite with **Edit existing** (primary); add `editingName?: string | null` read-only mode — title "Update availability", body "Updating **{name}**'s availability.", no name field, Discard changes / Confirm & Submit buttons.

## Done when

- Pencil on a response row loads that response; adjusting and submitting PUTs under that name.
- Typing an existing name → prompt offers Change name / Edit existing only.
- Tests: pencil loads + submits; "Edit existing" loads and submits; no Overwrite button anywhere.
