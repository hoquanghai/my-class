# syntax=docker/dockerfile:1.7
# Build from repo root:  docker build -f apps/api/Dockerfile -t lophoc-api .
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS build
# prisma.config.ts requires DATABASE_URL to load; `prisma generate` never connects, so a placeholder is fine here
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @lophoc/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @lophoc/shared build && pnpm --filter @lophoc/api db:generate && pnpm --filter @lophoc/api build
RUN pnpm --filter @lophoc/api deploy --prod /out

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
