---
title: Extract Complex Conditions to Named Constants
impact: HIGH
impactDescription: makes code self-documenting and avoids hard-to-parse negated conditions
tags: readability, conditions, naming, constants
---

## Extract Complex Conditions to Named Constants

Extract non-trivial boolean expressions into a named constant before using them.
This is especially important for negated conditions (`!`) and `instanceof` checks,
which are easy to misread at a glance.

**Incorrect (negated inline condition):**

```ts
export function getMappingForError(error: unknown): ErrorMapping | null {
  if (!(error instanceof ResponseError)) return null
  // ...
}
```

**Correct (named constant):**

```ts
export function getMappingForError(error: unknown): ErrorMapping | null {
  const isResponseError = error instanceof ResponseError
  if (!isResponseError) return null
  // ...
}
```

**When to apply:**

- Any negated `instanceof` or `typeof` check
- Boolean conditions longer than ~30 characters
- Conditions that require reading twice to understand

**What NOT to do:**

Don't extract trivially obvious conditions — `if (!isOpen) return` doesn't need a constant.
The goal is readability, not mechanical extraction of every boolean.
