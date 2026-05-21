import { useState } from 'react';
import { useGlobalBetSlip } from '../context/BetSlipContext';
import { getMLBGames } from '../hooks/getMLBGames';
import { isBettingClosed } from '../utils/betPayload';

// ── SKELETON ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: '#11131a',
        border: '1px solid #1f2430',
        borderRadius: '14px',
        padding: '1.2rem',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          height: 12,
          width: '30%',
          borderRadius: 6,
          background:
            'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          marginBottom: 16,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            height: 40,
            width: '35%',
            borderRadius: 8,
            background:
              'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
        <div
          style={{
            height: 40,
            width: '20%',
            borderRadius: 8,
            background:
              'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
        <div
          style={{
            height: 40,
            width: '35%',
            borderRadius: 8,
            background:
              'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      </div>
      <div
        style={{
          height: 60,
          borderRadius: 8,
          background:
            'linear-gradient(90deg, #1a1e2a 25%, #1f2435 50%, #1a1e2a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }}
      />
    </div>
  );
}

// ── ODDS BUTTON ───────────────────────────────────────────────────────────────
function OddsButton({ sublabel, odds, isSelected, onClick, disabled }) {
  const bgColor = isSelected
    ? 'rgba(0,246,255,0.15)'
    : disabled
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(0,246,255,0.04)';
  const borderColor = isSelected
    ? '#00f6ff'
    : disabled
      ? '#1f2430'
      : 'rgba(0,246,255,0.15)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '0.5rem',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: disabled ? '#6b7494' : '#f3f4f6',
        fontSize: '0.78rem',
        fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.18s',
        boxShadow: isSelected ? '0 0 10px rgba(0,246,255,0.2)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isSelected)
          e.currentTarget.style.borderColor = '#00f6ff';
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isSelected)
          e.currentTarget.style.borderColor = 'rgba(0,246,255,0.15)';
      }}
    >
      <div
        style={{
          fontSize: '0.6rem',
          color: isSelected ? '#00f6ff' : '#9ca3af',
          marginBottom: 2,
        }}
      >
        {sublabel}
      </div>
      <div style={{ color: isSelected ? '#00f6ff' : '#f3f4f6' }}>
        ×{typeof odds === 'number' ? odds.toFixed(2) : odds}
      </div>
    </button>
  );
}

