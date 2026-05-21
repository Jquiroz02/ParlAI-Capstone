import { useState } from 'react';
import { MARKET_KEYS, formatSpreadLine } from '../utils/betPayload.js';

//Animated element for showing live games
const LiveIndicator = () => (
  <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/50 border border-red-700/50">
    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_4px_rgba(239,68,68,0.3)]" />
    <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">
      Live
    </span>
  </div>
);

// Button styling for when they're pressed or not pressed/not press-able.
const SelectionButton = ({
  label,
  secondaryLabel,
  odds,
  isSelected,
  onClick,
  disabled,
}) => {
  const invalid = odds === '-' || odds == null || odds === '';

  // Common styles
  const baseClass =
    'flex flex-col items-center justify-center border rounded transition-all duration-200 h-full w-full';
  const stateClass = isSelected
    ? 'bg-[#00f6ff] border-[#00f6ff] text-black font-extrabold shadow-[0_0_15px_rgba(0,246,255,0.4)]' // Active state
    : 'bg-[#1e2129] border-[#2d3343] text-white hover:border-[#00f6ff] hover:bg-[#252933] active:scale-[0.97]'; // Default state
  const cursorClass =
    disabled || invalid ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || invalid}
      className={`${baseClass} ${stateClass} ${cursorClass}`}
    >
      {/* Label (Team Name or 'Over'/'Under') */}
      <span
        className={`block truncate text-[11px] leading-tight w-full text-center px-1 ${
          isSelected ? 'text-black font-semibold' : 'text-gray-300'
        }`}
      >
        {label}
      </span>

      {/* Optional secondary label (like Spread line +1.5 or Over line 2.5) */}
      {secondaryLabel && (
        <span
          className={`text-sm font-bold leading-tight ${
            isSelected ? 'text-black' : 'text-white'
          }`}
        >
          {secondaryLabel}
        </span>
      )}

      {/* The Price/Odds */}
      <span
        className={`font-black tracking-tight ${secondaryLabel ? 'text-xs' : 'text-lg'} ${
          isSelected ? 'text-black' : 'text-[#00f6ff]'
        }`}
      >
        {invalid ? '-' : odds}
      </span>
    </button>
  );
};

