# Third-Party Notices

This project is proprietary software (see `LICENSE` and `NOTICE`), but it depends on a number
of third-party, open-source npm packages. Each of those packages remains the property of its
respective copyright holders and is governed solely by its own license terms — nothing in this
project's `LICENSE` extends to, or restricts, any third-party dependency, and nothing here
represents third-party code as proprietary project code.

This document summarizes the licenses of this project's **direct** dependencies, generated from
each workspace's `package.json` and the corresponding installed package metadata in
`node_modules`. It is not a substitute for the authoritative license text of any package, which
ships with that package (typically a `LICENSE` file in its own `node_modules/<package>/`
directory) and takes precedence over this summary.

## Direct production dependencies

### `apps/web`

| Package                 | Version | License |
| ----------------------- | ------- | ------- |
| @radix-ui/react-dialog  | 1.1.23  | MIT     |
| @radix-ui/react-popover | 1.1.23  | MIT     |
| @radix-ui/react-tabs    | 1.1.21  | MIT     |
| next                    | 16.2.12 | MIT     |
| react                   | 19.2.4  | MIT     |
| react-dom               | 19.2.4  | MIT     |

### `apps/api`

| Package                  | Version | License    |
| ------------------------ | ------- | ---------- |
| @nestjs/common           | 11.1.28 | MIT        |
| @nestjs/config           | 4.0.4   | MIT        |
| @nestjs/core             | 11.1.28 | MIT        |
| @nestjs/platform-express | 11.1.28 | MIT        |
| @nestjs/schedule         | 6.1.3   | MIT        |
| @nestjs/throttler        | 6.5.0   | MIT        |
| @prisma/adapter-pg       | 7.9.1   | Apache-2.0 |
| @prisma/client           | 7.9.1   | Apache-2.0 |
| argon2                   | 0.45.1  | MIT        |
| class-transformer        | 0.5.1   | MIT        |
| class-validator          | 0.15.1  | MIT        |
| cookie-parser            | 1.4.7   | MIT        |
| helmet                   | 8.3.0   | MIT        |
| reflect-metadata         | 0.2.2   | Apache-2.0 |
| rxjs                     | 7.8.2   | Apache-2.0 |

### `packages/shared`

| Package | Version | License |
| ------- | ------- | ------- |
| luxon   | 3.7.2   | MIT     |

(The internal `shared` workspace package referenced by `apps/web` and `apps/api` is this
project's own code, not a third-party dependency, and is covered by `LICENSE` instead.)

## Development-only dependencies

Each workspace's `package.json` (`devDependencies`) additionally lists development-time-only
tooling — test frameworks, linters, bundlers, type checkers, and the like (for example: Jest,
Playwright, ESLint, TypeScript, Tailwind CSS, Prisma CLI, NestJS CLI, Prettier). None of these
are runtime import dependencies of the built application's own source code merely by being
listed as `devDependencies`. That said, `apps/api/Dockerfile` and `apps/web/Dockerfile` both
install with a single wholesale `npm ci` and copy that same `node_modules` into the runtime
image stage rather than a separate production-only install (see each Dockerfile's own comment
for the trade-off) — so, due to that image-construction choice, some development tooling
packages may still be physically present on disk in the built image even though the
application never imports them. Every third-party package, whether a runtime or a
development-only dependency, remains subject to its own respective license regardless. Across
all workspaces, this development tooling resolves to standard permissive/weak-copyleft
open-source licenses: predominantly MIT, plus Apache-2.0, BSD-2-Clause (`dotenv`), and MPL-2.0
(`@axe-core/playwright`) — no copyleft license that would affect this project's own source code.

## Full transitive dependency list

The tables above cover this project's **direct** dependencies only. For a complete, current
listing of every transitive dependency and its license (regenerable at any time from the
committed `package-lock.json`), run from the repository root:

```bash
npx license-checker --production --summary
```

## No warranty from upstream authors

As with this project's own code (see `LICENSE`), each third-party package is provided by its
authors without warranty of any kind, to the extent stated in that package's own license.
