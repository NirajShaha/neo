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

Open the web app at `http://localhost:3000`; the backend and MySQL are also
available at `http://localhost:8080` and `localhost:3306`. Compose uses local
development credentials by default. Copy `.env.example` to `.env` to override
them; use strong values before exposing the services to other users.

Stop the services with `docker compose down`. The database and uploaded files
remain in named volumes.

If login fails inside Docker with "could not reach Okta", the container does
not trust your corporate proxy: mount your proxy CA into the web container
(e.g. `-v /path/to/proxy-ca.crt:/usr/local/share/ca-certificates/proxy.crt:ro`)
and rebuild, or run web locally with `NODE_EXTRA_CA_CERTS` pointing at it.

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
