# Network Model – NBA Bets Feature

```
User Browser (localhost:4280 / Azure Static Web Apps)
     │
     ├──► GET https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
     │         │     (optional query: ?dates=YYYYMMDD — one call per day for Sun–Sat week)
     │         │
     │         └──► ESPN public scoreboard API
     │               └── Returns NBA events: matchups, tip times, status (pre / in / post),
     │                   scores, game clock — no ParlAI backend hop for this data
     │
     ├──► (Planned) GET /api/nba/futures
     │         │
     │         └──► nba-futures Azure Function
     │               └──► Third-party odds / futures API (ESPN scoreboard does not expose futures)
     │
     └──► (Planned) POST /api/nba/bets
               │
               └──► nba-place-bet Azure Function
                         │
                         ├──► Verify auth (x-ms-client-principal)
                         ├──► Check user balance (users table)
                         ├──► Insert bet (bets table)
                         ├──► Deduct stake (users.balance)
                         └──► Log transaction (wallet_ledger table)
```

## Notes (vs NFL)

| Aspect | NFL (reference) | NBA (this feature) |
|--------|-----------------|---------------------|
| **Player / game list** | Browser → **your** `/api/nfl/...` → Function → SQL cache → Sleeper | Browser → **ESPN** scoreboard **directly** (no Azure Function, no SQL cache for matchups today) |
| **Week view** | N/A in diagram | Frontend requests **up to 7** `dates=` values for the current Sun–Sat week, merges results |
| **Futures** | `/api/nfl/futures` → Function | **UI placeholder**; would need **`/api/nba/futures`** + provider, not ESPN scoreboard |
| **Betting** | POST `/api/nfl/bets` | POST `/api/nba/bets` **wired in client**; **UI markets disabled** until odds + backend are ready |

Frontend API base for **`/api/*`** (when used): `VITE_API_BASE_URL` or same-origin **`/api`** behind Static Web Apps → Functions.
