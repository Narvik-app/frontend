# syntax = docker/dockerfile:1

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base

ARG PORT=3000
ENV NODE_ENV=production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

WORKDIR /app

# Build
FROM base AS build

COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY --link . .

RUN pnpm install --frozen-lockfile --offline && \
    pnpm run build

# Run
FROM base AS run

ENV PORT=$PORT

COPY --from=build /app/.output /app/.output
COPY --link --chmod=755 docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]
