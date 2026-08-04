# Changelog

All notable changes to Localis are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semantic
versioning.

## [Unreleased]

## [0.2.0] - 2026-08-04

### Added

- Loopback-only Ollama and LM Studio providers behind one local model contract.
- Privacy Gateway previews, scoped redaction, and payload hashing.
- Schema-constrained proposals and finding-scoped `localis fix` plans.
- Hash-checked diff preview, transactional apply, private backups, and safe undo.
- Multi-ecosystem test discovery and the deterministic `localis ship` gate.
- Tauri 2 desktop workspace for audit, privacy, and ship reports.
- Windows native desktop verification in CI.
- Vercel-ready product website and Russian launch article.

### Security

- Model providers reject non-loopback endpoints before network access.
- Project paths, model output, plan files, backups, and subprocess output are
  validated or sanitized at their trust boundaries.
- Next.js upgraded to 16.3.0; the release dependency audit reports no known
  vulnerabilities.

## [0.1.0] - 2026-07-27

### Added

- Initial Localis monorepo, deterministic audit, environment doctor, CLI JSON
  output, and Apache-2.0 licensing.

[Unreleased]: https://github.com/KebiLab/Localis/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/KebiLab/Localis/compare/689f164...v0.2.0
[0.1.0]: https://github.com/KebiLab/Localis/commits/689f164
