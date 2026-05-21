import { useEffect, useState } from 'react';

const API_BASE = '/api';

// ── TEAM COLORS ───────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  EDM: '#FF4C00',
  COL: '#6F263D',
  TOR: '#003E7E',
  BOS: '#FFB81C',
  TBL: '#002868',
  NYR: '#0038A8',
  CAR: '#CC0000',
  FLA: '#C8102E',
  VGK: '#B4975A',
  DAL: '#006847',
  MIN: '#154734',
  WSH: '#041E42',
  PIT: '#FCB514',
  CHI: '#CF0A2C',
  MTL: '#AF1E2D',
  OTT: '#C52032',
  VAN: '#00843D',
  CGY: '#C8102E',
  WPG: '#004C97',
  ARI: '#8C2633',
  PHI: '#F74902',
  NJD: '#CE1126',
  NYI: '#00539B',
  DET: '#CE1126',
  STL: '#002F87',
  NSH: '#FFB81C',
  ANA: '#F47A38',
  LAK: '#111111',
  SJS: '#006D75',
  CBJ: '#002654',
  BUF: '#003399',
  SEA: '#001628',
};

// ── PROP LINE CALCULATOR ──────────────────────────────────────────────────────
function calcPropLine(value) {
  if (!value) return null;
  const projected = Math.round(value * 0.95);
  return projected + 0.5;
}

// ── FILTERS ───────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: '🔥 All' },
  { key: 'C', label: 'Centers' },
  { key: 'LW', label: 'Left Wings' },
  { key: 'RW', label: 'Right Wings' },
  { key: 'D', label: 'Defense' },
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'points', label: 'Points' },
];

const TABS = [
  { key: 'props', label: 'Player Props' },
  { key: 'scores', label: 'Live Scores' },
];

// ── STAT DISPLAY HELPER ───────────────────────────────────────────────────────
function getDisplayStat(player, filter) {
  if (filter === 'goals')
    return player.goals
      ? {
          val: calcPropLine(player.goals),
          raw: player.goals,
          lbl: '2025 Goals',
        }
      : null;
  if (filter === 'assists')
    return player.assists
      ? {
          val: calcPropLine(player.assists),
          raw: player.assists,
          lbl: '2025 Assists',
        }
      : null;
  if (filter === 'points')
    return player.points
      ? {
          val: calcPropLine(player.points),
          raw: player.points,
          lbl: '2025 Points',
        }
      : null;

  // Default by position
  if (player.position === 'G')
    return player.goals
      ? {
          val: calcPropLine(player.goals),
          raw: player.goals,
          lbl: '2025 Goals',
        }
      : null;

  if (player.points)
    return {
      val: calcPropLine(player.points),
      raw: player.points,
      lbl: '2025 Points',
    };
  if (player.goals)
    return {
      val: calcPropLine(player.goals),
      raw: player.goals,
      lbl: '2025 Goals',
    };
  if (player.assists)
    return {
      val: calcPropLine(player.assists),
      raw: player.assists,
      lbl: '2025 Assists',
    };

  return null;
}

// ── EXTRA STATS HELPER ────────────────────────────────────────────────────────
function getExtraStats(player, mainLbl) {
  const extras = [];
  if (player.goals && mainLbl !== '2025 Goals')
    extras.push({ val: calcPropLine(player.goals), lbl: 'Goals' });
  if (player.assists && mainLbl !== '2025 Assists')
    extras.push({ val: calcPropLine(player.assists), lbl: 'Assists' });
  if (player.points && mainLbl !== '2025 Points')
    extras.push({ val: calcPropLine(player.points), lbl: 'Points' });
  if (player.shots)
    extras.push({ val: calcPropLine(player.shots), lbl: 'Shots' });
  return extras;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 999,
        background: '#11131a',
        border: '1px solid #00f6ff',
        color: '#f3f4f6',
        padding: '0.85rem 1.2rem',
        borderRadius: '12px',
        fontSize: '0.84rem',
        lineHeight: 1.5,
        whiteSpace: 'pre-line',
        boxShadow: '0 0 24px rgba(0,246,255,0.2)',
        maxWidth: '280px',
      }}
    >
      {message}
    </div>
  );
}

