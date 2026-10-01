# Creator powers (deferred — blocked on login)

Status: needs-info

Deferred: to be implemented **after the login feature**. Tracked here so it does not rot in prose (cf. `.scratch/walimeet/spec.md` "Poll editing by creator").

## Intended scope (settled during edit-existing grilling, 2026-10)

1. **Creator key** issued at poll creation, returned once, kept client-side — `creatorName` stays display-only until login exists as the real credential.
2. **Delete a participant's response** (hard delete: frees the name immediately; no tombstone).
3. **Rename a response** — only if still wanted once delete exists.

## Explicitly not decided

- Where the creator delete control lives in the UI.
- Behaviour for polls created *before* the key existed (likely: no creator powers, forever).
- Interaction with login (maybe login supersedes the creator key entirely).

Do not start until the login feature lands.
