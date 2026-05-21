import { useEffect, useState } from 'react';
import { useGlobalBetSlip } from '../context/BetSlipContext';

// ── BACKEND API ───────────────────────────────────────────────────────────────
const API_BASE = '/api';

// ── NFL LEAGUE ID ─────────────────────────────────────────────────────────────
const NFL_LEAGUE_ID = 701;

// ── TEAM COLORS ───────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  KC: '#E31837',
  BUF: '#00338D',
  BAL: '#241773',
  CIN: '#FB4F14',
  PHI: '#004C54',
  DAL: '#003594',
  DET: '#0076B6',
  LAR: '#003594',
  SF: '#AA0000',
  NYJ: '#125740',
  NO: '#D3BC8D',
  MIA: '#008E97',
  MIN: '#4F2683',
  LAC: '#0080C6',
  GB: '#203731',
  NE: '#002244',
  ARI: '#97233F',
  ATL: '#A71930',
  CHI: '#C83803',
  HOU: '#03202F',
  SEA: '#002244',
  TB: '#D50A0A',
  PIT: '#FFB612',
  WAS: '#5A1414',
  IND: '#002C5F',
  JAX: '#006778',
  DEN: '#FB4F14',
  LV: '#A5ACAF',
  NYG: '#0B2265',
  TEN: '#0C2340',
  CAR: '#0085CA',
  CLE: '#FF3C00',
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
  { key: 'QB', label: 'QBs' },
  { key: 'RB', label: 'RBs' },
  { key: 'WR', label: 'WRs' },
  { key: 'passing', label: 'Pass Yards' },
  { key: 'rushing', label: 'Rush Yards' },
  { key: 'receiving', label: 'Rec Yards' },
];

const TABS = [
  { key: 'props', label: 'Player Props' },
  { key: 'futures', label: 'Futures & Awards' },
];

// ── STAT DISPLAY HELPER ───────────────────────────────────────────────────────
function getDisplayStat(player, filter) {
  if (filter === 'passing')
    return player.pass_yd
      ? {
          val: calcPropLine(player.pass_yd),
          raw: player.pass_yd,
          lbl: '2026 Pass Yards',
          statType: 'pass_yd',
        }
      : null;
  if (filter === 'rushing')
    return player.rush_yd
      ? {
          val: calcPropLine(player.rush_yd),
          raw: player.rush_yd,
          lbl: '2026 Rush Yards',
          statType: 'rush_yd',
        }
      : null;
  if (filter === 'receiving')
    return player.rec_yd
      ? {
          val: calcPropLine(player.rec_yd),
          raw: player.rec_yd,
          lbl: '2026 Rec Yards',
          statType: 'rec_yd',
        }
      : null;

  if (player.position === 'QB' && player.pass_yd)
    return {
      val: calcPropLine(player.pass_yd),
      raw: player.pass_yd,
      lbl: '2026 Pass Yards',
      statType: 'pass_yd',
    };
  if (player.position === 'RB' && player.rush_yd)
    return {
      val: calcPropLine(player.rush_yd),
      raw: player.rush_yd,
      lbl: '2026 Rush Yards',
      statType: 'rush_yd',
    };
  if (player.position === 'WR' && player.rec_yd)
    return {
      val: calcPropLine(player.rec_yd),
      raw: player.rec_yd,
      lbl: '2026 Rec Yards',
      statType: 'rec_yd',
    };
  if (player.position === 'TE' && player.rec_yd)
    return {
      val: calcPropLine(player.rec_yd),
      raw: player.rec_yd,
      lbl: '2026 Rec Yards',
      statType: 'rec_yd',
    };

  if (player.pass_yd)
    return {
      val: calcPropLine(player.pass_yd),
      raw: player.pass_yd,
      lbl: '2026 Pass Yards',
      statType: 'pass_yd',
    };
  if (player.rush_yd)
    return {
      val: calcPropLine(player.rush_yd),
      raw: player.rush_yd,
      lbl: '2026 Rush Yards',
      statType: 'rush_yd',
    };
  if (player.rec_yd)
    return {
      val: calcPropLine(player.rec_yd),
      raw: player.rec_yd,
      lbl: '2026 Rec Yards',
      statType: 'rec_yd',
    };
  return null;
}

