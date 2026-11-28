# NEO Backend — Spring Boot + Flowable

Single Spring Boot app owning the NEO claim/mandate domain (JPA, `app` schema)
plus embedded Flowable (own `flowable` schema). Mirrors the
`neo-poc-master` workflow patterns, adapted to the `diagram.svg` Claim
Lifecycle and Mandate Approval flows and the Appian `MCI_*` domain model.

## Prereqs

- JDK 25, Maven 3.9+
- MySQL 8+ (or H2 for a smoke run, see below)

## Run with a local MySQL

The default datasource targets `localhost:3306/neo` with `root`/`manager` and
creates the `neo` database on first connect if it is missing:

```bash
cd apps/backend
mvn spring-boot:run
```

Both the JPA domain tables and the Flowable `ACT_*` tables are auto-created in
the `neo` database. Override the connection with `SPRING_DATASOURCE_URL`,
`SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD` if needed.

The JDBC URL keeps `nullDatabaseMeansCurrent=true`. Flowable probes for its
tables via `DatabaseMetaData.getTables(null, ...)`, and without this flag MySQL
Connector/J matches that against every database on the server. If any other
database on the instance already contains `ACT_*` tables (e.g. another
Flowable/Activiti project), Flowable wrongly assumes its schema exists and then
fails instead of creating its tables in `neo` (flowable/flowable-engine#4095).

Backend listens on `http://localhost:8080`.

## Quick smoke run (H2, no Docker needed)

```cmd
cd apps/backend
set SPRING_DATASOURCE_URL=jdbc:h2:mem:neo-smoke;DB_CLOSE_DELAY=-1;INIT=CREATE SCHEMA IF NOT EXISTS app\;CREATE SCHEMA IF NOT EXISTS flowable
set SPRING_DATASOURCE_USERNAME=sa
set SPRING_DATASOURCE_PASSWORD=
set SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.h2.Driver
mvn spring-boot:run
```

## Tests

```bash
cd apps/backend
mvn test
```

Covers the null-variable regression plus the full `claimLifecycle`
(low-value approve, high-value finance route + reject) and
`mandateApproval` (clearing + DOA) flows on H2.

## Auth (Okta JWT)

The backend is an OAuth2 resource server. Every `/api/**` request must carry
an Okta access token as a `Bearer` token. Tokens are validated against
`neo.okta.issuer-uri` plus the required `neo.okta.audience`, then mapped to a
NEO user (auto-linked on first login by email) with memberships synced from
the `groups` claim. File downloads go through the authenticated
`GET /api/files/:name` endpoint, served from `STORAGE_DIR` (Docker: `/data/storage`).

Required environment:

```bash
OKTA_ISSUER_URI=https://your-tenant.okta.com/oauth2/default
OKTA_AUDIENCE=api://default
# OKTA_GROUPS_CLAIM=groups   # optional, defaults to "groups"
```

In Okta, the authorization server must expose the `groups` claim on access
tokens and the NEO group keys (`employees`, `supervisors`, `finance`) must
exist as Okta group names (or mapped claim values); users with no mapped group
get `401 No NEO groups assigned`.

## Seed users

Seed users still exist for local data, but they only become usable once linked
to an Okta identity on first login (verified email match):

| Email | Groups |
|---|---|
| employee1@neo.dev | employees |
| manager1@neo.dev | employees, supervisors |
| finance1@neo.dev | finance |

## Key endpoints (Okta Bearer token required except health)

- `POST /api/auth/logout` (audit trail), `GET /api/auth/me`
- `GET /api/claims?status=&...`, `POST /api/claims`, `GET /api/claims/:lineId`,
  `PUT /api/claims/:lineId`, `POST /api/claims/:lineId/submit`,
  `GET /api/claims/:lineId/history|/audit|/notes`, `POST /api/claims/:lineId/notes`,
  `GET|POST /api/claims/:lineId/attachments`
- `GET /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks/:id/complete {decision, comment?}`,
  `POST /api/tasks/:id/claim`
- `GET /api/mandates`, `POST /api/mandates`, `POST /api/mandates/:number/submit`,
  `GET /api/mandates/approvals/view`
- `GET /api/notifications`, `GET /api/notifications/unread-count`,
  `POST /api/notifications/read-all|/:id/read`
- `GET /api/lookups[/:name]`, `GET /actuator/health`

## BPMN

- `processes/claimLifecycle.bpmn20.xml` (key `claimLifecycle`, businessKey = claim lineId):
  submit → manager approval (`supervisors`, reminder/escalation timers) →
  finance gate (threshold, `finance`) → finalize → approved/rejected.
- `processes/mandateApproval.bpmn20.xml` (key `mandateApproval`, businessKey = mandate number):
  clearing review (`supervisors`) → DOA approval (`finance`) → outcome.

Role-based access is enforced at task completion (`assignee | candidate
group | claim:read:all`); engine events emit role-targeted notifications.
