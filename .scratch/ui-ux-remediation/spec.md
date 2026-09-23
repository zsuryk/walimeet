# Spec: Walimeet UI/UX remediation — remaining work

Status: ready-for-agent

## Problem Statement

Walimeet's UI and UX accumulated many bad practices: broken touch/keyboard interaction on the core availability grid, native `alert()`/`confirm()` dialogs, missing accessibility semantics, light-only colors leaking into dark mode, duplicated button/input/card styling with drift, iOS focus-zooming inputs, data loss when leaving the create wizard, no indication of who created a poll, silent same-name response overwrites, and respondents landing on a marketing page with no way to open a link they already have.

Most of this was diagnosed by four parallel review agents and fixed in three shipped waves (all green on `tsc`, `oxlint`, `vite build`). Three decisions from the design grilling remain unimplemented, and one of them — invitee tracking — was explicitly abandoned and replaced with a simpler requirement. The team's context budget is nearly exhausted, so the remaining work is specified here for an agent to implement rather than executed inline.

## Solution

Finish the remediation in three remaining workstreams:

1. **Creator attribution** (replaces the abandoned invitee feature): the poll page shows who created the poll, e.g. “Created by Alice”, using the creator name already collected at creation and already persisted by the worker. No invitee list, no pending-names UI, no “who hasn’t responded” tracking — those concepts are removed from the product entirely.
2. **Name-collision prompt**: before overwriting an existing response under the same name, the submitting user is prompted — “A response already exists for this name. Overwrite it, or choose a different name.” — unless the response is provably their own (their remembered response for this poll), in which case the overwrite is silent. Two distinct people must never silently share one response; two same-name responses can never coexist.
3. **Full design-system sweep**: finish extracting shared UI primitives, swap every remaining hand-rolled SVG icon for `lucide-react`, and rename the `indigo-*` palette usage to the already-defined `brand-*` tokens app-wide, so the `@theme` block becomes the single source of truth for color.

Everything else decided during grilling is either already implemented (waves 1–3, including draft-restore with no leave-guard) or explicitly out of scope below.

## User Stories

### Creator attribution (replaces invitee feature)

1. As a poll participant, I want to see who created the poll on the poll page, so that I know who to contact with questions about the meeting.
2. As a poll participant, I want the creator’s name rendered as plain attribution text (e.g. “Created by Alice”) near the poll title/description, so that it reads as metadata rather than as an interactive control.
3. As a poll participant, I want attribution to appear on the poll page in view mode and while I am editing my availability, so that the page header never loses the creator context.
4. As a poll creator who left the “Your name” field blank, I want the poll to show the same anonymous fallback the rest of the product uses (“Anonymous”), so that attribution never renders as empty or “undefined”.
5. As a poll creator, I want my display name preserved exactly as I typed it (trimmed), so that attribution is faithful without inventing new identity logic.
6. As a user of the product, I want NO invitee-name textarea anywhere in the create flow, so that poll creation stays a three-step, no-account, fast flow.
7. As a user of the product, I want NO “N of M responded”, pending-name chips, or nudge-copy UI anywhere on the poll page, so that the abandoned invitee concept cannot partially resurface.
8. As a returning creator, I want attribution to work for polls created before this feature shipped (the creator name is already stored on every poll), so that no data migration is needed.

### Name-collision prompt

9. As a participant submitting a response, I want to be prompted if my entered name already has a response on this poll and it is not my remembered response, so that I never silently destroy another person’s availability.
10. As a participant, I want the prompt to offer two explicit choices — “Overwrite” and “Change name” — so that I can intentionally take over a name (e.g. I am the same Alex on a new device) or pick a different name without losing my edits.
11. As a participant who has responded on this device before, I want my subsequent submits under my remembered name to overwrite my own prior response silently, so that editing my availability never interrupts me with a pointless dialog.
12. As a participant choosing “Overwrite” in the prompt, I want my submitted availabilities to replace the existing response under that name, so that exactly one response exists per name.
13. As a participant choosing “Change name”, I want to be returned to the name field with my marked availabilities intact, so that renaming does not cost me my grid edits.
14. As a participant, I want the collision check to be case-insensitive and whitespace-tolerant (matching how the backend keys responses), so that “Alex”, “alex”, and " Alex " all resolve to the same identity.
15. As a participant, I want the collision prompt to appear inside the existing submit modal flow (or as an immediate continuation of it) rather than as a native browser dialog, so that the interaction stays styled, keyboard-accessible, and consistent with the rest of the app.
16. As a participant who is not colliding with anyone, I want the submit flow to proceed exactly as it does today — one modal, one confirm — so that the common path gains no extra step.
17. As a product user, I want name-keyed identity retained (no accounts, no per-person tokens), so that collision prompting is the complete solution until account login ships in the future.
18. As a screen-reader user, I want the collision prompt announced and focus-managed like the existing submit dialog, so that the new step is not an accessibility regression.

