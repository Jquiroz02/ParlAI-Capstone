const API_BASE = '/api';
const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const RESOLVED_API_BASE = ENV_API_BASE_URL || API_BASE;
const ENDPOINTS = {
  placeBet: `${RESOLVED_API_BASE}/ufc/bets`,
};

const ESPN_UFC_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard';
const ESPN_UFC_SUMMARY_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/summary';
const ESPN_UFC_RANKINGS_URL =
  'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/rankings';

function toYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * @param {Date} [refDate]
 * @returns {string[]} YYYYMMDD
 */
export function getUfcWeekDateKeys(refDate = new Date()) {
  const d = new Date(refDate);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  sunday.setHours(12, 0, 0, 0);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(sunday);
    x.setDate(sunday.getDate() + i);
    keys.push(toYYYYMMDD(x));
  }
  return keys;
}

/**
 * @param {string} yyyymmdd
 * @returns {string} YYYY-MM-DD
 */
export function yyyymmddToIsoDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length < 8) return '';
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function getOverallRecord(athleteComp) {
  const recs = athleteComp?.records;
  if (!recs || !recs.length) return '—';
  const t =
    recs.find((r) => r.name === 'overall' || r.abbreviation === 'TOT') ||
    recs[0];
  return t?.summary || '—';
}

function athleteName(c) {
  return c?.athlete?.displayName || c?.athlete?.fullName || '—';
}

function athleteAbbr(c) {
  return (
    c?.athlete?.shortName || c?.athlete?.displayName?.split(' ').pop() || '—'
  );
}

/**
 * @param {object} comp - ESPN competition (individual bout)
 * @param {object} event
 * @param {object} league0
 * @param {string} [venueLine]
 * @param {string} [seasonName]
 * @returns {object | null}
 */
function competitionToViewModel(comp, event, league0, venueLine, seasonName) {
  const athletes = (comp.competitors || []).filter((c) => c.type === 'athlete');
  if (athletes.length < 2) return null;

  const a = athletes.find((c) => c.order === 1) || athletes[0];
  const b = athletes.find((c) => c.order === 2) || athletes[1];
  if (!a || !b) return null;

  const typeState = comp?.status?.type?.state || 'pre';
  const clock =
    comp?.status?.type?.shortDetail || comp?.status?.type?.detail || null;

  const awayWinner = a.winner === true;
  const homeWinner = b.winner === true;
  let winnerSide = null;
  if (awayWinner && !homeWinner) winnerSide = 'away';
  if (homeWinner && !awayWinner) winnerSide = 'home';

  const rounds = comp.format?.regulation?.periods;
  const isLongBout = rounds === 5;

  return {
    id: String(comp.id),
    eventId: String(event?.id ?? ''),
    source: 'espn',
    league: league0?.abbreviation || 'UFC',
    seasonDisplay: seasonName || event?.name || 'UFC',
    startDate: comp.startDate || comp.date || event?.date,
    eventDate: event?.date || null,
    venueLine: venueLine || null,
    weightClass: comp.type?.abbreviation || comp.type?.name || '—',
    isMainEvent: Boolean(isLongBout),
    isTitleFight: false,
    cardSegment: null,
    winnerSide,
    status: {
      typeState,
      clock: clock || (typeState === 'pre' ? 'Scheduled' : ''),
    },
    away: {
      abbr: athleteAbbr(a),
      name: athleteName(a),
      record: getOverallRecord(a),
    },
    home: {
      abbr: athleteAbbr(b),
      name: athleteName(b),
      record: getOverallRecord(b),
    },
  };
}

/**
 * @param {object} payload
 * @returns {object[]}
 */
function parseUfcScoreboardPayload(payload) {
  const league0 = payload?.leagues?.[0];
  const seasonDisplay =
    league0?.season?.displayName || league0?.season?.year || '—';
  const events = payload?.events || [];
  const out = [];

  for (const event of events) {
    const venue0 = event?.competitions?.[0]?.venue || event?.venues?.[0];
    const vCity = venue0?.address?.city;
    const vState = venue0?.address?.state;
    const vName = venue0?.fullName;
    const venueLine = [vName, vCity, vState].filter(Boolean).join(' · ');
    const seasonName = event?.name || event?.shortName;

    for (const comp of event.competitions || []) {
      const vm = competitionToViewModel(
        comp,
        event,
        league0,
        venueLine,
        seasonName || seasonDisplay,
      );
      if (vm) out.push(vm);
    }
  }
  return out;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.date] YYYYMMDD
 * @returns {Promise<object[]>}
 */
