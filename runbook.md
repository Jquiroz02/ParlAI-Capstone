## Service or system overview

**Service or system name:** ParlAI

### Business overview

The system provides an easy to use sports betting environment with AI chatbot integration. The application is expected to be available 24 hours a day, 7 days a week with low-latency responses suitable for interactive use.

### Technical overview

- **Client:** React (Vite), Material UI, Tailwind; calls the backend under `/api/*` (see `frontend/.env.example` for `VITE_API_BASE_URL`).
- **Hosting:** [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/) serves the built SPA (`frontend/dist`) and hosts the **Azure Functions** API from `backend/` on the same origin.
- **Data:** [Azure SQL Database](https://learn.microsoft.com/azure/azure-sql/) accessed from Node.js via `mssql` (`backend/components/db-connect.js`). Schema is defined in `backend/db/init.sql`; initial setup uses `npm run init-db` from `backend/` (reads repo-root `.env`).
- **Auth:** Static Web Apps built-in authentication (`/.auth/*`); the frontend uses `/.auth/me` and passes `x-ms-client-principal` to APIs (`frontend/src/context/AuthContext.jsx`, `backend/src/functions/user-me.js`). Social providers (Google, Facebook, Twitter/X) are wired in app settings per `README.md` / Static Web Apps configuration.
- **Integrations:** The Odds API (key `SOCCER_ODDS_API`) for soccer odds ingestion; ESPN’s public scoreboard HTTP API for live soccer scores (`backend/src/functions/soccer-scores-timer.js`).

### Service Level Agreements (SLAs)

Contractual 99.9% service availability outside of the 03:00–05:00 maintenance window.

### Service owner

CPSC 491 Group 5 develops and runs this service: amalsuresh@csu.fullerton.edu

### Contributing applications, daemons, services, middleware

| Component                                       | Role                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| React + Vite                                    | SPA UI                                                                                 |
| Azure Static Web Apps                           | CDN + routing + auth proxy                                                             |
| Azure Functions (Node.js, programming model v4) | HTTP and timer triggers under `/api`                                                   |
| Azure SQL                                       | Persistent storage (users, leagues, events, markets, bets, ledger)                     |
| Azurite (local only)                            | Azure Storage emulator for `AzureWebJobsStorage` and Functions runtime                 |
| GitHub Actions                                  | CI validation (`develop.yml`) and SWA deploy (`azure-static-web-apps-*.yml` on `main`) |

## System characteristics

### Hours of operation

The service shall be available 24 hours with occasional downtime of up to 2 hours once a month for maintenance.

### Data and processing flows

1. **Browser → Static Web Apps:** Serves static assets and `/.auth/*` for login/session.
2. **Browser → `/api/*`:** Proxied to Azure Functions (same hostname in production).
3. **Functions → Azure SQL:** Read/write via a shared connection pool (`poolPromise`); user identity is derived from `x-ms-client-principal` where implemented.
4. **Timer → external APIs → SQL:** Scheduled jobs pull odds (Odds API) and scores (ESPN), then upsert leagues, events, markets, and scores as implemented in `soccer-odds-timer.js` and `soccer-scores-timer.js`.

### Infrastructure and network design

- **Production:** Single Azure Static Web Apps resource (example hostname pattern: `*.azurestaticapps.net`) with integrated Functions API and application settings for DB and third-party keys. Azure SQL with firewall rules allowing Azure services and developer IPs as needed.
- **Build:** GitHub-hosted runners (`ubuntu-latest`) compile the frontend and deploy via `Azure/static-web-apps-deploy@v1` (see `.github/workflows/azure-static-web-apps-lemon-bush-05638821e.yml`).
- **Local:** Developer machine runs `npm run dev` in `frontend/`, `npm run start` in `backend/` (starts Azurite + `func start`), and optionally `swa start` from repo root for a closer SWA + auth experience (see `README.md`).

No dedicated VLAN or self-managed VMs; networking is Azure’s managed edge + platform endpoints.

### Resilience, Fault Tolerance (FT) and High Availability (HA)

- Static Web Apps and Azure Functions are managed regional services with Microsoft-operated redundancy appropriate to the chosen SKUs/plans.
- Azure SQL provides platform HA (geo-redundancy and backup options depend on the SQL tier configured in Azure).
- Timer functions include guard logic (e.g. skip ESPN calls when no live games) to reduce unnecessary external dependency usage.

### Throttling and partial shutdown

#### Throttling and partial shutdown - external requests

- Third-party APIs (Odds API, ESPN) are subject to their own rate limits and quotas; monitor usage in provider dashboards. The scores timer only calls ESPN when the database indicates live games.
- Azure applies [platform limits](https://learn.microsoft.com/azure/azure-functions/functions-scale) on Functions and Static Web Apps; scale and throttling behavior depend on the assigned plan.

#### Throttling and partial shutdown - internal components

- No custom application-level rate limiter is implemented in-repo. To reduce load temporarily, disable or scale down Functions in Azure, or pause timer triggers via configuration/deploy if required for maintenance.

### Expected traffic and load

This is primarily a course / demo workload: expect low to moderate concurrent users unless publicly promoted.

#### Hot or peak periods

Weekends and evenings (US time) when sports fixtures are active; timer activity increases around live soccer windows.

#### Warm periods

Weekday daytime usage for development, demos, and light testing.

#### Cool or quiet periods

Overnight and off-season periods; odds timer still runs on its schedule but may do little work if no upcoming games exist for the configured league.

### Environmental differences

| Aspect       | Local                                                                | Production                                          |
| ------------ | -------------------------------------------------------------------- | --------------------------------------------------- |
| Storage      | Azurite (`AzureWebJobsStorage=UseDevelopmentStorage=true`)           | Azure Storage account backing Functions             |
| SQL          | Same Azure SQL or a dev database; firewall must allow your client IP | Azure SQL with “Allow Azure services” as applicable |
| Auth         | `swa start` / SWA CLI to approximate `/.auth`                        | Static Web Apps managed auth                        |
| API base URL | Often `VITE_API_BASE_URL=/api` with proxy, or full URL if split      | Same origin `/api` on the SWA hostname              |

Upstream environments may not exercise identical auth cookies or CORS edges; always smoke-test auth and `/api/user/me` after a production deploy.

### Tools

- **Run locally:** `README.md` — `frontend`: `npm install`, `npm run dev`; `backend`: `npm install`, `npm run start` (Azurite + Functions).
- **Database schema:** `cd backend && npm run init-db` (requires repo-root `.env` with `DB_*` variables).
- **Quality gates:** `frontend`: `npm run lint`, `npm run format`, `npm run test`; `backend`: `npm run lint`, `npm run format`.
- **Deploy:** Push to `main` triggers Azure Static Web Apps workflow (when configured with the repo secret `AZURE_STATIC_WEB_APPS_API_TOKEN_*`).

## Required resources

Serverless-style footprint in Azure; exact SKU should match subscription and class project budget.

### Required resources - compute

- **Minimum:** Azure Static Web Apps + consumption or default Functions scale as provisioned by SWA integration.
- **Expected maximum:** Burst traffic handled by platform autoscale within plan limits; no fixed VM count.

### Required resources - storage

- **Minimum:** Azurite folder locally (`.azurite`); in Azure, the Storage account associated with the Functions app for triggers and runtime.
- **Maximum:** Grows with platform diagnostics and any future blob use; currently minimal for this app.

### Required resources - database

- **Minimum:** Azure SQL Database sized for development (small DTU/vCore tier).
- **Maximum:** Scale tier upward if user and bet volume grows; schema supports relational betting data in `backend/db/init.sql`.

### Required resources - metrics

- Application Insights sampling is enabled in `backend/host.json` for the Functions host; use Azure portal for function metrics, HTTP status counts, and dependency failures.

### Required resources - logging

- Function `context.log` / console output appears in Azure Functions log stream and Application Insights when configured. Local logs appear in the terminal running `func start`.

### Required resources - other

- **Secrets:** Odds API key (`SOCCER_ODDS_API`); optional social provider app IDs/secrets for Static Web Apps auth as listed in `README.md`.

## Security and access control

### Password and PII security

- **Passwords:** End users sign in via Static Web Apps identity providers (e.g. Google, Facebook, Twitter/X). The application does not implement local password storage or bcrypt-style password hashing.
- **PII:** Email (and optional nickname) stored in Azure SQL `users` and related tables. Database connections use encryption (`encrypt: true`, `trustServerCertificate: false` in `db-connect.js`). Restrict SQL firewall and use least-privilege SQL logins for production.

### Ongoing security checks

- Run `npm audit` / dependabot-style updates as part of regular maintenance.
- Review Azure SQL firewall rules and Static Web Apps authentication provider configuration when rotating secrets.
- GitHub Actions on `develop` / `main` runs lint, format, and frontend tests (`develop.yml`) to catch regressions before or alongside deploy.

## System configuration

### Configuration management

- **Application settings (Azure):** Configure in the Static Web Apps / Functions blade: `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SOCCER_ODDS_API`, `AzureWebJobsStorage`, and social auth settings per `README.md`.
- **Local Functions:** `backend/local.settings.json` (not committed) mirrors `Values` from `README.md`; use the same keys as production where applicable.
- **Frontend:** `frontend/.env` from `.env.example` (`VITE_API_BASE_URL`).
- **Repo root `.env`:** Used by `backend/scripts/initDb.js` for one-off DB initialization.

### Secrets management

- **Production:** Azure portal application settings (encrypted at rest by the platform) for connection strings and API keys.
- **CI/CD:** GitHub Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_BUSH_05638821E` for deploy workflow.
- **Local:** Developers keep secrets in `.env` and `local.settings.json`; these files must not be committed.

## System backup and restore

### Backup requirements

- **Azure SQL:** Primary data store — rely on Azure SQL automated backups (PITR) for the configured retention tier.
- **Application code:** Git repository is the source of truth.
- **Azure Static Web Apps:** Redeploy from Git to restore a known frontend/API build.

### Backup procedures

- SQL backups are automatic for Azure SQL; no application shutdown required for platform backup snapshots (verify retention in the Azure SQL blade).

### Restore procedures

- Use Azure SQL **Point-in-time restore** or geo-restore per Microsoft documentation; expect a new server or database name unless overwriting in a controlled maintenance window.
- After SQL restore, confirm application settings still point to the correct server/database and run smoke tests (`/.auth/me`, `/api/user/me`, key `/api` routes).

## Monitoring and alerting

### Log aggregation solution

- Azure Functions + Application Insights (see `host.json` `applicationInsights.samplingSettings`). Stream logs from the Functions app in Azure portal for live debugging.

### Log message format

- Standard Functions logging: textual lines from `context.log` and `console.log` / errors; stack traces on exceptions. Not a dedicated structured JSON schema company-wide.

### Events and error messages

- **HTTP handlers:** Auth failures (missing `x-ms-client-principal`), SQL errors, JSON parse errors on request bodies.
- **Timers:** Start/skip messages (e.g. gatekeeper skipping ESPN when no live games), Odds API / HTTP failures, league or event missing messages.

### Metrics

- Azure-provided: request count, duration, failures, dependency calls. Custom business metrics are not centralized in-repo beyond logs.

### Health checks

#### Health of dependencies

- **Azure SQL:** Successful API calls that use `poolPromise` indicate connectivity; failed cold start often surfaces as 500s in Functions logs.
- **Odds API / ESPN:** Observable via timer logs and external monitoring of HTTP status if you add synthetic checks.

#### Health of service

- There is **no dedicated `/health` endpoint** in the current codebase. Operational checks can use:
  - Static site load (200 on `/`).
  - An anonymous GET such as `/api/getGames` or `/api/teams` (confirm current behavior and authLevel in `backend/src/functions/*`) as a lightweight API probe.

## Operational tasks

### Deployment

- **Path:** Merge to `main` → `.github/workflows/azure-static-web-apps-lemon-bush-05638821e.yml` builds `frontend` (`output_location: dist`) and deploys `backend` as the API.
- **Rollback:** In GitHub, revert or redeploy a known-good commit to `main`, or use Azure Static Web Apps deployment history in the portal if available for the resource.
- **Pre-deploy:** Ensure `develop.yml` CI is green (lint, format, tests) for the same changes where possible.

### Batch processing

| Job                                            | Schedule                                 | Purpose                                                         |
| ---------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `ingestOddsTimer` (`soccer-odds-timer.js`)     | NCRONTAB `0 0 */4 * * *` (every 4 hours) | Fetches soccer odds for configured league/events and updates DB |
| `ingestScoresTimer` (`soccer-scores-timer.js`) | `0 */5 * * * *` (every 5 minutes)        | Updates live scores from ESPN when live games exist             |

### Power procedures

- No operator-owned physical machines. If the Azure region has an outage, follow Azure status and consider failover options configured for SQL/SWA (if any). Consumption Functions may cold-start after idle periods.

### Routine and sanity checks

- Confirm GitHub Actions success after pushes to `main` / `develop`.
- After deploy: open the site, complete `/.auth` login, verify `/api/user/me` returns profile and balance.
- Spot-check soccer data pages and timer-driven updates during a live match window.

### Troubleshooting

1. **401 / missing user:** Check `/.auth/me`, provider configuration in Azure, and that the client sends requests through SWA so `x-ms-client-principal` is populated.
2. **Database errors:** Verify `DB_*` app settings, SQL firewall (client IP for local dev), and that `init.sql` has been applied (`npm run init-db`).
3. **Timers not running:** Confirm app is deployed, `AzureWebJobsStorage` is valid in Azure (not `UseDevelopmentStorage=true`), and view Functions **Monitor** for timer executions.
4. **Odds / scores stale:** Check `SOCCER_ODDS_API` quota, ESPN availability, and timer logs for skipped runs (gatekeeper logic).

## Maintenance tasks

### Patching

#### Normal patch cycle

- Update npm dependencies in `frontend/` and `backend/`; run lint, format, and tests; merge via PR; deploy to `main`.

#### Zero-day vulnerabilities

- Prioritize framework updates (Vite, React, Azure Functions packages, `mssql`, `axios`); redeploy through the same GitHub workflow after verification.

### Daylight-saving time changes

- Database timestamps use SQL Server `GETUTCDATE()` / `DATETIME2` in schema and logic where applicable; timers use Azure Functions NCRONTAB (UTC). Display layers should format in the user’s locale as needed.

### Data cleardown

- No automated cleardown script is defined in-repo. If test data must be removed, use controlled SQL scripts or Azure SQL tools against a non-production database first.

### Log rotation

- Azure Functions / Application Insights retention is controlled in Azure; local Azurite logs live under `backend/.azurite/` (may grow — safe to delete when emulators are stopped if policies allow).

## Failover and Recovery procedures

### Failover

- **Static Web Apps / Functions:** Rely on Microsoft platform resilience; multi-region active failover is not described in-repo and would require explicit Azure architecture.
- **Azure SQL:** Use Microsoft’s documented failover groups or manual failover for critical demos if configured.

### Recovery

- Restore database from Azure SQL PITR backup; redeploy application from Git if app files or settings were lost or corrupted; re-enter or verify application settings and secrets in Azure.

### Troubleshooting Failover and Recovery

- Use Azure portal **Activity log**, **Function App** metrics and **Log stream**, **Application Insights** queries, and SQL **Query performance insight** as needed.
- Validate external dependencies (Odds API key, ESPN reachability) independently with curl or a REST client.

---

## Appendix: HTTP API surface (Azure Functions)

Routes are relative to `/api` on the Static Web Apps host (default Azure Functions prefix).

| Function              | Method | Route (under `/api`)   | Notes                                      |
| --------------------- | ------ | ---------------------- | ------------------------------------------ |
| `getGames`            | GET    | `/getGames`            | Games/odds payload for UI                  |
| `teams`               | GET    | `/teams`               | Team listing                               |
| `user-me`             | GET    | `/user/me`             | User profile; uses `x-ms-client-principal` |
| `complete-onboarding` | POST   | `/complete-onboarding` | Onboarding completion                      |
| `nfl-futures`         | GET    | `/nfl/futures`         | NFL futures data                           |
| `nfl-players`         | GET    | `/nfl/players`         | NFL players                                |
| `nfl-place-bet`       | POST   | `/nfl/bets`            | Place NFL bet                              |

Timer functions are not HTTP-callable; they run on the schedules listed under **Batch processing**.
