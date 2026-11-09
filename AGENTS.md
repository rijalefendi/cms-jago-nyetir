# Frontend agent instructions

These instructions apply to the frontend in this workspace: `src/`, `public/`, `dashboard.html`, `index.html`, `design.md`, and frontend tests in `tests/`. The backend lives in the separate `be-jago-nyetir` repository.

## Work efficiently

- Inspect only the files and `design.md` sections relevant to the request. Reuse what you have already read in the current task; do not repeatedly scan the whole repository or paste large files into the conversation.
- Keep changes focused. Do not redesign nearby screens or add abstractions, dependencies, tests, or documentation without a concrete need.
- Prefer concise command output. If a check fails, inspect the relevant error and rerun that check after the fix. Do not repeat passing checks without a code change or a new reason.
- Report which checks ran, their results, and any important check you did not run. Do not claim UI behavior was verified from code inspection alone.

## UI and UX changes

- Before changing layout, styling, copy, navigation, forms, or interaction, read the relevant parts of `design.md`. Use it as the product and visual reference; read only the sections needed for the change.
- `design.md` says the current `src/style.css` is authoritative where the document and implementation differ. Inspect the affected existing component and CSS before changing a visual pattern. Flag a meaningful conflict instead of silently inventing a third pattern.
- Preserve the compact operations dashboard, Indonesian interface copy, responsive behavior, keyboard access, visible status text, and clear distinction between demo and live data described in `design.md`.
- Reuse existing components and styles when practical. Update `design.md` only when an intentional design decision changes the reference, not for every implementation detail.

## Test selection and frequency

Choose checks from the changed behavior, not from habit. Run a check once after a coherent change; rerun it after a relevant fix or when its first result is inconclusive. Stop when the relevant checks pass and no concrete risk remains.

| Change | Minimum relevant verification |
| --- | --- |
| Documentation or comments only | Review the diff; no automated test or browser run needed. |
| TypeScript or React logic without a visible behavior change | `npm run typecheck`; run `npm test` if the change affects logic covered by the unit tests. |
| Data formatting, sorting, pagination, or demo state | Run the relevant unit test (`tests/instructorTable.test.mjs` or `tests/demoStore.test.mjs`); add `npm run typecheck` when TypeScript changed. |
| Visible UI behavior, forms, navigation, or live/demo switching | `npm run typecheck` and the relevant UI check. Use `npm run test:ui` when both UI scripts are relevant; otherwise run the applicable script with its required setup. |
| Styling, layout, responsive behavior, or accessibility presentation | Inspect the affected screen at the relevant viewport or interaction state once after implementation. Run automated UI checks if the changed behavior is covered by them. |
| Build configuration or production bundling | `npm run build`. |

- `npm run test:ui` bundles the frontend and runs both `tests/ui-smoke.mjs` and `tests/live-instructor-ui.mjs`. Avoid it for unrelated changes. `tests/ui-smoke.mjs` reads `dist/qa.js`, so generate a fresh bundle before running it alone. `tests/live-instructor-ui.mjs` creates its own bundle.
- Use browser screenshots only when visual evidence is needed. Limit captures to affected screens, viewports, and states; avoid repeated full-page tours. If a visual defect is found, fix it and recheck that specific state.
- Broaden testing when a failure, shared component change, regression risk, or user request gives a concrete reason. Before delivery, run any checks required by the task or repository workflow even if they exceed the minimum above.
