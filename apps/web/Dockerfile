# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
LABEL org.opencontainers.image.title="neo-web"
LABEL org.opencontainers.image.description="NEO Next.js frontend (Okta login, Spring Boot API proxy)"
WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web/ apps/web/
COPY packages/ packages/

ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=${BACKEND_URL}
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG OKTA_ISSUER_URI
ENV OKTA_ISSUER_URI=${OKTA_ISSUER_URI}
ARG OKTA_CLIENT_ID
ENV OKTA_CLIENT_ID=${OKTA_CLIENT_ID}
ARG OKTA_CLIENT_SECRET
ENV OKTA_CLIENT_SECRET=${OKTA_CLIENT_SECRET}
ARG OKTA_SCOPES=openid profile email
ENV OKTA_SCOPES=${OKTA_SCOPES}
RUN pnpm --filter web build

FROM node:22-bookworm-slim AS runner
LABEL org.opencontainers.image.title="neo-web"
LABEL org.opencontainers.image.description="NEO Next.js frontend (Okta login, Spring Boot API proxy)"
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=${BACKEND_URL}
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG OKTA_ISSUER_URI
ENV OKTA_ISSUER_URI=${OKTA_ISSUER_URI}
ARG OKTA_CLIENT_ID
ENV OKTA_CLIENT_ID=${OKTA_CLIENT_ID}
ARG OKTA_CLIENT_SECRET
ENV OKTA_CLIENT_SECRET=${OKTA_CLIENT_SECRET}
ARG OKTA_SCOPES=openid profile email
ENV OKTA_SCOPES=${OKTA_SCOPES}

COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /workspace/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