### Full design-system sweep (Q22a)

19. As a maintainer, I want every button across the app rendered by the shared Button primitive, so that variant/size/focus/disabled styling cannot drift between pages.
20. As a maintainer, I want every text input, select, and textarea rendered with the shared field/input classes (or Field wrapper), so that label association, focus rings, and text-base sizing are uniform.
21. As a maintainer, I want every card/panel surface rendered by the shared Card primitive, so that background, border, radius, and elevation stop diverging (including dark-mode separation).
22. As a user, I want all remaining hand-rolled SVG glyphs — theme toggle sun/moon, filter icon, and any others — replaced with `lucide-react` equivalents, so that stroke weight and sizing are consistent with the icons already migrated.
23. As a user, I want no functional emoji left in UI chrome, so that icons render predictably across platforms and dark mode.
24. As a maintainer, I want `indigo-*` utility usage renamed to the `brand-*` tokens already declared in `@theme`, so that the token block is the single source of truth and future rebranding is a token edit, not a codebase search.
25. As a maintainer, I want card and control radii to use the declared radius tokens where the sweep touches them, so that `rounded-card` / `rounded-control` mean the same thing everywhere.
26. As a user, I want the sweep to be behavior-preserving — no visual redesign beyond the palette rename and icon consistency — so that the remediation ships without re-litigating settled layout decisions.
27. As a developer, I want the sweep to leave zero remaining `indigo-` class tokens and zero direct `<svg>` icon markup outside the shared icon components, so that a grep can verify completion.

### Regression expectations (already shipped — must remain true)

28. As a mobile participant, I want pointer-event based drag-select with `touch-action` handling on the availability grid, so that touch users can mark availability.
29. As a keyboard participant, I want roving-tabindex grid cells with arrow navigation and Space/Enter toggling, so that the core interaction is keyboard-operable.
30. As a create-flow user, I want my in-progress poll draft restored after refresh or in-tab navigation with a “Start over” affordance, so that I never lose selections — and I want NO leave-confirmation nag on top of that (decision Q21: draft-only, no guard).
31. As a returning respondent, I want my name and prior availabilities preloaded when I enter edit mode, with a “Not you? Clear” escape hatch, so that repeat responses are one click.
32. As a create-flow user, I want step validation (required name, end-after-start time range, trimmed whitespace) with inline errors instead of silently disabled buttons or native alerts.
33. As any user, I want native `alert()`/`confirm()`/`prompt()` banned from the app, replaced by in-app banners, inline errors, or styled dialogs.

## Implementation Decisions

**Invitee feature abandoned (Q18–Q20 superseded).**
- There will be no logic where the host types invitee names. Do not build an invitee textarea, invitee array, step-4, pending list, responded-count, or nudge-copy feature.
- Replacement: display `creatorName` (already on the poll model, already written by the create endpoint, already returned by the GET poll endpoint) as attribution on the poll page — “Created by {creatorName}”.
- Worker/API: **no schema or endpoint changes** for attribution. The existing server-side fallback (`creatorName || 'Anonymous'`) is the fallback contract; the UI must also defend against empty/whitespace creator names.
- Placement decision: attribution sits in the poll header meta area (alongside date/time/timezone chips), small secondary text, not a link, not a button. Exact spacing follows existing header rhythm.

**Name-collision prompt (Q17a).**
- Identity remains name-keyed: response map key = lowercased trimmed name (matches current backend behavior). No stable IDs, no tokens, no account dependency.
- Pre-submit check (client-side; poll data is already loaded): compute `responseKey = name.trim().toLowerCase()`.
  - Key absent → proceed with submit as today (no new UI).
  - Key present AND equals the remembered response for this poll (localStorage `walimeet:mine:{pollId}` name, same normalization) → proceed silently (self-overwrite).
  - Key present AND not remembered → show collision prompt before issuing the PUT.
