# NEO — Turborepo monorepo

A pnpm + [Turborepo](https://turbo.build/repo) workspace for the NEO project.

## Layout

```
neo/
├── apps/
│   ├── backend/   # Spring Boot + embedded Flowable service (Java 25, Maven)
│   └── web/       # Next.js frontend (React 19, Tailwind v4)
├── packages/
│   ├── ui/                # @workspace/ui — shadcn/ui kit, hooks, theme CSS
│   ├── eslint-config/     # @workspace/eslint-config — shared flat ESLint configs
│   └── typescript-config/ # @workspace/typescript-config — shared tsconfig bases
├── schema.sql     # MCI reference schema (Appian)
├── diagram.svg    # Claim Lifecycle / Mandate Approval flows
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Prereqs

- Node.js >= 20 and [pnpm](https://pnpm.io) 11
- JDK 25 and Maven 3.9+ (for `apps/backend`)
- MySQL 8+ (when running `apps/backend` outside Docker)
- Docker Engine/Desktop with Docker Compose v2 (for the containerized run)

## Run with Docker Compose

From the repository root:

```bash
docker compose up --build
```

Set the Okta values first (see [Authentication (Okta)](#authentication-okta)); compose refuses to start
without them. Then open the web app at `http://localhost:3000`; the backend and MySQL are also
available at `http://localhost:8080` and `localhost:3306`. Compose uses local
development credentials by default. Copy `.env.example` to `.env` to override
them; use strong values before exposing the services to other users.

Stop the services with `docker compose down`. The database and uploaded files
remain in named volumes.

## Authentication (Okta)

Sign-in is delegated to Okta (OpenID Connect). The Next.js server runs the Authorization Code + PKCE flow,
keeps the tokens in an encrypted httpOnly cookie (never exposed to browser JavaScript) and refreshes them
silently; the Spring Boot API validates the Okta access token on every call.

### 1. Okta setup

1. **Application**: Applications > Create App Integration > *OIDC* > *Web Application*.
   - Grant types: *Authorization Code* and *Refresh Token*.
   - Sign-in redirect URI: `http://localhost:3000/api/auth/callback` (use your real `APP_URL` in production).
   - Sign-out redirect URI: `http://localhost:3000/login`.
   - Note the **Client ID** and **Client secret**.
2. **Authorization server**: Security > API > *default* (or your own). Note the **Issuer URI** and **Audience**.
   Under *Access Policies*, make sure the policy allows the app and the `offline_access` scope (refresh tokens).
3. **Claims** (Security > API > your server > Claims), on the **access token**:
   - `groups`: type *Groups*, filter e.g. *Starts with* `NEO-` or *Matches regex* `.*`
   - `email` = `user.email`, `name` = `user.displayName` (otherwise `sub`/email fall back automatically)
4. **Groups**: create Okta groups named exactly like the NEO groups (`employees`, `supervisors`, `finance`),
   or map different names in `neo.security.okta.group-mappings` (backend `application.yml`). Assign users to the
   app and to the groups. Groups with no matching NEO group are ignored.

### 2. NEO configuration

Copy `.env.example` to `.env` (backend + compose) and `apps/web/.env.example` to `apps/web/.env.local` (web dev),
then set `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `APP_URL` and a random `NEO_SESSION_SECRET`
(`openssl rand -base64 48`). Run `pnpm backend:dev` and `pnpm web:dev`, or `docker compose up --build`.

### Behaviour worth knowing

- **Users**: created automatically on first login (`OKTA_AUTO_PROVISION=false` to require pre-created users).
  An existing NEO user (same email) is bound to its Okta identity once; it can never be re-bound.
- **Groups**: Okta is the source of truth and is re-synced on each request (`OKTA_SYNC_GROUPS=false` to
  manage groups in NEO instead). Removing someone in Okta takes effect when their access token expires
  (default 1 hour) at the latest.
- **Sign out** ends the NEO session, revokes the refresh token and signs the user out of Okta.
- **Production**: serve everything over https (`APP_URL` and `OKTA_ISSUER` must be https), keep
  `OKTA_CLIENT_SECRET` and `NEO_SESSION_SECRET` in a secret manager, and run the web app on a single stable
  `NEO_SESSION_SECRET` across all instances.
- `NEO_SEED_DEMO_USERS=true` (dev only) creates `employee1/manager1/finance1@neo.dev`; they bind to Okta users
  with the same email.

## Install

```bash
pnpm install
```

## Common commands

Run from the repo root:

| Command            | What it does                                             |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | Runs every package's `dev` task via Turbo                |
| `pnpm build`       | Builds every package (`next build` + `mvn package`)      |
| `pnpm lint`        | Lints every package that defines a `lint` script         |
| `pnpm typecheck`   | Type-checks every package that defines a `typecheck`     |
| `pnpm test`        | Runs tests (backend Maven test suite)                    |
| `pnpm format`      | Formats every package                                    |

Scoped shortcuts:

```bash
pnpm web:dev        # next dev  (apps/web)
pnpm backend:dev    # mvn spring-boot:run  (apps/backend)
pnpm backend:build  # mvn package
pnpm backend:test   # mvn test
```

You can also target a single workspace directly:

```bash
pnpm --filter web dev
pnpm --filter backend test
```

## Notes

- Turbo caches the `build`, `lint`, `typecheck`, `format` and `test` tasks; `dev` is persistent and uncached.
- The Java backend is exposed to Turbo through `apps/backend/package.json`, whose scripts simply wrap Maven.
- Backend runs on `http://localhost:8080`; the web app reads `BACKEND_URL` (see `apps/web/.env.example`).