// ── BET MODAL ─────────────────────────────────────────────────────────────────
function BetModal({ bet, onClose, onConfirm }) {
  const [stake, setStake] = useState(10);
  const odds = 1.9;
  const payout = (stake * odds).toFixed(2);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#11131a',
          border: '1px solid #00f6ff',
          borderRadius: '16px',
          padding: '1.5rem',
          width: '320px',
          boxShadow: '0 0 40px rgba(0,246,255,0.2)',
        }}
      >
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: '#f3f4f6',
          }}
        >
          Place Bet
        </h3>
        <p
          style={{
            fontSize: '0.82rem',
            color: '#9ca3af',
            marginBottom: '0.4rem',
          }}
        >
          {bet.playerName}
        </p>
        <p
          style={{
            fontSize: '0.9rem',
            color: '#f3f4f6',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          {bet.direction === 'more' ? '↑ More' : '↓ Less'} than{' '}
          <span style={{ color: '#00f6ff' }}>{bet.statValue}</span>{' '}
          {bet.statLabel}
        </p>

        <p
          style={{
            fontSize: '0.7rem',
            color: '#9ca3af',
            marginBottom: '1rem',
            background: '#0d0f14',
            padding: '6px 10px',
            borderRadius: '6px',
          }}
        >
          📊 2024 actual: {Math.round(bet.rawValue)}{' '}
          {bet.statLabel.replace('2025 ', '')}
        </p>

        <label
          style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            display: 'block',
            marginBottom: '0.3rem',
          }}
        >
          Stake ($)
        </label>
        <input
          type="number"
          min="1"
          value={stake}
          onChange={(e) => setStake(Number(e.target.value))}
          style={{
            width: '100%',
            background: '#0d0f14',
            border: '1px solid #404040',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            color: '#f3f4f6',
            fontSize: '1rem',
            outline: 'none',
            marginBottom: '0.8rem',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#9ca3af',
            marginBottom: '0.6rem',
          }}
        >
          <span>Odds</span>
          <span style={{ color: '#00f6ff', fontWeight: 700 }}>
            {odds} (~-110)
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#9ca3af',
            marginBottom: '1.2rem',
          }}
        >
          <span>Potential Payout</span>
          <span style={{ color: '#00c853', fontWeight: 700 }}>${payout}</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid #404040',
              color: '#9ca3af',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ ...bet, stake })}
            style={{
              padding: '0.6rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: '#00f6ff',
              border: 'none',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            Confirm Bet
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PLAYER CARD ───────────────────────────────────────────────────────────────
function PlayerCard({ player, filter, onBet }) {
  const stat = getDisplayStat(player, filter);
  if (!stat) return null;

  const color = TEAM_COLORS[player.team] || '#00f6ff';
  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  const extras = getExtraStats(player, stat.lbl);

  return (
    <div
      style={{
        background: '#11131a',
        border: '1px solid #1f2430',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#00f6ff';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(0,246,255,0.15)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1f2430';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${color}22 0%, #11131a 100%)`,
          padding: '1.2rem 1rem 0.9rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: `${color}18`,
            border: `2px solid ${color}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.6rem',
          }}
        >
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color }}>
            {initials}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#00f6ff',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          {player.team} – {player.position}
        </span>
        <span
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#f3f4f6',
            marginTop: 2,
            textAlign: 'center',
          }}
        >
          {player.name}
        </span>
        <span style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 3 }}>
          2025 Season Projection
        </span>
      </div>

      <div style={{ padding: '0.9rem 1rem', borderTop: '1px solid #1f2430' }}>
        <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#f3f4f6',
              lineHeight: 1,
            }}
          >
            {stat.val}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>
            {stat.lbl}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7494', marginTop: 4 }}>
            2024 actual: {Math.round(stat.raw)}
          </div>
        </div>

        {extras.length > 0 && (
          <div style={{ marginBottom: '0.7rem' }}>
            {extras.slice(0, 3).map((s) => (
              <div
                key={s.lbl}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2px 0',
                  borderBottom: '1px solid #1f243033',
                }}
              >
                <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                  {s.lbl}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6b7494',
                  }}
                >
                  {s.val}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={() =>
              onBet({
                playerName: player.name,
                statLabel: stat.lbl,
                statValue: stat.val,
                rawValue: stat.raw,
                direction: 'less',
              })
            }
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'rgba(255,61,87,0.1)',
              border: '1px solid rgba(255,61,87,0.3)',
              color: '#ff3d57',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'background 0.18s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,61,87,0.22)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(255,61,87,0.1)')
            }
          >
            ↓ Less
          </button>
          <button
            onClick={() =>
              onBet({
                playerName: player.name,
                statLabel: stat.lbl,
                statValue: stat.val,
                rawValue: stat.raw,
                direction: 'more',
              })
            }
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'rgba(0,246,255,0.08)',
              border: '1px solid rgba(0,246,255,0.3)',
              color: '#00f6ff',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'background 0.18s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(0,246,255,0.18)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(0,246,255,0.08)')
            }
          >
            ↑ More
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SKELETON CARD ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: '#11131a',
        border: '1px solid #1f2430',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 160,
          background:
            'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }}
      />
      <div style={{ padding: '0.9rem 1rem' }}>
        {[60, 80, 100].map((w) => (
          <div
            key={w}
            style={{
              height: 12,
              width: `${w}%`,
              borderRadius: 6,
              background:
                'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
              marginBottom: 8,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── LIVE SCORES TAB ───────────────────────────────────────────────────────────
const ESPN_NHL_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard';

function LiveScores() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(ESPN_NHL_SCOREBOARD);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setGames(data.events ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-sb-muted">Loading scores...</p>;
  if (error) return <p className="text-sb-error">{error}</p>;
  if (games.length === 0)
    return <p className="text-sb-muted">No games scheduled today.</p>;

  return (
    <div className="space-y-3">
      {games.map((game) => {
        const comp = game.competitions?.[0];
        const home = comp?.competitors?.find((c) => c.homeAway === 'home');
        const away = comp?.competitors?.find((c) => c.homeAway === 'away');
        if (!home || !away) return null;
        const isLive = game.status?.type?.state === 'in';
        const isFinished = game.status?.type?.state === 'post';

        return (
          <div
            key={game.id}
            className={`rounded-xl border p-4 ${isLive ? 'border-[#00f6ff44] bg-[#050e14]' : 'border-[#1a2535] bg-[#060c12]'} ${isFinished ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {away.team.logo && (
                  <img
                    src={away.team.logo}
                    alt={away.team.displayName}
                    className="w-8 h-8 object-contain"
                  />
                )}
                <span className="font-bold text-sb-text text-sm">
                  {away.team.displayName}
                </span>
              </div>
              <div className="text-center px-4">
                {isLive || isFinished ? (
                  <span className="text-xl font-black text-white">
                    {away.score} – {home.score}
                  </span>
                ) : (
                  <span className="text-sb-muted text-sm">
                    {new Date(game.date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <span className="font-bold text-sb-text text-sm">
                  {home.team.displayName}
                </span>
                {home.team.logo && (
                  <img
                    src={home.team.logo}
                    alt={home.team.displayName}
                    className="w-8 h-8 object-contain"
                  />
                )}
              </div>
            </div>
            {isLive && (
              <div className="mt-2 flex justify-center">
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  LIVE · P{game.status?.period} {game.status?.displayClock}
                </span>
              </div>
            )}
            {isFinished && (
              <div className="mt-2 flex justify-center">
                <span className="text-xs text-sb-muted font-bold">FINAL</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Hockey() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('props');
  const [pendingBet, setPendingBet] = useState(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const res = await fetch(`${API_BASE}/nhl/players`);
        if (!res.ok) throw new Error('Failed to fetch NHL players');
        const data = await res.json();
        setPlayers(
          data.sort((a, b) => {
            const getMain = (p) => p.points || p.goals || p.assists || 0;
            return getMain(b) - getMain(a);
          }),
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPlayers();
  }, []);

  async function handleConfirmBet(bet) {
    try {
      const res = await fetch(`${API_BASE}/nhl/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bet),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(`❌ ${data.error || 'Failed to place bet'}`);
      } else {
        setToast(
          `✅ Bet placed!\n${bet.playerName}\n${bet.direction === 'more' ? '↑ More' : '↓ Less'} ${bet.statValue} ${bet.statLabel}\nPayout: $${data.potentialPayout}\nBalance: $${data.newBalance}`,
        );
      }
    } catch {
      setToast('❌ Failed to place bet. Please try again.');
    } finally {
      setPendingBet(null);
    }
  }

  const filtered = players.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'goals'
          ? !!p.goals
          : filter === 'assists'
            ? !!p.assists
            : filter === 'points'
              ? !!p.points
              : p.position === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="text-sb-text">
      <style>{`
        @keyframes shimmer { to { background-position: -200% 0; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-extrabold tracking-wide">🏒 NHL</h1>
        <span
          style={{
            background: 'rgba(0,246,255,0.08)',
            color: '#00f6ff',
            border: '1px solid rgba(0,246,255,0.3)',
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '20px',
          }}
        >
          🔮 2025 Season Projections
        </span>
        {loading && tab === 'props' && (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            Loading…
          </span>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #1f2430',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1.2rem',
              background: 'transparent',
              border: 'none',
              borderBottom:
                tab === t.key ? '2px solid #00f6ff' : '2px solid transparent',
              color: tab === t.key ? '#00f6ff' : '#9ca3af',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Player Props Tab */}
      {tab === 'props' && (
        <>
          <div
            style={{
              background: 'rgba(0,246,255,0.05)',
              border: '1px solid rgba(0,246,255,0.15)',
              borderRadius: '10px',
              padding: '0.7rem 1rem',
              marginBottom: '1.2rem',
              fontSize: '0.75rem',
              color: '#9ca3af',
            }}
          >
            📊 Prop lines are{' '}
            <strong style={{ color: '#00f6ff' }}>
              2025 season projections
            </strong>{' '}
            based on 2024 actual stats.
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search player or team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: '#11131a',
                border: '1px solid #404040',
                borderRadius: '10px',
                padding: '0.5rem 1rem',
                color: '#f3f4f6',
                fontSize: '0.88rem',
                outline: 'none',
                width: '260px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#00f6ff')}
              onBlur={(e) => (e.target.style.borderColor = '#404040')}
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  border:
                    filter === f.key
                      ? '1px solid #00f6ff'
                      : '1px solid #404040',
                  background:
                    filter === f.key ? 'rgba(0,246,255,0.1)' : '#11131a',
                  color: filter === f.key ? '#00f6ff' : '#9ca3af',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold tracking-widest text-sb-muted uppercase">
              Player Props —{' '}
              {loading ? 'loading…' : `${filtered.length} players`}
            </span>
            <div className="flex-1 h-px bg-[#1f2430]" />
          </div>

          {error && <p className="text-sb-error">{error}</p>}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filtered.length === 0 ? (
              <p className="text-sb-muted">No players found.</p>
            ) : (
              filtered.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  filter={filter}
                  onBet={setPendingBet}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Live Scores Tab */}
      {tab === 'scores' && <LiveScores />}

      {/* Bet Modal */}
      {pendingBet && (
        <BetModal
          bet={pendingBet}
          onClose={() => setPendingBet(null)}
          onConfirm={handleConfirmBet}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
