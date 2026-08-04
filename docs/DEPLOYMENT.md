# Deployment and release

## Website

Create a Vercel project from `KebiLab/Localis` and set the root directory to `apps/web`. Next.js defaults are sufficient. Add `localis.dev`, then verify `/`, `/docs`, `/ru`, `/ru/docs`, `/robots.txt`, and `/sitemap.xml`.

## npm packages

The public packages are `localis-core` and `localis`. Before publishing:

```bash
npm ci
npm test
npm run typecheck
npm run build:core
npm run build:cli
npm pack --dry-run -w localis-core
npm pack --dry-run -w localis
```

The `.github/workflows/publish-npm.yml` workflow publishes core first and CLI second with provenance. For the first publish, add an npm automation token as the `NPM_TOKEN` secret in the protected `npm` environment. Afterwards, configure npm Trusted Publishing for `KebiLab/Localis` and `publish-npm.yml`, then remove the long-lived token.

## Desktop release

Pushing a version tag runs `.github/workflows/release.yml`. The official Tauri action builds Windows, macOS Intel, macOS Apple Silicon, and Linux bundles and attaches them to a prerelease.

```bash
git tag -a v0.2.0 -m "Localis 0.2.0"
git push origin v0.2.0
```

The app version must match in `apps/desktop/package.json`, `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/Cargo.toml`, and both public package manifests.

Unsigned preview builds can trigger operating-system warnings. Configure signing certificates only in the protected release environment; never commit them.

## WinGet

Microsoft requires the first community manifest to be generated from a public installer URL, validated, and submitted to `microsoft/winget-pkgs` for review. After the Windows release asset exists:

```powershell
.\scripts\submit-winget.ps1 -InstallerUrl "https://github.com/KebiLab/Localis/releases/download/v0.2.0/Localis_0.2.0_windows_x64-setup.exe"
```

Review the generated publisher, package identifier `KebiLab.Localis`, installer type, scope, and silent switches before accepting the WinGetCreate submission prompt. Once approved, future versions can use `wingetcreate update KebiLab.Localis -v <version> -u <installer-url>`.
