# 01 — Remove the overwrite path and localStorage remember

Status: ready-for-agent

Part of `.scratch/edit-existing-response/spec.md`.

## Scope

- Delete `src/lib/remember.ts` and its imports in `src/pages/Poll.tsx`.
- Remove `loadedFromMemory` state, the "Loaded your saved response" badge, and the "Not you? Clear" button.
- Remove the silent self-overwrite branch in `handleConfirmSubmit` (the `rememberedKey` comparison) — every colliding name now hits the collision prompt.
- Remove the **Overwrite** button from the collision prompt in `src/components/SubmitModal.tsx`, leaving only **Change name** for now (issue 02 adds "Edit existing").
- Remove `saveRememberedResponse` from `performSubmit`.
- Delete the remember-related tests in `src/test/Poll.test.tsx` (notably "overwrites silently when the colliding name is the remembered response").

## Done when

- `rg "remember|walimeet:mine|loadedFromMemory|Overwrite" src/` returns nothing.
- Colliding name always shows the prompt; no PUT happens without an explicit choice.
