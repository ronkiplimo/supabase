---
name: code-review
description: Run a structured code review on the current branch's changes. Use when asked to "review my code", "review my changes", "check my PR", "run a code review", or "review this branch". Covers formatting, type safety, duplication, readability, test coverage, and comment quality. Always use this skill when the user wants a code review — don't just eyeball it.
---

# Studio Code Review

Perform a thorough code review on the changed files in the current branch. Work through each check below in order, fixing issues as you find them rather than just reporting them.

## Review Checklist

### 1. Prettier + TypeScript

Run formatting and type checks on the changed files only.

> **Worktree note:** The `.bin` shell scripts fail silently in git worktrees. Use the node binary directly:

```bash
# From apps/studio (or whichever app the changed files belong to)
node node_modules/.bin/prettier.cjs --check <changed files>

# TypeScript from repo root
npx tsc --noEmit
```

Fix any Prettier violations. Report TypeScript errors — if they're in code you touched, fix them.

### 2. No Type Assertions

Search for type assertions (`as any`, `as SomeType`, `!` non-null assertions) in the changed files. These silence the type system instead of satisfying it.

When you find one, ask: *why does this assertion exist?* The right fix is usually one of:
- Validate the value at runtime (zod works well for external data) and let TypeScript infer the narrowed type
- Fix the upstream type so the assertion isn't needed
- Use a proper type guard

Avoid mechanical "add zod everywhere" — use the approach that best fits the context.

### 3. Duplicate Code and Types

Look across the diff for:
- Repeated logic that could be shared (a function, a hook, a util)
- Types defined more than once for the same shape
- Copy-pasted blocks with minor variations

Consolidate where it makes sense. Don't over-abstract — three similar lines are fine; a pattern repeated four or more times probably warrants a shared helper.

### 4. Readable Conditions

Complex boolean expressions are hard to reason about. When you see an `if` statement (or ternary) with multiple conditions joined by `&&` / `||`, especially with negations, extract it to a named constant that explains the intent:

```ts
// Hard to scan
if (!isLoading && user !== null && user.role !== 'guest') { ... }

// Clear intent
const canAccessDashboard = !isLoading && user !== null && user.role !== 'guest'
if (canAccessDashboard) { ... }
```

Apply this when the expression has 3+ conditions, involves negation, or when the intent isn't immediately obvious from the raw conditions alone.

### 5. Bugs and Regressions

Read the diff carefully and look for logic errors that could break existing behavior:

- **Missing awaits** — async calls without `await` that silently return a Promise
- **Null/undefined access** — property access on values that could be null, especially after refactors
- **Off-by-one errors** — array indexing, slice/splice bounds, pagination math
- **Broken callers** — function signatures, prop names, or exported types that changed; search call sites
- **Unhandled promise rejections** — `.then()` chains without `.catch()`, or swallowed async errors
- **State mutations** — direct mutation of React state or objects passed as props
- **Removed guard conditions** — checks that previously prevented an error path being deleted

For each issue found, fix it and leave a short inline comment explaining why if the fix is non-obvious.

### 6. Test Coverage with Vitest

For each changed file, ask: *is there logic here that could fail silently?* If yes, write a test.

Good candidates: utility functions, data transformations, custom hooks with non-trivial state, validation logic.

Tests live next to the file they test (`my-module.test.tsx` alongside `my-module.tsx`).

> **Worktree note:** The vitest `.bin` shell script fails in git worktrees. Run from within the app directory:

```bash
cd apps/studio
node node_modules/vitest/dist/cli.js run <test file>
```

Don't write tests for things that are trivially correct or better covered by E2E tests.

### 7. Logic Out of React Components

React components should describe UI, not implement business logic. If a component contains complex data transformations, multi-step calculations, or branching logic, move it to a utility function.

Per the Studio testing convention, extracted logic lives in `.utils.ts` files alongside the component, making it independently testable. See the `studio-testing` skill for the full pattern.

```tsx
// Before: logic buried in component
function UserCard({ user }) {
  const label = user.subscriptions.filter(s => !s.expired).length > 1
    ? `${user.subscriptions.filter(s => !s.expired).length} active plans`
    : 'Free tier'
  return <div>{label}</div>
}

// After: extracted to UserCard.utils.ts, testable in isolation
function getSubscriptionLabel(subscriptions: Subscription[]): string {
  const active = subscriptions.filter(s => !s.expired)
  return active.length > 1 ? `${active.length} active plans` : 'Free tier'
}

function UserCard({ user }) {
  return <div>{getSubscriptionLabel(user.subscriptions)}</div>
}
```

### 8. Comment Quality

Remove comments that restate what the next line does — they add noise and go stale:

```ts
// Bad: says what, not why
// Increment counter
count++

// Good: explains why
// Increment before re-entering the queue to prevent infinite retries when the handler always throws
count++
```

Keep only comments that explain *why* something non-obvious is done that way.

### 9. Studio-Specific Checks

For changes in `apps/studio/`, also verify:

- **Error handling** — errors should flow through `handleError()` → typed subclass → React Query → `ErrorMatcher`. See `studio-error-handling` skill.
- **Telemetry** — feature flag rollouts, growth components, and new features need PostHog events. See `telemetry-standards` skill.
- **Composition** — avoid boolean prop proliferation; prefer compound components and explicit variants. See `vercel-composition-patterns` skill.

---

## Output Format

After completing all checks, give a brief summary:

- What you fixed (with file references)
- Any issues you found but couldn't fix, and why
- Anything the author should know or decide

Keep it concise. The user can see the diff.
