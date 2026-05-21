import { useEffect, useMemo, useState } from 'react';
import {
  fetchNbaScoreboardWeek,
  getNbaWeekDateKeys,
} from '../api/nba/nbaBetsClient';
import { useGlobalBetSlip } from '../context/BetSlipContext';
import {
  MARKET_KEYS,
  formatSpreadLine,
  isBettingClosed,
} from '../utils/betPayload.js';

/** Demo prices until a real odds feed is wired (decimal odds). */
const DEMO_ODDS = {
  moneyline: 1.91,
  side: 1.91,
};

/** Demo lines (static). */
const DEMO_LINES = {
  spreadAway: 5.5,
  spreadHome: -5.5,
  total: 224.5,
};

function formatKickoff(iso) {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDayHeading(iso) {
  if (!iso) return 'Date TBA';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Date TBA';
  return dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function daySortKey(iso) {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toDateString();
}

function getStatusLabel(state) {
  switch (state) {
    case 'pre':
    case 'post':
    case 'in':
      return state.toUpperCase();
    default:
      return state ? String(state).toUpperCase() : '—';
  }
}

function pickButtonClass(selected, disabled) {
  const base =
    'rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors min-w-[5.5rem]';
  if (disabled) {
    return `${base} border-sb-border bg-sb-bg/40 text-sb-muted cursor-not-allowed opacity-50`;
  }
  if (selected) {
    return `${base} border-sb-blue bg-sb-blue/15 text-sb-blue ring-1 ring-sb-blue cursor-pointer`;
  }
  return `${base} border-sb-border bg-sb-bg text-sb-text hover:border-sb-blue hover:text-sb-blue cursor-pointer`;
}

function GameCard({ game, onToggleBet, selectedBets, bettingClosed }) {
  const homeScore = game.home.score ?? null;
  const awayScore = game.away.score ?? null;
  const isFinal = game.status?.typeState === 'post';
  const closed = bettingClosed || isFinal;

  const isSel = (marketKey, outcomeLabel) =>
    selectedBets.some(
      (b) =>
        String(b.gameId) === String(game.id) &&
        b.marketKey === marketKey &&
        b.outcomeLabel === outcomeLabel,
    );

  const fire = (payload) => {
    if (closed || !onToggleBet) return;
    onToggleBet(payload);
  };

  const awayMlLabel = game.away.abbr;
  const homeMlLabel = game.home.abbr;
  const awaySpreadLine = DEMO_LINES.spreadAway;
  const homeSpreadLine = DEMO_LINES.spreadHome;
  const totalLine = DEMO_LINES.total;

  return (
    <div className="rounded-xl border border-sb-border bg-sb-bg/60 overflow-hidden">
      <div className="p-4 border-b border-sb-border flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-sb-muted font-bold">
            {game.league} • {game.seasonDisplay}
          </div>
          <div className="text-sb-text font-extrabold text-lg mt-1">
            {game.away.abbr} @ {game.home.abbr}
          </div>
          <div className="text-sb-muted text-sm mt-1">
            {formatKickoff(game.startDate)} •{' '}
            {getStatusLabel(game.status?.typeState)}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sb-muted text-xs font-bold">
              {game.home.abbr}
            </div>
            <div
              className={`text-2xl font-extrabold ${isFinal ? 'text-sb-text' : 'text-sb-blue'}`}
            >
              {homeScore !== null ? homeScore : '—'}
            </div>
          </div>
          <div className="text-left">
            <div className="text-sb-muted text-xs font-bold">
              {game.away.abbr}
            </div>
            <div
              className={`text-2xl font-extrabold ${isFinal ? 'text-sb-text' : 'text-sb-blue'}`}
            >
              {awayScore !== null ? awayScore : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-sb-border/80">
        <div className="text-sb-text font-extrabold text-sm">
          {game.away.name} vs {game.home.name}
        </div>
        <div className="text-sb-muted text-xs mt-1">
          {game.status?.clock
            ? `Clock: ${game.status.clock}`
            : 'Tip-off clock not provided'}
        </div>
        <p className="text-sb-muted text-[0.65rem] mt-2 mb-0">
          Lines below are placeholders for slip checkout until a real odds API
          is connected.
        </p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] font-bold text-sb-muted tracking-widest uppercase">
            Moneyline
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={pickButtonClass(
                isSel(MARKET_KEYS.H2H, awayMlLabel),
                closed,
              )}
              disabled={closed}
              onClick={() =>
                fire({
                  gameId: String(game.id),
                  leagueId: 'nba',
                  sport: 'basketball',
                  marketKey: MARKET_KEYS.H2H,
                  selectionId: `nba-${game.id}-h2h-away`,
                  outcomeLabel: awayMlLabel,
                  odds: DEMO_ODDS.moneyline,
                  lineValue: null,
                  gameName: `${game.away.abbr} @ ${game.home.abbr}`,
                  betType: 'Moneyline',
                  betTeam: game.away.name,
                })
              }
            >
              <span className="block">{awayMlLabel}</span>
              <span className="block text-sb-blue">{DEMO_ODDS.moneyline}</span>
            </button>
            <button
              type="button"
              className={pickButtonClass(
                isSel(MARKET_KEYS.H2H, homeMlLabel),
                closed,
              )}
              disabled={closed}
              onClick={() =>
                fire({
                  gameId: String(game.id),
                  leagueId: 'nba',
                  sport: 'basketball',
                  marketKey: MARKET_KEYS.H2H,
                  selectionId: `nba-${game.id}-h2h-home`,
                  outcomeLabel: homeMlLabel,
                  odds: DEMO_ODDS.moneyline,
                  lineValue: null,
                  gameName: `${game.away.abbr} @ ${game.home.abbr}`,
                  betType: 'Moneyline',
                  betTeam: game.home.name,
                })
              }
            >
              <span className="block">{homeMlLabel}</span>
              <span className="block text-sb-blue">{DEMO_ODDS.moneyline}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] font-bold text-sb-muted tracking-widest uppercase">
            Spread
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={pickButtonClass(
                isSel(
                  MARKET_KEYS.SPREADS,
                  `${game.away.abbr} ${formatSpreadLine(awaySpreadLine)}`,
                ),
                closed,
              )}
              disabled={closed}
              onClick={() =>
                fire({
                  gameId: String(game.id),
                  leagueId: 'nba',
                  sport: 'basketball',
                  marketKey: MARKET_KEYS.SPREADS,
                  selectionId: `nba-${game.id}-spreads-away`,
                  outcomeLabel: `${game.away.abbr} ${formatSpreadLine(awaySpreadLine)}`,
                  odds: DEMO_ODDS.side,
                  lineValue: awaySpreadLine,
                  gameName: `${game.away.abbr} @ ${game.home.abbr}`,
                  betType: 'Spread',
                  betTeam: game.away.name,
                })
              }
            >
              <span className="block">{game.away.abbr}</span>
              <span className="block">{formatSpreadLine(awaySpreadLine)}</span>
              <span className="block text-sb-blue">{DEMO_ODDS.side}</span>
            </button>
            <button
              type="button"
              className={pickButtonClass(
                isSel(
                  MARKET_KEYS.SPREADS,
                  `${game.home.abbr} ${formatSpreadLine(homeSpreadLine)}`,
                ),
                closed,
              )}
              disabled={closed}
              onClick={() =>
                fire({
                  gameId: String(game.id),
                  leagueId: 'nba',
                  sport: 'basketball',
                  marketKey: MARKET_KEYS.SPREADS,
                  selectionId: `nba-${game.id}-spreads-home`,
                  outcomeLabel: `${game.home.abbr} ${formatSpreadLine(homeSpreadLine)}`,
                  odds: DEMO_ODDS.side,
                  lineValue: homeSpreadLine,
                  gameName: `${game.away.abbr} @ ${game.home.abbr}`,
                  betType: 'Spread',
                  betTeam: game.home.name,
                })
              }
            >
              <span className="block">{game.home.abbr}</span>
              <span className="block">{formatSpreadLine(homeSpreadLine)}</span>
              <span className="block text-sb-blue">{DEMO_ODDS.side}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] font-bold text-sb-muted tracking-widest uppercase">
            Total ({totalLine})
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={pickButtonClass(
                isSel(MARKET_KEYS.TOTALS, `Over ${totalLine}`),
                closed,
              )}
              disabled={closed}
              onClick={() =>
                fire({
                  gameId: String(game.id),
                  leagueId: 'nba',
                  sport: 'basketball',
                  marketKey: MARKET_KEYS.TOTALS,
                  selectionId: `nba-${game.id}-totals-over`,
                  outcomeLabel: `Over ${totalLine}`,
                  odds: DEMO_ODDS.side,
                  lineValue: totalLine,
                  gameName: `${game.away.abbr} @ ${game.home.abbr}`,
                  betType: 'Over/Under',
                  betTeam: '',
                })
              }
            >
              <span className="block">Over</span>
              <span className="block text-sb-blue">{DEMO_ODDS.side}</span>
            </button>
            <button
              type="button"
              className={pickButtonClass(
                isSel(MARKET_KEYS.TOTALS, `Under ${totalLine}`),
                closed,
              )}
              disabled={closed}
              onClick={() =>
                fire({
                  gameId: String(game.id),
                  leagueId: 'nba',
                  sport: 'basketball',
                  marketKey: MARKET_KEYS.TOTALS,
                  selectionId: `nba-${game.id}-totals-under`,
                  outcomeLabel: `Under ${totalLine}`,
                  odds: DEMO_ODDS.side,
                  lineValue: totalLine,
                  gameName: `${game.away.abbr} @ ${game.home.abbr}`,
                  betType: 'Over/Under',
                  betTeam: '',
                })
              }
            >
              <span className="block">Under</span>
              <span className="block text-sb-blue">{DEMO_ODDS.side}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NBABets() {
  const { toggleSelection, pruneSelectionsForGames, selections } =
    useGlobalBetSlip();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('games');
  const weekRangeLabel = useMemo(() => {
    const keys = getNbaWeekDateKeys(new Date());
    if (keys.length < 2) return '';
    const start = keys[0];
    const end = keys[6];
    const fmt = (ymd) => {
      const y = Number(ymd.slice(0, 4));
      const m = Number(ymd.slice(4, 6)) - 1;
      const day = Number(ymd.slice(6, 8));
      return new Date(y, m, day);
    };
    const a = fmt(start);
    const b = fmt(end);
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const right = b.toLocaleDateString(
      undefined,
      sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
    );
    return `${left} – ${right}`;
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await fetchNbaScoreboardWeek();
        if (!alive) return;
        setGames(result);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError('Failed to load NBA matchups from ESPN.');
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (games.length > 0) {
      pruneSelectionsForGames(games);
    }
  }, [games, pruneSelectionsForGames]);

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => {
      return (
        g.home.abbr.toLowerCase().includes(q) ||
        g.away.abbr.toLowerCase().includes(q) ||
        g.home.name.toLowerCase().includes(q) ||
        g.away.name.toLowerCase().includes(q)
      );
    });
  }, [games, search]);

  const gamesByDay = useMemo(() => {
    const sections = [];
    let currentKey = null;
    let bucket = [];
    for (const g of filteredGames) {
      const key = daySortKey(g.startDate) || 'unknown';
      if (key !== currentKey) {
        if (bucket.length) {
          sections.push({
            dayKey: currentKey,
            heading: formatDayHeading(bucket[0].startDate),
            games: bucket,
          });
        }
        currentKey = key;
        bucket = [g];
      } else {
        bucket.push(g);
      }
    }
    if (bucket.length) {
      sections.push({
        dayKey: currentKey,
        heading: formatDayHeading(bucket[0].startDate),
        games: bucket,
      });
    }
    return sections;
  }, [filteredGames]);

  return (
    <div className={`text-sb-text ${tab === 'games' ? 'pb-48' : ''}`}>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="text-3xl font-extrabold tracking-wide">🏀 NBA</h1>
        <span className="text-[0.7rem] font-bold tracking-widest uppercase border border-sb-blue/50 text-sb-blue px-3 py-1.5 rounded-full bg-sb-bg/60">
          🔄 This week (Sun–Sat) • ESPN
        </span>
        {weekRangeLabel ? (
          <span className="text-sb-muted text-sm font-semibold">
            {weekRangeLabel}
          </span>
        ) : null}
        {loading && <span className="text-sb-muted text-sm">Loading…</span>}
        {selections.length > 0 ? (
          <span className="text-[0.7rem] font-extrabold tracking-widest uppercase border border-[#00f6ff]/40 text-[#00f6ff] px-3 py-1.5 rounded-full bg-[#00f6ff]/10">
            Bet slip: {selections.length} pick
            {selections.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {tab === 'games' && (
        <p className="text-sb-muted text-sm mb-4 m-0">
          Tap <span className="text-sb-text font-semibold">Moneyline</span>,{' '}
          <span className="text-sb-text font-semibold">Spread</span>, or{' '}
          <span className="text-sb-text font-semibold">Total</span> on a game —
          the bet slip opens at the bottom of the screen.
        </p>
      )}

      <div className="flex gap-2 mb-6 border-b border-sb-border flex-wrap">
        <button
          type="button"
          onClick={() => setTab('games')}
          className={
            tab === 'games'
              ? 'px-4 py-2 text-xs font-extrabold rounded-t-xl bg-sb-blue text-sb-dark border-x border-t border-sb-blue'
              : 'px-4 py-2 text-xs font-extrabold rounded-t-xl bg-transparent text-sb-muted hover:text-sb-blue hover:border-t hover:border-sb-blue border border-transparent'
          }
        >
          Matchups
        </button>
        <button
          type="button"
          onClick={() => setTab('futures')}
          className={
            tab === 'futures'
              ? 'px-4 py-2 text-xs font-extrabold rounded-t-xl bg-sb-blue text-sb-dark border-x border-t border-sb-blue'
              : 'px-4 py-2 text-xs font-extrabold rounded-t-xl bg-transparent text-sb-muted hover:text-sb-blue hover:border-t hover:border-sb-blue border border-transparent'
          }
        >
          Futures
        </button>
      </div>

      {tab === 'games' && (
        <>
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-sb-bg border border-sb-border rounded-xl px-4 py-2 text-sb-text text-sm outline-none focus:border-sb-blue focus:ring-1 focus:ring-sb-blue w-[260px]"
            />

            <div className="ml-auto text-sb-muted text-sm">
              {filteredGames.length} game{filteredGames.length === 1 ? '' : 's'}
            </div>
          </div>

          {error && <p className="text-sb-error">{error}</p>}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-sb-border bg-sb-bg/60 p-4 animate-pulse"
                >
                  <div className="h-4 w-[60%] bg-sb-muted/40 rounded mb-3" />
                  <div className="h-4 w-[80%] bg-sb-muted/30 rounded mb-2" />
                  <div className="h-20 w-full bg-sb-muted/20 rounded" />
                </div>
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <p className="text-sb-muted">No matchups found.</p>
          ) : (
            <div className="flex flex-col gap-8">
              {gamesByDay.map(({ dayKey, heading, games: dayGames }) => (
                <section key={dayKey || heading}>
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-sb-muted border-b border-sb-border pb-2 mb-4">
                    {heading}
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {dayGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onToggleBet={toggleSelection}
                        selectedBets={selections}
                        bettingClosed={isBettingClosed(game)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'futures' && (
        <div className="rounded-xl border border-sb-border bg-sb-bg/60 p-5">
          <h2 className="text-lg font-extrabold text-sb-text m-0">
            Futures & awards
          </h2>
          <p className="text-sb-muted text-sm mt-2 m-0">
            ESPN's NBA scoreboard endpoint provides matchups and scores, but it
            doesn't include futures/awards markets. Connect your existing odds
            API (or futures endpoint) and we'll render them here.
          </p>
        </div>
      )}
    </div>
  );
}
