# ADR 0002 — Phase 12 dependency audit

## Status

Accepted.

## Context

Phase 12 requires running a dependency audit and addressing safe high/critical findings
without blind major upgrades. `npm audit` at the repository root reports:

```
postcss  <=8.5.22   (high) — several XSS/path-traversal advisories
sharp    <0.35.0    (high) — libvips CVEs (2026-33327/33328/35590/35591)

3 high severity vulnerabilities
fix available via `npm audit fix --force`
Will install next@16.3.0, which is outside the stated dependency range
```

Both findings are transitive: `next@16.2.12` (the newest 16.2.x patch available) bundles the
vulnerable `postcss`/`sharp` versions internally. There is no patch-level release that fixes
either advisory — the only path `npm audit fix` offers jumps `next` to `16.3.0`, a version
range npm itself flags as outside what `apps/web/package.json` declares.

## Decision

Do not force the upgrade. `postcss`'s advisories require attacker-controlled CSS input (a
build-time asset pipeline concern; this app has no user-supplied CSS/theming) and `sharp`'s
libvips CVEs require attacker-controlled image processing (this app has no image upload or
processing feature at all — `sharp` is pulled in only as `next`'s optional image-optimization
dependency, unused by any page here). Neither vulnerable code path is reachable by this
application's actual functionality, so forcing an unreviewed minor-version jump of the core
framework carries more real risk (an untested App Router/build change days before delivery)
than leaving the finding open carries exposure.

Revisit when `next` publishes a 16.2.x patch that resolves this, or before adopting any
feature that would make either path reachable (image uploads, user-supplied CSS).