- Collision prompt copy (canonical): “A response already exists for this name.” with actions **Overwrite** and **Change name**.
  - Overwrite → proceed with the PUT under that key (backend overwrites as it does today; backend stays unchanged — last-write-wins races are accepted pre-accounts).
  - Change name → dismiss prompt, keep the modal open (or reopen it) with focus returned to the name input; availabilities untouched; user edits name and confirms again.
- UI home for the prompt: an inline second state of the existing submit modal (title/body swap + two actions), not a native dialog and not a third stacked dialog. The modal already owns focus trap, `role="dialog"`, Escape handling, and return-focus; extend that state machine rather than adding a new overlay component.
- State-machine sketch (decision-dense, from grilling — not a prototype):
  - `editing → submitModal(name entry) → (valid name)` → check collision → `notFound | selfOverwrite → submitting → done`
  - `… → collision → [Overwrite → submitting | Change name → submitModal(name entry, preserved availabilities)]`
- No backend 409/collision endpoint. The check is advisory-client-side; the prompt exists to prevent *silent* destruction, not to enforce exclusivity under concurrency.

**Leave-guard (Q21 accepted as implemented).**
- Draft-only: sessionStorage draft + restore banner + clear-on-success. No `beforeunload`, no in-app confirm on leaving Create. Do not re-add guards.

**Design-system sweep (Q22a — full sweep).**
- Scope of component extraction: every remaining button, input, select, textarea, and card surface across all pages and components (Calendar nav/day buttons, FilterButton trigger/apply/clear, SubmitModal buttons/input, ShareButton, TimeRangePicker controls, TimeGrid participant chips where they are buttons, loading/error states, Home/NotFound CTAs).
- Icon migration: ThemeToggle sun/moon and FilterButton filter glyph (any other hand-rolled SVGs found by grep) → `lucide-react` (already a dependency). No functional emoji remains in chrome (already true for Poll meta; verify Home/Create).
- Palette rename: global `indigo-*` → `brand-*` using the existing `@theme` ramp (`brand-50`…`brand-900` map 1:1 onto Tailwind’s indigo scale values already declared). Includes focus rings, selection fills, heatmap-adjacent UI chrome, hover states, and the `hsl`/`hsla` literals in the availability heatmap **only where they are brand-chrome**; the heatmap intensity ramp itself is an algorithmic color ramp (hue 231) — converting its `hsla(231, …)` literals to token references is optional and must preserve the exact rendered values (token-equivalent only, no visual change).
- Radius tokens: adopt `rounded-card` / `rounded-control` where the sweep already touches the class list; do not do a dedicated radius-only pass beyond that.
- Verification greps (definition of done): no `indigo-` in `src/`, no raw icon `<svg>` outside shared icon modules/lucide, no native dialog methods (`alert(`, `window.confirm`, `window.prompt`) in `src/`.
- Behavior preservation: this is a refactor. Existing tests/stories none; the guard is typecheck + lint + production build + manual smoke of the four routes.

**Modules touched (interfaces, not paths).**
- Poll page module: header attribution row; submit-flow state machine extended with collision state; consumption of the remember/localStorage helper for self-detection.
- Submit modal component: gains collision state (props/callbacks for overwrite vs rename paths), reuses existing dialog a11y contract (`role`, labelled title, focus trap, Escape, return-focus).
- Shared UI primitives module: Button, Field/input classes, Card — extended until all pages consume them; possibly a small Badge/Chip if the header meta needs one for attribution consistency (only if the sweep would otherwise hand-roll it).
- Icon layer: all glyphs resolve through `lucide-react`.
- Design tokens: `@theme` becomes the only palette source; utility usage renamed.
- Create flow, TimeGrid interaction, draft persistence, error taxonomy (`ApiError` kinds), worker validation: **unchanged** (already shipped).