// ── GAME CARD ─────────────────────────────────────────────────────────────────
function GameCard({ game, selections, onToggleBet, bettingClosed }) {
  const isLive = game.status === 'in_progress';
  const isFinished = game.status === 'completed';

  const homeColor = '#00f6ff';
  const awayColor = '#00f6ff';

  // Check if a specific selection is active in the global bet slip
  const isSelected = (selectionId, marketKey) =>
    selections.some(
      (s) =>
        s.gameId === game.id &&
        s.marketKey === marketKey &&
        s.selectionId === selectionId,
    );

  const handleMoneyline = (side) => {
    const pick = side === 'home' ? game.h2hPicks?.home : game.h2hPicks?.away;
    if (!pick) return;
    onToggleBet({
      gameId: game.id,
      leagueId: game.leagueId,
      sport: game.sport || 'mlb',
      marketKey: 'h2h',
      selectionId: pick.id,
      outcomeLabel: pick.label,
      odds: pick.odds,
      lineValue: null,
      gameName: game.gameName,
      betType: 'Moneyline',
      betTeam: pick.label,
    });
  };

  const handleTotal = (side) => {
    const pick =
      side === 'over' ? game.totalsPicks?.over : game.totalsPicks?.under;
    if (!pick) return;
    onToggleBet({
      gameId: game.id,
      leagueId: game.leagueId,
      sport: game.sport || 'mlb',
      marketKey: 'totals',
      selectionId: pick.id,
      outcomeLabel: `${side === 'over' ? 'Over' : 'Under'} ${pick.lineValue} Runs`,
      odds: pick.odds,
      lineValue: pick.lineValue,
      gameName: game.gameName,
      betType: 'Total Runs',
      betTeam: `${side === 'over' ? 'Over' : 'Under'} ${pick.lineValue}`,
    });
  };

  return (
    <div
      style={{
        background: '#11131a',
        border: `1px solid ${isLive ? 'rgba(0,246,255,0.3)' : '#1f2430'}`,
        borderRadius: '14px',
        padding: '1.2rem',
        marginBottom: '1rem',
        boxShadow: isLive ? '0 0 20px rgba(0,246,255,0.05)' : 'none',
        opacity: isFinished ? 0.7 : 1,
      }}
    >
      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          {isLive && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#00c853',
                background: 'rgba(0,200,83,0.1)',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(0,200,83,0.2)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#00c853',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              LIVE
            </span>
          )}
          {game.status === 'scheduled' && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {new Date(game.startTime).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
          {isFinished && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#9ca3af',
              }}
            >
              FINAL
            </span>
          )}
        </div>
      </div>

      {/* Teams & Score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        {/* Away */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: 1,
          }}
        >
          {game.awayLogo ? (
            <img
              src={game.awayLogo}
              alt={game.awayTeam}
              style={{ width: 40, height: 40, objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: `${awayColor}22`,
                border: `2px solid ${awayColor}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 800,
                color: awayColor,
              }}
            >
              {game.awayTeam?.slice(0, 3).toUpperCase()}
            </div>
          )}
          <div>
            <div
              style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6' }}
            >
              {game.awayTeam}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Away</div>
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', padding: '0 1rem' }}>
          {isLive || isFinished ? (
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: '#f3f4f6',
                letterSpacing: '-1px',
              }}
            >
              {game.awayScore}{' '}
              <span style={{ color: '#9ca3af', fontSize: '1.2rem' }}>–</span>{' '}
              {game.homeScore}
            </div>
          ) : (
            <div
              style={{ fontSize: '1.2rem', fontWeight: 700, color: '#9ca3af' }}
            >
              VS
            </div>
          )}
        </div>

        {/* Home */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div
              style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6' }}
            >
              {game.homeTeam}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Home</div>
          </div>
          {game.homeLogo ? (
            <img
              src={game.homeLogo}
              alt={game.homeTeam}
              style={{ width: 40, height: 40, objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: `${homeColor}22`,
                border: `2px solid ${homeColor}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 800,
                color: homeColor,
              }}
            >
              {game.homeTeam?.slice(0, 3).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Betting Markets */}
      {!isFinished && !bettingClosed && (
        <div style={{ borderTop: '1px solid #1f2430', paddingTop: '1rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            {/* Moneyline */}
            <div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: '0.5rem',
                }}
              >
                Moneyline
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {game.h2hPicks?.away && (
                  <OddsButton
                    sublabel={game.awayTeam?.split(' ').pop()}
                    odds={game.h2hPicks.away.odds}
                    isSelected={isSelected(game.h2hPicks.away.id, 'h2h')}
                    onClick={() => handleMoneyline('away')}
                    disabled={bettingClosed}
                  />
                )}
                {game.h2hPicks?.home && (
                  <OddsButton
                    sublabel={game.homeTeam?.split(' ').pop()}
                    odds={game.h2hPicks.home.odds}
                    isSelected={isSelected(game.h2hPicks.home.id, 'h2h')}
                    onClick={() => handleMoneyline('home')}
                    disabled={bettingClosed}
                  />
                )}
              </div>
            </div>

            {/* Total Runs */}
            <div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: '0.5rem',
                }}
              >
                Total Runs ({game.totalLine})
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {game.totalsPicks?.over && (
                  <OddsButton
                    sublabel="Over"
                    odds={game.totalsPicks.over.odds}
                    isSelected={isSelected(game.totalsPicks.over.id, 'totals')}
                    onClick={() => handleTotal('over')}
                    disabled={bettingClosed}
                  />
                )}
                {game.totalsPicks?.under && (
                  <OddsButton
                    sublabel="Under"
                    odds={game.totalsPicks.under.odds}
                    isSelected={isSelected(game.totalsPicks.under.id, 'totals')}
                    onClick={() => handleTotal('under')}
                    disabled={bettingClosed}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(isFinished || bettingClosed) && (
        <div
          style={{
            borderTop: '1px solid #1f2430',
            paddingTop: '0.8rem',
            fontSize: '0.75rem',
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          {isFinished ? 'Game finished — betting closed' : 'Betting closed'}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MLBBets() {
  const { selections, toggleSelection, pruneSelectionsForGames } =
    useGlobalBetSlip();
  const { games, loading, error } = getMLBGames(pruneSelectionsForGames);

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const liveCount = games.filter((g) => g.status === 'in_progress').length;

  const filtered = games.filter((g) => {
    const matchesFilter =
      filter === 'live'
        ? g.status === 'in_progress'
        : filter === 'upcoming'
          ? g.status === 'scheduled'
          : filter === 'finished'
            ? g.status === 'completed'
            : true;

    const matchesSearch =
      search === '' ||
      g.homeTeam?.toLowerCase().includes(search.toLowerCase()) ||
      g.awayTeam?.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="text-sb-text">
      <style>{`
        @keyframes shimmer { to { background-position: -200% 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span style={{ fontSize: '2rem' }}>⚾</span>
        <h1 className="text-3xl font-extrabold tracking-wide">MLB</h1>
        {liveCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#00c853',
              background: 'rgba(0,200,83,0.1)',
              padding: '3px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(0,200,83,0.2)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#00c853',
                animation: 'pulse 1.5s infinite',
              }}
            />
            {liveCount} LIVE
          </span>
        )}
      </div>
      <p
        style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.5rem' }}
      >
        Bet on MLB games. Live scores powered by ESPN. Add selections to your
        bet slip below.
      </p>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search team…"
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

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {['all', 'live', 'upcoming', 'finished'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              border: filter === f ? '1px solid #00f6ff' : '1px solid #404040',
              background: filter === f ? 'rgba(0,246,255,0.1)' : '#11131a',
              color: filter === f ? '#00f6ff' : '#9ca3af',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.18s',
              textTransform: 'capitalize',
            }}
          >
            {f === 'live' && liveCount > 0
              ? `Live (${liveCount})`
              : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Section label */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold tracking-widest text-sb-muted uppercase">
          {loading
            ? 'Loading games…'
            : `${filtered.length} game${filtered.length !== 1 ? 's' : ''}`}
          {selections.filter((s) => s.sport === 'mlb').length > 0 && (
            <span style={{ marginLeft: 8, color: '#00f6ff' }}>
              · {selections.filter((s) => s.sport === 'mlb').length} selected
            </span>
          )}
        </span>
        <div className="flex-1 h-px bg-[#1f2430]" />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(248,160,160,0.1)',
            border: '1px solid rgba(248,160,160,0.3)',
            borderRadius: '10px',
            padding: '0.8rem 1rem',
            fontSize: '0.85rem',
            color: '#f8a0a0',
            marginBottom: '1rem',
          }}
        >
          Failed to load games: {error}
        </div>
      )}

      {/* Games */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
      ) : filtered.length === 0 ? (
        <div
          style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚾</div>
          <p>No {filter === 'all' ? '' : filter} games right now.</p>
          <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
            Check back during the MLB season for live matchups.
          </p>
        </div>
      ) : (
        filtered.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            selections={selections}
            onToggleBet={toggleSelection}
            bettingClosed={isBettingClosed(game)}
          />
        ))
      )}
    </div>
  );
}