// ── EXTRA STATS HELPER ────────────────────────────────────────────────────────
function getExtraStats(player, mainLbl) {
  const extras = [];
  if (player.pass_yd && mainLbl !== '2026 Pass Yards')
    extras.push({ val: calcPropLine(player.pass_yd), lbl: 'Pass Yards' });
  if (player.pass_td)
    extras.push({ val: calcPropLine(player.pass_td), lbl: 'Pass TDs' });
  if (player.rush_yd && mainLbl !== '2026 Rush Yards')
    extras.push({ val: calcPropLine(player.rush_yd), lbl: 'Rush Yards' });
  if (player.rush_td)
    extras.push({ val: calcPropLine(player.rush_td), lbl: 'Rush TDs' });
  if (player.rec_yd && mainLbl !== '2026 Rec Yards')
    extras.push({ val: calcPropLine(player.rec_yd), lbl: 'Rec Yards' });
  if (player.receptions)
    extras.push({ val: calcPropLine(player.receptions), lbl: 'Receptions' });
  if (player.rec_td)
    extras.push({ val: calcPropLine(player.rec_td), lbl: 'Rec TDs' });
  return extras;
}

// ── PLAYER CARD ───────────────────────────────────────────────────────────────
function PlayerCard({ player, filter, selections, onToggleBet }) {
  const stat = getDisplayStat(player, filter);
  if (!stat) return null;

  const color = TEAM_COLORS[player.team] || '#00f6ff';
  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  const extras = getExtraStats(player, stat.lbl);

  // Check if over or under is already selected in the bet slip
  const overId = `${player.id}_${stat.statType}_over`;
  const underId = `${player.id}_${stat.statType}_under`;
  const overSelected = selections.some(
    (s) => s.gameId === String(player.id) && s.selectionId === overId,
  );
  const underSelected = selections.some(
    (s) => s.gameId === String(player.id) && s.selectionId === underId,
  );

  const handleBet = (direction) => {
    const selectionId = direction === 'more' ? overId : underId;
    onToggleBet({
      gameId: String(player.id),
      leagueId: NFL_LEAGUE_ID,
      sport: 'nfl',
      marketKey: 'player_prop',
      selectionId,
      outcomeLabel: `${player.name} ${direction === 'more' ? 'Over' : 'Under'} ${stat.val} ${stat.lbl.replace('2026 ', '')}`,
      odds: 1.9,
      lineValue: stat.val,
      gameName: `${player.name} - ${stat.lbl}`,
      betType: 'Player Prop',
      betTeam: player.name,
    });
  };

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
          2026 Season Projection
        </span>
      </div>

      <div style={{ padding: '0.9rem 1rem', borderTop: '1px solid #1f2430' }}>
        {/* Main prop line */}
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
            2025 actual: {Math.round(stat.raw)}
          </div>
        </div>

        {/* Extra prop lines */}
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
            onClick={() => handleBet('less')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: underSelected
                ? 'rgba(255,61,87,0.25)'
                : 'rgba(255,61,87,0.1)',
              border: underSelected
                ? '1px solid #ff3d57'
                : '1px solid rgba(255,61,87,0.3)',
              color: '#ff3d57',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'background 0.18s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,61,87,0.22)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = underSelected
                ? 'rgba(255,61,87,0.25)'
                : 'rgba(255,61,87,0.1)')
            }
          >
            ↓ Less
          </button>
          <button
            onClick={() => handleBet('more')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: overSelected
                ? 'rgba(0,246,255,0.2)'
                : 'rgba(0,246,255,0.08)',
              border: overSelected
                ? '1px solid #00f6ff'
                : '1px solid rgba(0,246,255,0.3)',
              color: '#00f6ff',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'background 0.18s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(0,246,255,0.18)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = overSelected
                ? 'rgba(0,246,255,0.2)'
                : 'rgba(0,246,255,0.08)')
            }
          >
            ↑ More
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FUTURES TABLE ─────────────────────────────────────────────────────────────
function FuturesTable({ category, data, onBet }) {
  const { title, subtitle, items } = data[category];
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="flex items-center gap-3 mb-3">
        <div>
          <span className="text-xs font-bold tracking-widest text-sb-muted uppercase">
            {title}
          </span>
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.65rem',
              color: '#ffc107',
              background: 'rgba(255,193,7,0.1)',
              border: '1px solid rgba(255,193,7,0.25)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            Projected
          </span>
        </div>
        <div className="flex-1 h-px bg-[#1f2430]" />
      </div>
      <p
        style={{
          fontSize: '0.72rem',
          color: '#9ca3af',
          marginBottom: '0.8rem',
        }}
      >
        {subtitle}
      </p>
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid #1f2430',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2430' }}>
              {['#', 'Name', 'Odds', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '0.6rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: '#9ca3af',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const color = TEAM_COLORS[item.abbr] || '#00f6ff';
              return (
                <tr
                  key={item.label}
                  style={{
                    borderBottom:
                      i < items.length - 1 ? '1px solid #1f2430' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#151820')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <td
                    style={{
                      padding: '0.7rem 1rem',
                      color: '#9ca3af',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: `${color}22`,
                          border: `1px solid ${color}44`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          color,
                        }}
                      >
                        {item.abbr}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {item.label}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '0.7rem 1rem',
                      color: '#00f6ff',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                    }}
                  >
                    {item.odds}
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <button
                      onClick={() =>
                        onBet({
                          gameId: `future_${item.label.replace(/\s/g, '_')}`,
                          leagueId: NFL_LEAGUE_ID,
                          sport: 'nfl',
                          marketKey: 'futures',
                          selectionId: `future_${item.label.replace(/\s/g, '_')}`,
                          outcomeLabel: item.label,
                          odds: parseFloat(item.odds),
                          lineValue: null,
                          gameName: title,
                          betType: 'Futures',
                          betTeam: item.label,
                        })
                      }
                      style={{
                        padding: '0.3rem 0.9rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'rgba(0,246,255,0.08)',
                        border: '1px solid #00f6ff',
                        color: '#00f6ff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#00f6ff';
                        e.currentTarget.style.color = '#000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          'rgba(0,246,255,0.08)';
                        e.currentTarget.style.color = '#00f6ff';
                      }}
                    >
                      Bet
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
        <div
          style={{
            height: 12,
            width: '60%',
            borderRadius: 6,
            background:
              'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 36,
            width: '70%',
            margin: '0 auto 10px',
            borderRadius: 6,
            background:
              'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
        <div
          style={{
            height: 12,
            width: '80%',
            borderRadius: 6,
            background:
              'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function NFLBets() {
  const { selections, toggleSelection } = useGlobalBetSlip();
  const [players, setPlayers] = useState([]);
  const [futures, setFutures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('props');

  useEffect(() => {
    async function loadData() {
      try {
        const [playersRes, futuresRes] = await Promise.all([
          fetch(`${API_BASE}/nfl/players`),
          fetch(`${API_BASE}/nfl/futures`),
        ]);
        if (!playersRes.ok) throw new Error('Failed to fetch NFL players');
        if (!futuresRes.ok) throw new Error('Failed to fetch NFL futures');
        const [playersData, futuresData] = await Promise.all([
          playersRes.json(),
          futuresRes.json(),
        ]);
        setPlayers(
          playersData.sort((a, b) => {
            const getMain = (p) => p.pass_yd || p.rush_yd || p.rec_yd || 0;
            return getMain(b) - getMain(a);
          }),
        );
        setFutures(futuresData);
      } catch (err) {
        console.error('NFL data fetch error:', err);
        setError('Failed to load NFL data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = players.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'QB'
          ? p.position === 'QB'
          : filter === 'RB'
            ? p.position === 'RB'
            : filter === 'WR'
              ? p.position === 'WR'
              : filter === 'passing'
                ? !!p.pass_yd
                : filter === 'rushing'
                  ? !!p.rush_yd
                  : filter === 'receiving'
                    ? !!p.rec_yd
                    : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="text-sb-text">
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { to { background-position: -200% 0; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-extrabold tracking-wide">🏈 NFL</h1>
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
          🔮 2026 Season Projections
        </span>
        {loading && (
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
          {/* Disclaimer */}
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
              2026 season projections
            </strong>{' '}
            based on 2025 actual stats. Each card shows the 2025 reference below
            the line.
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
              {selections.filter((s) => s.sport === 'nfl').length > 0 && (
                <span style={{ marginLeft: 8, color: '#00f6ff' }}>
                  · {selections.filter((s) => s.sport === 'nfl').length}{' '}
                  selected
                </span>
              )}
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
                  selections={selections}
                  onToggleBet={toggleSelection}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Futures Tab */}
      {tab === 'futures' && futures && (
        <div>
          <div
            style={{
              background: 'rgba(255,193,7,0.07)',
              border: '1px solid rgba(255,193,7,0.2)',
              borderRadius: '10px',
              padding: '0.7rem 1rem',
              marginBottom: '1.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <span>⚠️</span>
            <span style={{ fontSize: '0.78rem', color: '#ffc107' }}>
              These are <strong>projected odds</strong> for the 2026–27 NFL
              season. Live odds will be available when the season opens.
            </span>
          </div>
          {Object.keys(futures).map((cat) => (
            <FuturesTable
              key={cat}
              category={cat}
              data={futures}
              onBet={toggleSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
}
