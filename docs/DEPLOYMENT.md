# Deployment and release

## Website on Vercel

Create a Vercel project from `KebiLab/Localis` and set the project Root
Directory to `apps/web`. The framework preset is Next.js; the default install
and build commands are sufficient. Add the production domain `localis.dev`,
then verify `/robots.txt` and `/sitemap.xml` after deployment.

The website has no runtime dependency on Localis Core and receives no project
source code.

## CLI packages

The publishable packages are `@localis/core` and `@localis/cli`. Before a tag:

```bash
npm ci
npm run localis -- ship .
npm pack --dry-run -w @localis/core
npm pack --dry-run -w @localis/cli
```

Publish core first, then CLI, using npm provenance from CI. Publishing is an
external release action and is intentionally not performed by the repository's
ordinary CI workflow.

## Desktop

Install Rust 1.77.2 or newer and the Tauri platform prerequisites, then run:

```bash
npm run build
npm run tauri:build -w @localis/desktop
```

The Windows CI job runs the same native build with `--no-bundle` on every push.
Signing identities and store credentials should be configured only in the
release environment, never committed.
