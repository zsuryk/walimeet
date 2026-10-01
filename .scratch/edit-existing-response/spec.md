# Spec: Edit existing response

Status: implemented

## Problem

Availability responses can currently only be *replaced*: the collision prompt offers "Overwrite", and the only way to reach your prior response from another machine is to retype your name and overwrite it blindly. The localStorage "remembered response" (`walimeet:mine:{pollId}`) restores slots only on the same browser, so cross-machine editing starts from zero and encourages destructive overwrite.

## Goal

Exactly two write paths, no third:

1. **Add a new response** — for names not yet in the poll.
2. **Edit an existing response** — load the response from the server, adjust, submit.

No overwrite path in the UI. Frontend-only change: `PUT /api/poll/:id/respond` already upserts by name and is untouched. Zero migration; existing polls and in-flight KV data are unaffected.

## Settled design decisions (from grilling)

- **Identity = name.** The share link is the capability: anyone with the link may edit anyone's response. No tokens, no accounts. (Creator credentials and delete are deferred to `.scratch/creator-powers/`.)
- **Pencil icon per participant chip** (in the "Participants" list above the grid) enters edit mode with that response's availability loaded onto the grid. Muted by default, brightens on hover/focus; always visible (works on touch).
- **Name is locked during an edit of an existing response** — shown as a label ("Updating **Bob**'s availability"), not an input. Renaming is not an operation; re-entering = edit, clear, submit.
- **Collision prompt** (add-new flow, name already taken) offers **Change name** / **Edit existing**. "Overwrite" is removed. "Edit existing" loads that response into edit mode (same as the pencil, reached by typing a name). Choosing it explicitly abandons the new-response draft — no extra confirm.
- **Global toolbar button** is relabelled **"Add availability"** (it starts a *new* response); pencil/edit-existing handles *existing* responses. Before this change it read "Edit availability", which is ambiguous next to per-row pencils.
- **SubmitModal in edit-existing mode** is a read-only confirmation step: title "Update availability", body "Updating **{name}**'s availability.", no name field, buttons Discard changes / Confirm & Submit.
- **Dirty-state guard is shared**: Cancel, and clicking another participant's pencil while unsaved changes exist, both show the existing "Discard changes?" confirm banner. The banner's Discard proceeds with the pending action (exit *or* load the newly selected response).
- **Submit requires `hasChanges`** — the `loadedFromMemory` exemption ("Submit enabled with no changes") is removed along with localStorage. Clearing the form is a change, so "clear + resubmit = full replacement" still works.
- **Success flash**: `Updated {name}’s availability` when the save came from editing an existing response; plain `Saved` for a new response.
- **localStorage remember removed entirely**: `src/lib/remember.ts` deleted; the "Loaded your saved response" badge, "Not you? Clear" button, and the silent self-overwrite branch in `handleConfirmSubmit` all go. The server copy is the single source of truth.

## Files touched

| File | Change |
|---|---|
| `src/lib/remember.ts` | delete |
| `src/pages/Poll.tsx` | remove remember/`loadedFromMemory`; pencil handler + pending-edit guard; edit-target state; flash text; Submit gating; relabel button; pass new modal props |
| `src/components/SubmitModal.tsx` | collision prompt: "Edit existing" replaces "Overwrite"; read-only locked-name confirmation mode |
| `src/components/TimeGrid.tsx` | pencil button beside each participant chip; `onEditParticipant` prop |
| `src/test/Poll.test.tsx` | drop overwrite/remember tests; add pencil, edit-existing, guard, flash, gating tests; relabel helper |

Worker (`worker/`) intentionally untouched.

## Non-goals / deferred

- Creator credentials, creator delete of a response, rename → `.scratch/creator-powers/` (blocked on login feature).
- Server-side ownership enforcement (contradicts the link-is-capability model above).

## Acceptance

- No UI path silently replaces an existing response: every write to an existing name goes through a visible edit flow that started from the server's copy.
- From a fresh browser with only the poll link, a participant can click the pencil on their row, adjust, and save.
- Colliding name in the add-new flow offers only Change name / Edit existing; no Overwrite button exists anywhere.
- Cancel / pencil-switch with unsaved changes always confirms first.
- Submit is disabled until the grid has been changed.
- `npm test`, `npx tsc -b`, `npm run lint` all pass.