// --- MAIN COMPONENT ---
export default function SoccerCard({
  game,
  onToggleBet,
  selectedBets = [],
  bettingClosed,
}) {
  const [expanded, setExpanded] = useState(false);
  // initialize all element/variables of a game object
  const {
    id,
    status,
    startTime,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homeLogo,
    awayLogo,
    totalLine,
    overOdds,
    underOdds,
    spread = { home: null, away: null },
    h2hPicks = { home: null, draw: null, away: null },
    totalsPicks = { over: null, under: null },
    sport,
    leagueId,
  } = game;

  const homeOdds = h2hPicks?.home?.odds || '-';
  const awayOdds = h2hPicks?.away?.odds || '-';
  const drawOdds = h2hPicks?.draw?.odds || '-';

  const isFinal = status === 'completed' || status === 'finished';
  const isLive = status === 'in_progress' || status === 'live';
  const dateObj = startTime ? new Date(startTime) : null;

  const handleBetClick = (
    e,
    marketKey,
    outcomeLabel,
    odds,
    lineValue,
    selectionId,
  ) => {
    e.stopPropagation();
    if (bettingClosed || odds === '-' || !onToggleBet) return;
    if (selectionId == null) return;

    let betType = 'Prop';
    if (marketKey === MARKET_KEYS.H2H) betType = 'Moneyline';
    if (marketKey === MARKET_KEYS.SPREADS) betType = 'Spread';
    if (marketKey === MARKET_KEYS.TOTALS) betType = 'Over/Under';

    // For totals, we usually leave the "team" blank in the UI
    let betTeam = outcomeLabel;
    if (marketKey === MARKET_KEYS.TOTALS) betTeam = '';
    // ------------------------------------

    // add and remove bet to global bet slip
    onToggleBet({
      gameId: id,
      leagueId,
      sport,
      marketKey,
      selectionId,
      outcomeLabel,
      odds,
      lineValue: lineValue ?? null,
      gameName: `${homeTeam} vs ${awayTeam}`,
      betType,
      betTeam,
    });
  };

  // Uses this to track which button should be toggled on or off according ot the bet slip
  const isBetSelected = (marketKey, outcomeLabel) => {
    return selectedBets.some(
      (bet) =>
        bet.gameId === id &&
        bet.marketKey === marketKey &&
        bet.outcomeLabel === outcomeLabel,
    );
  };

  return (
    <div className="bg-[#14161b] text-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_10px_rgba(0,246,255,0.05)] overflow-hidden font-sans flex flex-col h-fit border border-gray-800/50 hover:border-gray-700/50 transition-colors duration-300">
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-[#1c2029] transition-colors focus:outline-none cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        {/* Status Header */}
        <div className="flex justify-center mb-4 pb-2 border-b border-gray-800">
          {isFinal ? (
            <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">
              Final
            </span>
          ) : isLive ? (
            <LiveIndicator />
          ) : dateObj ? (
            <span className="text-gray-300 text-xs font-medium bg-gray-800/50 px-3 py-1 rounded-full">
              {dateObj.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              })}{' '}
              •{' '}
              {dateObj.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          ) : null}
        </div>

        {/* Teams & Logos & Scores Container */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center mb-4">
          {/* Home Team */}
          <div className="flex items-center gap-3">
            <img
              src={homeLogo || 'https://via.placeholder.com/40'}
              alt={homeTeam}
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <div className="flex flex-col flex-1 overflow-hidden">
              <h3 className="font-bold text-base leading-tight text-white truncate">
                {homeTeam}
              </h3>
              <span className="text-2xl font-black text-white mt-1">
                {homeScore ?? '-'}
              </span>
            </div>
          </div>

          {/* VS Separator */}
          <div className="text-xs font-bold text-gray-600 px-1 mt-6">VS</div>

          {/* Away Team */}
          <div className="flex items-center gap-3 justify-end text-right">
            <div className="flex flex-col flex-1 overflow-hidden items-end">
              <h3 className="font-bold text-base leading-tight text-white truncate">
                {awayTeam}
              </h3>
              <span className="text-2xl font-black text-white mt-1">
                {awayScore ?? '-'}
              </span>
            </div>
            <img
              src={awayLogo || 'https://via.placeholder.com/40'}
              alt={awayTeam}
              className="w-10 h-10 object-contain flex-shrink-0"
            />
          </div>
        </div>

        {/* 3-Way Moneyline / Match Result */}
        <div className="w-full mt-3">
          <span className="block text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Match Result (3-Way)
          </span>

          {bettingClosed ? (
            <div className="text-center bg-[#33DBFF] rounded border border-gray-800 py-4 mb-2 mt-1">
              <p className="text-sm font-semibold text-black">Betting closed</p>
            </div>
          ) : (
            // Moneyline buttons now have a specific min-height for uniform look
            <div className="grid grid-cols-3 gap-2.5 min-h-[56px]">
              <SelectionButton
                label={homeTeam}
                odds={homeOdds}
                isSelected={isBetSelected(MARKET_KEYS.H2H, homeTeam)}
                disabled={bettingClosed || !h2hPicks?.home?.id}
                onClick={(e) =>
                  handleBetClick(
                    e,
                    MARKET_KEYS.H2H,
                    homeTeam,
                    homeOdds,
                    undefined,
                    h2hPicks?.home?.id,
                  )
                }
              />
              <SelectionButton
                label="Draw"
                odds={drawOdds}
                isSelected={isBetSelected(MARKET_KEYS.H2H, 'Draw')}
                disabled={bettingClosed || !h2hPicks?.draw?.id}
                onClick={(e) =>
                  handleBetClick(
                    e,
                    MARKET_KEYS.H2H,
                    'Draw',
                    drawOdds,
                    undefined,
                    h2hPicks?.draw?.id,
                  )
                }
              />
              <SelectionButton
                label={awayTeam}
                odds={awayOdds}
                isSelected={isBetSelected(MARKET_KEYS.H2H, awayTeam)}
                disabled={bettingClosed || !h2hPicks?.away?.id}
                onClick={(e) =>
                  handleBetClick(
                    e,
                    MARKET_KEYS.H2H,
                    awayTeam,
                    awayOdds,
                    undefined,
                    h2hPicks?.away?.id,
                  )
                }
              />
            </div>
          )}
        </div>

        {/* Sleeker 'More Bets' indicator */}
        <div className="flex justify-center mt-4 pt-1 border-t border-gray-800/50">
          <div className="text-[#00f6ff] text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-80 hover:opacity-100">
            {expanded ? 'Fewer Bets' : 'More Bets'}
            <span
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            >
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Section - Unified background */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-gray-800 p-4 space-y-5">
          {/* Point spread / handicap */}
          {(spread?.home || spread?.away) && (
            <div className="bg-[#1c2029] rounded-lg p-4 border border-gray-800">
              <p className="text-gray-300 text-[11px] font-bold text-center uppercase tracking-wider mb-3">
                Point Spread (handicap)
              </p>
              <div className="grid grid-cols-2 gap-3 min-h-[70px]">
                {spread?.home ? (
                  <SelectionButton
                    label={homeTeam}
                    secondaryLabel={formatSpreadLine(spread.home.lineValue)}
                    odds={spread.home.odds}
                    isSelected={isBetSelected(MARKET_KEYS.SPREADS, homeTeam)}
                    disabled={bettingClosed || spread.home.selectionId == null}
                    onClick={(e) =>
                      handleBetClick(
                        e,
                        MARKET_KEYS.SPREADS,
                        homeTeam,
                        spread.home.odds,
                        spread.home.lineValue,
                        spread.home.selectionId,
                      )
                    }
                  />
                ) : (
                  <div className="flex items-center justify-center border border-dashed border-gray-700 rounded py-4 text-center text-[10px] text-gray-600 bg-gray-900/50">
                    Home line N/A
                  </div>
                )}
                {spread?.away ? (
                  <SelectionButton
                    label={awayTeam}
                    secondaryLabel={formatSpreadLine(spread.away.lineValue)}
                    odds={spread.away.odds}
                    isSelected={isBetSelected(MARKET_KEYS.SPREADS, awayTeam)}
                    disabled={bettingClosed || spread.away.selectionId == null}
                    onClick={(e) =>
                      handleBetClick(
                        e,
                        MARKET_KEYS.SPREADS,
                        awayTeam,
                        spread.away.odds,
                        spread.away.lineValue,
                        spread.away.selectionId,
                      )
                    }
                  />
                ) : (
                  <div className="flex items-center justify-center border border-dashed border-gray-700 rounded py-4 text-center text-[10px] text-gray-600 bg-gray-900/50">
                    Away line N/A
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total Goals Box */}
          <div className="bg-[#1c2029] rounded-lg p-4 border border-gray-800">
            <p className="text-gray-300 text-[11px] font-bold text-center uppercase tracking-wider mb-3">
              Total Goals:{' '}
              <span className="text-white text-sm font-black ml-1 bg-gray-700 px-2 py-0.5 rounded">
                {totalLine}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3 min-h-[56px]">
              <SelectionButton
                label="Over"
                odds={overOdds}
                isSelected={isBetSelected(MARKET_KEYS.TOTALS, 'Over')}
                disabled={bettingClosed || !totalsPicks?.over?.id}
                onClick={(e) =>
                  handleBetClick(
                    e,
                    MARKET_KEYS.TOTALS,
                    'Over',
                    overOdds,
                    totalsPicks?.over?.lineValue ?? undefined,
                    totalsPicks?.over?.id,
                  )
                }
              />
              <SelectionButton
                label="Under"
                odds={underOdds}
                isSelected={isBetSelected(MARKET_KEYS.TOTALS, 'Under')}
                disabled={bettingClosed || !totalsPicks?.under?.id}
                onClick={(e) =>
                  handleBetClick(
                    e,
                    MARKET_KEYS.TOTALS,
                    'Under',
                    underOdds,
                    totalsPicks?.under?.lineValue ?? undefined,
                    totalsPicks?.under?.id,
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