**Already shipped (context for the implementing agent — do not rebuild).**
- Waves 1–3 in the working tree: pointer/keyboard TimeGrid with ARIA grid structure, indigo heat ramp, sticky time gutter, intensity legend; Create draft restore + validation + focus management; Poll skeleton loader, error kinds with retry, expiry chip, empty state, remembered-response preload, persistent edit toolbar with visible state badges, created-nudge (`?created=1`) with Share pulse; Home paste-link field; locale-aware week start, shift/drag calendar ranges, 15-minute time-range options, locale time labels; FOUC script, theme-color, skip link, route titles/focus, reduced motion, global focus-visible; worker input validation (time range, expiry days, JSON, trimmed names); `@theme` tokens and first-round Button/Field/Card adoption; `lucide-react` in Calendar/Poll/Create.

## Testing Decisions

- **What makes a good test:** assert external, user-visible behavior only — what is rendered and what the API layer is asked to do — never internal state, refs, or class names. A test should fail if the collision prompt disappears, if overwrite PUTs the wrong key, if attribution renders the wrong name, or if the silent self-overwrite path wrongly shows a dialog.
- **Single new seam (proposed and recorded for review): component-level tests of the Poll submit flow with the API module mocked.** This is the highest seam that exercises both remaining behavioral features (collision dialog + attribution) with one harness. Prior art: the repo has **no test infrastructure and no existing tests** — the seam necessarily includes introducing the runner (Vitest, matching the Vite stack) plus React Testing Library; no second seam (no unit-test layer under it, no e2e) is introduced.
- **Covered by that seam:**
  - Attribution: creator name rendered; anonymous/empty fallback; visible in view and edit modes.
  - Collision: fresh name → single confirm, PUT issued; colliding unremembered name → prompt shown, no PUT until choice; Overwrite → PUT issued; Change name → no PUT, name field editable, availabilities preserved; colliding remembered name → no prompt, PUT issued (silent self-overwrite); case/space normalization matches backend keying.
  - Regression sentinels for this flow: submit error renders inside the modal; no native dialogs invoked.
- **Not covered by unit/component tests:** the design-system sweep (pure refactor) — guarded by `tsc -b`, `oxlint`, `vite build`, the definition-of-done greps listed above, and a manual smoke of `/`, `/create`, `/poll/:id`, 404 in both color schemes.
- **Test style:** drive via user interactions (type name, click Confirm, click Overwrite); mock the API module at the import boundary to return canned poll fixtures; assert on roles/labels/text (`role="dialog"`, button names, attribution string), not selectors or internals.

## Out of Scope

- Account login / authentication of any kind (explicitly future; collision prompt is the interim solution).
- Stable per-person response IDs, response tokens, or per-person share links.
- Invitee lists, invitee entry UI, “N of M responded”, pending-name chips, nudge/reminder copy, or any who-hasn’t-responded tracking (abandoned per Q18).
- Backend collision detection (409), concurrency control, or changes to the name-keyed response map.
- Leave-confirmation guards on the create flow (explicitly rejected, Q21; draft restore already covers loss).
- Auto-save availability editing (rejected earlier in favor of the persistent Edit/Cancel/Submit toolbar, already shipped).
- `og:image` / social preview assets (deferred until brand assets exist).
- Loading skeletons outside the Poll page; Web Share beyond current behavior; paste-link analytics.
- Per-user 12h/24h preference (locale-following shipped; a stored toggle is not wanted).
- Week-start user setting (locale-driven shipped).
- README/wrangler documentation cleanup, unused `timezone.ts` helper removal, deep `availabilities` key validation in the worker.
- Visual redesign beyond palette rename + icon consistency (layout, copy tone, and information architecture are settled).

## Further Notes

- Waves 1–3 exist as **uncommitted working-tree changes** (20+ files). The implementing agent should commit or otherwise snapshot that baseline before starting this spec, so sweep refactors are diffable against shipped behavior.
- Grilling provenance: Q9 invitee tracking → superseded by Q18’s “show creator name instead”; Q17 collision → option (a); Q21 draft-only → accepted; Q22 sweep → option (a) full. All other Round-1 decisions were implemented in waves 1–3.
- The collision check intentionally duplicates the backend’s key normalization (`trim` + `toLowerCase`) on the client; if backend normalization ever changes, both sides must change together — note this adjacency in code review.
- `brand-*` and `indigo-*` token values are identical today (brand was defined as a 1:1 copy); the rename is semantic. Future palette changes edit only `@theme`.
