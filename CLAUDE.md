# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

### Type Safety & Explicitness

- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types

### Modern JavaScript/TypeScript

- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

---

## Agent skills

### Issue tracker

Issues live in Linear (team: odiniy) via the Linear MCP. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Issue readiness

Never apply `ready-for-agent` to an implementation issue until an ATDD plan has been attached to that issue. Newly created implementation issues that still need acceptance-test planning must use `needs-atdd`, not `ready-for-agent`. After the ATDD plan is attached with the repo's ATDD planning skill (`plan-atdd-to-issues` / `atdd-plan-for-issue`), the issue can be promoted to `ready-for-agent`.

### Backlog drain

Use the `drain-ready-issues` skill, or the `/drain-ready-queue` shortcut when available, to sequentially complete eligible Linear `ready-for-agent` issues. It composes `take-next-issue`, `execute-ready-issue`, PR merge, Linear `Done`, and the next issue handoff. For fresh context per issue, use an external runner that launches a new agent process/session per issue and invokes `/drain-ready-queue RUN_CONTEXT=local WORKSPACE_MODE=same-thread MERGE=true MAX_ISSUES=1`. Do not continue into another issue in the same session when `MAX_ISSUES=1`; the runner parses the final sentinel to decide whether to continue. The runner does not select issues. `take-next-issue` remains the only issue selector. In Conductor, call `/drain-ready-queue RUN_CONTEXT=conductor WORKSPACE_MODE=per-issue`; workspace-per-issue is preferred only when the host actually supports programmatic workspace creation. If unavailable, stop with `DRAIN_ABORT` rather than asking the user to manually create a workspace. In normal local sessions, refresh with `git checkout main` and `git pull origin main`. Stop on human-only issues, missing ATDD, blocked work, failed checks, unmergeable PRs, dirty unrelated work, or unavailable Conductor workspace creation.

### Domain docs

Multi-context repo — CONTEXT-MAP.md at root points to per-context CONTEXT.md files. See `docs/agents/domain.md`.

---

## Required quality gates

For database integration tests, run `pnpm test:integration:podman` instead of `pnpm test:integration`. The local development environment uses Podman, and the Podman script configures Testcontainers correctly for the ephemeral PostgreSQL database.

If the change is user-facing, the agent must also run the highest-practical smoke/e2e check:
- UI: Chrome DevTools MCP happy path against the running app when available. If Chrome DevTools MCP is unavailable, fall back to Playwright/browser automation MCP. This means external browser automation tooling by default, not the repo's Playwright test suite, unless the issue or `### Required commands` explicitly calls for project Playwright tests.
- Backend: HTTP against running service with real test DB

Do not chase coverage percentage.
Coverage is not a goal.
Behavioral confidence is the goal.
