# Built from the repository root (see docker-compose.yml's `context: .`),
# since this workspace depends on packages/shared.
#
# Next.js resolves next.config.ts's async rewrites() once at `next build`
# time and bakes the result into .next's routes manifest -- `next start`
# replays that manifest rather than re-invoking rewrites() against the
# container's runtime environment, even without `output: standalone`. So
# API_ORIGIN has to be available as a build ARG here, not just a runtime
# environment variable (confirmed the hard way: a runtime-only API_ORIGIN
# silently rewrote /api/* to the http://localhost:4000 default baked in at
# build time, not the api container).
#
# npm ci at the workspace root always runs every workspace's postinstall,
# including apps/api's `prisma generate` -- even in this web-only image --
# so the same OpenSSL/schema prerequisites as apps/api/Dockerfile apply
# here too (see that file's own comments for why).
FROM node:22-slim AS build
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ARG API_ORIGIN=http://api:4000
ENV API_ORIGIN=$API_ORIGIN

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/tsconfig.build.json apps/api/tsconfig.build.json
RUN npm ci

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w packages/shared
RUN npm run build -w apps/web

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/package.json apps/web/package.json
COPY --from=build /app/apps/web/next.config.ts apps/web/next.config.ts

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
