import { useEffect, useMemo, useState } from 'react';
import {
  fetchUfcRankings,
  fetchUfcFightsWeek,
  getUfcWeekDateKeys,
} from '../api/ufc/ufcBetsClient';

function formatStart(iso) {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

function FightCard({ fight }) {
  const isFinal = fight.status?.typeState === 'post';
  const leftHighlight = isFinal && fight.winnerSide === 'away';
  const rightHighlight = isFinal && fight.winnerSide === 'home';

  return (
    <div className="rounded-xl border border-sb-border bg-sb-bg/60 overflow-hidden">
      <div className="p-4 border-b border-sb-border flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-sb-muted font-bold">
            {fight.league} · {fight.seasonDisplay}
            {fight.isTitleFight ? (
              <span className="ml-2 text-amber-400/90">· Title</span>
            ) : null}
            {fight.isMainEvent ? (
              <span className="ml-2 text-sb-blue/90">· Main</span>
            ) : null}
          </div>
          <div className="text-sb-text font-extrabold text-lg mt-1">
            {fight.away.abbr} <span className="text-sb-muted">vs</span>{' '}
            {fight.home.abbr}
          </div>
          <div className="text-sb-muted text-sm mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            <span>{formatStart(fight.startDate)}</span>
            <span>·</span>
            <span>{getStatusLabel(fight.status?.typeState)}</span>
            {fight.venueLine ? (
              <>
                <span>·</span>
                <span className="truncate max-w-full">{fight.venueLine}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="text-right min-w-[100px]">
          <div className="text-[0.65rem] font-bold text-sb-muted tracking-widest uppercase">
            Class
          </div>
          <div className="text-sm font-extrabold text-sb-text mt-0.5 text-right">
            {fight.weightClass || '—'}
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-sb-border/80 flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="text-right flex-1 min-w-0">
            <div className="text-sb-muted text-xs font-bold">
              {fight.away.abbr}
            </div>
            <div
              className={`text-2xl font-extrabold ${
                leftHighlight
                  ? 'text-emerald-400'
                  : isFinal
                    ? 'text-sb-text'
                    : 'text-sb-blue'
              }`}
            >
              {fight.away.record}
            </div>
            <div className="text-sb-muted text-[0.7rem] mt-0.5">Record</div>
            <div className="text-sb-text/90 text-sm font-semibold mt-1 line-clamp-2">
              {fight.away.name}
            </div>
          </div>
          <div className="text-sb-muted text-sm font-extrabold pt-4">—</div>
          <div className="text-left flex-1 min-w-0">
            <div className="text-sb-muted text-xs font-bold">
              {fight.home.abbr}
            </div>
            <div
              className={`text-2xl font-extrabold ${
                rightHighlight
                  ? 'text-emerald-400'
                  : isFinal
                    ? 'text-sb-text'
                    : 'text-sb-blue'
              }`}
            >
              {fight.home.record}
            </div>
            <div className="text-sb-muted text-[0.7rem] mt-0.5">Record</div>
            <div className="text-sb-text/90 text-sm font-semibold mt-1 line-clamp-2">
              {fight.home.name}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0 text-sb-muted text-xs">
          {fight.status?.clock ? (
            <span className="text-sb-text/80">{fight.status.clock}</span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-sb-border bg-sb-bg px-3 py-2 text-xs font-extrabold text-sb-text hover:border-sb-blue hover:text-sb-blue transition-colors cursor-pointer"
            disabled
            title="Connect odds to enable moneyline."
          >
            Moneyline
          </button>
          <button
            type="button"
            className="rounded-lg border border-sb-border bg-sb-bg px-3 py-2 text-xs font-extrabold text-sb-text hover:border-sb-blue hover:text-sb-blue transition-colors cursor-pointer"
            disabled
            title="Connect odds to enable props."
          >
            Spread
          </button>
          <button
            type="button"
            className="rounded-lg border border-sb-border bg-sb-bg px-3 py-2 text-xs font-extrabold text-sb-text hover:border-sb-blue hover:text-sb-blue transition-colors cursor-pointer"
            disabled
            title="Connect odds to enable totals."
          >
            Total
          </button>
        </div>
      </div>
    </div>
  );
}

function RankingsView({ data, error, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-sb-border bg-sb-bg/60 p-4 animate-pulse h-40"
          />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-sb-error">{error}</p>;
  }
  if (!data?.length) {
    return <p className="text-sb-muted">No rankings data.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {data.map((block) => {
        const title = block.name || block.weight_class?.name || 'Rankings';
        const abbr = block.weight_class?.abbreviation;
        return (
          <div
            key={String(block.id ?? title)}
            className="rounded-xl border border-sb-border bg-sb-bg/60 p-4"
          >
            <h3 className="text-sb-text font-extrabold m-0 text-base">
              {title}
              {abbr ? (
                <span className="text-sb-muted font-semibold"> ({abbr})</span>
              ) : null}
            </h3>
            <ol className="list-none p-0 m-0 mt-3 space-y-2">
              {(block.rankings || []).slice(0, 16).map((r) => (
                <li
                  key={`${r.rank}-${r.fighter?.name || ''}`}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <span className="text-sb-muted w-8 shrink-0">#{r.rank}</span>
                  <span className="text-sb-text font-semibold flex-1 min-w-0 truncate">
                    {r.fighter?.name || '—'}
                    {r.is_champion ? (
                      <span className="ml-1 text-amber-400/90">· C</span>
                    ) : null}
                    {r.is_interim_champion ? (
                      <span className="ml-1 text-sb-blue/80">· IC</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

export default function UFCBets() {
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('fights');
  const [rankings, setRankings] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState('');

  const weekRangeLabel = useMemo(() => {
    const keys = getUfcWeekDateKeys(new Date());
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
        const result = await fetchUfcFightsWeek();
        if (!alive) return;
        setFights(result);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError(e?.message || 'Failed to load UFC matchups from ESPN.');
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
    if (tab !== 'futures') return;
    if (rankings.length > 0) return;

    let alive = true;
    (async () => {
      setRankingsLoading(true);
      setRankingsError('');
      try {
        const r = await fetchUfcRankings();
        if (!alive) return;
        setRankings(r);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setRankingsError(e?.message || 'Failed to load rankings.');
      } finally {
        if (alive) {
          setRankingsLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, rankings.length]);

  const filteredFights = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fights;
    return fights.filter((f) => {
      const w = f.weightClass?.toLowerCase() ?? '';
      return (
        f.home.abbr.toLowerCase().includes(q) ||
        f.away.abbr.toLowerCase().includes(q) ||
        f.home.name.toLowerCase().includes(q) ||
        f.away.name.toLowerCase().includes(q) ||
        f.seasonDisplay.toLowerCase().includes(q) ||
        w.includes(q)
      );
    });
  }, [fights, search]);

  const fightsByDay = useMemo(() => {
    const sections = [];
    let currentKey = null;
    let bucket = [];
    for (const f of filteredFights) {
      const key = daySortKey(f.startDate) || 'unknown';
      if (key !== currentKey) {
        if (bucket.length) {
          sections.push({
            dayKey: currentKey,
            heading: formatDayHeading(bucket[0].startDate),
            fights: bucket,
          });
        }
        currentKey = key;
        bucket = [f];
      } else {
        bucket.push(f);
      }
    }
    if (bucket.length) {
      sections.push({
        dayKey: currentKey,
        heading: formatDayHeading(bucket[0].startDate),
        fights: bucket,
      });
    }
    return sections;
  }, [filteredFights]);

  return (
    <div className="text-sb-text">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="text-3xl font-extrabold tracking-wide">🥊 UFC</h1>
        <span className="text-[0.7rem] font-bold tracking-widest uppercase border border-sb-blue/50 text-sb-blue px-3 py-1.5 rounded-full bg-sb-bg/60">
          🔎 This week (Sun–Sat) · ESPN
        </span>
        {weekRangeLabel ? (
          <span className="text-sb-muted text-sm font-semibold">
            {weekRangeLabel}
          </span>
        ) : null}
        {loading && <span className="text-sb-muted text-sm">Loading…</span>}
      </div>

      <div className="flex gap-2 mb-6 border-b border-sb-border flex-wrap">
        <button
          type="button"
          onClick={() => setTab('fights')}
          className={
            tab === 'fights'
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

      {tab === 'fights' && (
        <>
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by fighter, event, or weight class…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-sb-bg border border-sb-border rounded-xl px-4 py-2 text-sb-text text-sm outline-none focus:border-sb-blue focus:ring-1 focus:ring-sb-blue w-[min(100%,360px)]"
            />

            <div className="ml-auto text-sb-muted text-sm">
              {filteredFights.length} fight
              {filteredFights.length === 1 ? '' : 's'}
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
          ) : filteredFights.length === 0 ? (
            <p className="text-sb-muted">
              No matchups in this week’s window, or the schedule is not
              published yet.
            </p>
          ) : (
            <div className="flex flex-col gap-8">
              {fightsByDay.map(({ dayKey, heading, fights: dayFights }) => (
                <section key={dayKey || heading}>
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-sb-muted border-b border-sb-border pb-2 mb-4">
                    {heading}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 max-w-4xl">
                    {dayFights.map((fight) => (
                      <FightCard key={fight.id} fight={fight} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'futures' && (
        <div>
          <div className="rounded-xl border border-sb-border bg-sb-bg/60 p-5 mb-6">
            <h2 className="text-lg font-extrabold text-sb-text m-0">
              Futures & rankings
            </h2>
            <p className="text-sb-muted text-sm mt-2 m-0">
              ESPN <code className="text-sb-text/90">/mma/ufc/rankings</code>{' '}
              (P4P and division lists). This is not a live betting line feed.
            </p>
          </div>
          <RankingsView
            data={rankings}
            error={rankingsError}
            loading={rankingsLoading}
          />
        </div>
      )}
    </div>
  );
}
