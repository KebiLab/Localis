# Contributing to Localis

Thanks for helping build a developer tool where privacy is a product behavior, not a slogan.

## Development

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `npm test`.

Keep pull requests focused and include tests for behavior changes. User-facing findings must identify their rule, severity, file, line, and a practical remediation.

## Product principles

- Never add an implicit network request.
- Never send source code to a provider without an explicit user action.
- Prefer deterministic checks before model-generated guesses.
- Show a preview before changing a project.
- Keep CLI output useful in both terminals and automation.

## Commit style

Localis uses Conventional Commits:

```text
feat(core): add repository language detection
fix(cli): preserve json output on audit failure
docs: explain privacy boundary
```

By contributing, you agree that your contribution is licensed under Apache-2.0.