export async function fetchUfcScoreboard({ date } = {}) {
  const url = date
    ? `${ESPN_UFC_SCOREBOARD_URL}?dates=${date}`
    : ESPN_UFC_SCOREBOARD_URL;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN UFC scoreboard failed (${res.status})`);
  }
  const payload = await res.json();
  return parseUfcScoreboardPayload(payload);
}

/**
 * Full event / card details (bouts, live updates when available). May return 404 for some
 * regions or when ESPN does not expose a summary for that event.
 *
 * @param {string} eventId
 * @returns {Promise<object | null>}
 */
export async function fetchUfcEventSummary(eventId) {
  if (eventId == null || String(eventId).trim() === '') {
    return null;
  }
  const url = `${ESPN_UFC_SUMMARY_BASE}?event=${encodeURIComponent(String(eventId))}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`ESPN UFC summary failed (${res.status})`);
  }
  return res.json();
}

/**
 * Sunday–Saturday bouts, de-duped by competition id, sorted by time (like NBA week).
 * @param {object} [opts]
 * @param {Date} [opts.refDate]
 * @returns {Promise<object[]>}
 */
export async function fetchUfcFightsWeek({ refDate } = {}) {
  const keys = getUfcWeekDateKeys(refDate ?? new Date());
  const dayResults = await Promise.all(
    keys.map((date) => fetchUfcScoreboard({ date })),
  );
  const byId = new Map();
  for (const dayBouts of dayResults) {
    for (const b of dayBouts) {
      if (!byId.has(b.id)) byId.set(b.id, b);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = a.startDate ? new Date(a.startDate).getTime() : 0;
    const tb = b.startDate ? new Date(b.startDate).getTime() : 0;
    return ta - tb;
  });
}

/**
 * Map ESPN rankings to the shape used by the UFCBets "Futures" tab.
 * @param {object} payload
 * @returns {any[]}
 */
function mapUfcRankingsForUi(payload) {
  const blocks = payload?.rankings;
  if (!Array.isArray(blocks)) return [];

  return blocks
    .map((b) => {
      const name = b.name || b.shortName || 'Rankings';
      const wc = b.weightClass;
      const weight_class = {
        name: wc?.text || name,
        abbreviation: wc?.shortName || wc?.text || b.shortName,
      };
      const ranks = Array.isArray(b.ranks) ? b.ranks : [];
      const rankings = ranks.map((r) => {
        const athlete = r.athlete;
        return {
          rank: r.current ?? r.rank,
          is_champion: Boolean(r.champion) || r.hasAccolade === true,
          is_interim_champion: Boolean(r.interim),
          fighter: {
            name: athlete?.displayName || athlete?.fullName || '—',
            id: athlete?.id,
          },
        };
      });
      return {
        id: b.id,
        name,
        weight_class,
        rankings,
        type: b.type,
        headline: b.headline,
      };
    })
    .filter((b) => b.rankings && b.rankings.length > 0);
}

/**
 * @returns {Promise<any[]>} Rankings suitable for the Futures tab list UI
 */
export async function fetchUfcRankings() {
  const res = await fetch(`${ESPN_UFC_RANKINGS_URL}?region=us&lang=en`);
  if (!res.ok) {
    throw new Error(`ESPN UFC rankings failed (${res.status})`);
  }
  const payload = await res.json();
  return mapUfcRankingsForUi(payload);
}

/** @deprecated use fetchUfcFightsWeek */
export function normalizeUfcFight(x) {
  if (!x || typeof x !== 'object') return null;
  if (x.id && x.home && x.away && x.league) return x;
  return null;
}

export async function placeUfcBet(bet) {
  const res = await fetch(ENDPOINTS.placeBet, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bet),
  });

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }
    throw new Error(data?.error || `Bet failed (${res.status})`);
  }

  return res.json();
}
