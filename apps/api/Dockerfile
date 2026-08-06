# Built from the repository root (see docker-compose.yml's `context: .`),
# since this workspace depends on packages/shared. debian-slim rather than
# alpine specifically to avoid Prisma's musl-vs-glibc engine mismatches.
#
# Single build stage installs everything (build tools included) and
# compiles; the runtime stage reuses that same node_modules wholesale
# instead of a separate prod-only install. That's simpler and more robust
# than fighting npm workspaces' devDependency-pruning edge cases (the
# generated Prisma client, in particular, needs the tsx/prisma toolchain to
# have already run once), at the cost of a larger image than a fully
# pruned one -- an acceptable trade-off for a project this size.
# Prisma's query engine needs OpenSSL to be present on Debian-slim; without
# it `prisma generate`/migrate silently guess a libssl version instead.
FROM node:22-slim AS build
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
# npm ci at the workspace root always runs every workspace's postinstall
# (apps/api's runs `prisma generate`), regardless of which app this
# Dockerfile is ultimately building -- the schema has to already be in
# place before that install step, not copied in afterward with the rest of
# the source. apps/api/tsconfig*.json also has to be present at this point:
# Prisma's generator inspects the consuming project's tsconfig to decide
# its own generated code's import-extension convention, and silently
# emits different (broken) output when that file is missing.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/tsconfig.build.json apps/api/tsconfig.build.json
RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w packages/shared
RUN npm run build -w apps/api

FROM node:22-slim AS runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts apps/api/prisma.config.ts
# `npm run db:seed` (documented in README for the Docker launch too) runs
# `tsx prisma/seed.ts` directly against source, not the compiled dist/ --
# it needs apps/api/src and the raw (pre-compilation) generated Prisma
# client alongside it, not just the compiled server in dist/.
COPY --from=build /app/apps/api/src apps/api/src
COPY --from=build /app/apps/api/generated apps/api/generated
COPY --from=build /app/apps/api/tsconfig.json apps/api/tsconfig.json

WORKDIR /app/apps/api
EXPOSE 4000

# Applying pending migrations before every start is a safe no-op once the
# schema is current, and means `docker compose up` alone is enough to reach
# a working app -- no separate manual migration step for a fresh volume.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
