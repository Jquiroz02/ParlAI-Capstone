# Network Model – UFC Bets Feature

```
User Browser (localhost:4280 / Azure Static Web Apps)
     │
     ├──► GET https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard
     │         │     (optional query: ?dates=YYYYMMDD — one call per day for Sun–Sat week)
     │         │
     │         └──► ESPN public scoreboard API
     │               └── Returns UFC events + competitions (bouts): matchups, start times,
     │                   status (pre / in / post), fighter records, weight class — no
     │                   ParlAI backend hop for this schedule data
     │
     ├──► (Optional) GET https://site.api.espn.com/apis/site/v2/sports/mma/ufc/summary?event={EVENT_ID}
     │         │
     │         └──► ESPN event summary API
     │               └── Returns additional event-level + bout detail (when available)
     │                   Note: some public event IDs may 404 depending on ESPN exposure/region
     │
     ├──► (Optional) GET https://site.api.espn.com/apis/site/v2/sports/mma/ufc/rankings
     │         │
     │         └──► ESPN rankings API
     │               └── Returns P4P + division rankings (used to populate the UFC “Futures” tab)
     │
     ├──► (Planned) GET /api/ufc/futures
     │         │
     │         └──► ufc-futures Azure Function
     │               └──► Third-party odds / futures API (ESPN scoreboard does not expose betting markets)
     │
     └──► (Planned) POST /api/ufc/bets
               │
               └──► ufc-place-bet Azure Function
                         │
                         ├──► Verify auth (x-ms-client-principal)
                         ├──► Check user balance (users table)
                         ├──► Insert bet (bets table)
                         ├──► Deduct stake (users.balance)
                         └──► Log transaction (wallet_ledger table)
```

## Notes (vs NBA)

| Aspect | NBA (reference) | UFC (this feature) |
|--------|------------------|--------------------|
| **Schedule + matchups** | Browser → **ESPN** NBA scoreboard directly | Browser → **ESPN** UFC scoreboard directly |
| **Week view** | Frontend requests **up to 7** `dates=` values (Sun–Sat), merges results | Same pattern: **up to 7** `dates=` values (Sun–Sat), merges results |
| **Fighter records + weight class** | N/A (teams + scores) | Included in ESPN UFC scoreboard competitions: competitor records + `type.abbreviation` (weight class) |
| **Event details** | (Optional) `summary?event={id}` works for many sports | `summary?event={EVENT_ID}` may be available for some UFC events; treat 404 as “not available” |
| **Futures** | NBA page has placeholder (ESPN scoreboard doesn’t provide futures) | UFC page uses ESPN **rankings** for “Futures” until an odds provider is wired |
| **Betting** | POST `/api/nba/bets` wired; UI markets disabled | POST `/api/ufc/bets` planned; UI markets disabled until odds + backend are ready |

Frontend API base for **`/api/*`** (when used): `VITE_API_BASE_URL` or same-origin **`/api`** behind Static Web Apps → Functions.

