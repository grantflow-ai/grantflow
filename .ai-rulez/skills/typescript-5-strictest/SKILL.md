---
priority: medium
---

# TypeScript 5.x Strictest Standards

**TypeScript 5.x · Next.js 15 · React 19 · Strictest typing · Tests next to source**

- Enable ALL strict flags: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
- Ban any and object types; use unknown with guards, Record<string, unknown>
- Generics with constraints: <T extends BaseType>, satisfies operator, const assertions
- Tests: .spec.ts(x) next to source (NOT __tests__/); vitest, 80%+ coverage
- React 19: function components, custom hooks (use*), proper prop typing
- Nullish coalescing ?? over ||; optional chaining ?.; type predicates (x is Type)
- Import type for types, organize by feature, path aliases (@/lib/*)
- Biome for linting/formatting, pnpm ≥10.17, pnpm-lock.yaml committed
- Never: any/object types, __test__ dirs, non-null assertions !, || for defaults
