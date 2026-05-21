import { app } from '@azure/functions';

// Projected futures odds for 2026-27 NFL season
// These will be replaced with live Odds API data when season opens
const FUTURES_DATA = {
  superBowl: {
    title: '🏆 Super Bowl LXI Winner',
    subtitle: '2026–27 Projected Odds',
    items: [
      { label: 'Kansas City Chiefs', abbr: 'KC', odds: '+500' },
      { label: 'Philadelphia Eagles', abbr: 'PHI', odds: '+650' },
      { label: 'Buffalo Bills', abbr: 'BUF', odds: '+800' },
      { label: 'Baltimore Ravens', abbr: 'BAL', odds: '+900' },
      { label: 'San Francisco 49ers', abbr: 'SF', odds: '+1000' },
      { label: 'Detroit Lions', abbr: 'DET', odds: '+1100' },
      { label: 'Seattle Seahawks', abbr: 'SEA', odds: '+1200' },
      { label: 'Houston Texans', abbr: 'HOU', odds: '+1400' },
      { label: 'Cincinnati Bengals', abbr: 'CIN', odds: '+1600' },
      { label: 'Dallas Cowboys', abbr: 'DAL', odds: '+1800' },
    ],
  },
  mvp: {
    title: '🎖️ NFL MVP',
    subtitle: '2026–27 Projected Odds',
    items: [
      { label: 'Josh Allen', abbr: 'BUF', odds: '+400' },
      { label: 'Patrick Mahomes', abbr: 'KC', odds: '+500' },
      { label: 'Lamar Jackson', abbr: 'BAL', odds: '+600' },
      { label: 'Jalen Hurts', abbr: 'PHI', odds: '+900' },
      { label: 'Joe Burrow', abbr: 'CIN', odds: '+1000' },
      { label: 'Jayden Daniels', abbr: 'WAS', odds: '+1200' },
      { label: 'Caleb Williams', abbr: 'CHI', odds: '+1400' },
      { label: 'C.J. Stroud', abbr: 'HOU', odds: '+1600' },
      { label: 'Brock Purdy', abbr: 'SF', odds: '+1800' },
      { label: 'Justin Herbert', abbr: 'LAC', odds: '+2000' },
    ],
  },
  offensivePlayer: {
    title: '⚡ Offensive Player of the Year',
    subtitle: '2026–27 Projected Odds',
    items: [
      { label: 'CeeDee Lamb', abbr: 'DAL', odds: '+500' },
      { label: "Ja'Marr Chase", abbr: 'CIN', odds: '+600' },
      { label: 'Justin Jefferson', abbr: 'MIN', odds: '+700' },
      { label: 'Tyreek Hill', abbr: 'MIA', odds: '+900' },
      { label: 'Christian McCaffrey', abbr: 'SF', odds: '+1000' },
      { label: 'Saquon Barkley', abbr: 'PHI', odds: '+1200' },
      { label: 'Marvin Harrison Jr.', abbr: 'ARI', odds: '+1400' },
      { label: 'Amon-Ra St. Brown', abbr: 'DET', odds: '+1600' },
    ],
  },
  rushingTitle: {
    title: '🏃 Rushing Title',
    subtitle: '2026–27 Projected Odds',
    items: [
      { label: 'Derrick Henry', abbr: 'NO', odds: '+450' },
      { label: 'Saquon Barkley', abbr: 'PHI', odds: '+600' },
      { label: 'Christian McCaffrey', abbr: 'SF', odds: '+700' },
      { label: 'Bijan Robinson', abbr: 'ATL', odds: '+900' },
      { label: 'Jahmyr Gibbs', abbr: 'DET', odds: '+1000' },
      { label: 'Breece Hall', abbr: 'NYJ', odds: '+1200' },
      { label: 'James Cook', abbr: 'BUF', odds: '+1400' },
      { label: 'Jonathan Taylor', abbr: 'IND', odds: '+1600' },
    ],
  },
  receivingTitle: {
    title: '🎯 Receiving Title',
    subtitle: '2026–27 Projected Odds',
    items: [
      { label: 'Tyreek Hill', abbr: 'MIA', odds: '+400' },
      { label: 'CeeDee Lamb', abbr: 'DAL', odds: '+500' },
      { label: "Ja'Marr Chase", abbr: 'CIN', odds: '+650' },
      { label: 'Justin Jefferson', abbr: 'MIN', odds: '+700' },
      { label: 'Amon-Ra St. Brown', abbr: 'DET', odds: '+900' },
      { label: 'A.J. Brown', abbr: 'PHI', odds: '+1100' },
      { label: 'Garrett Wilson', abbr: 'NYJ', odds: '+1300' },
      { label: 'DK Metcalf', abbr: 'SEA', odds: '+1500' },
    ],
  },
};

app.http('nfl-futures', {
  methods: ['GET'],
  route: 'nfl/futures',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // Return projected futures data
      // TODO: Replace with live Odds API data when 2026-27 season opens
      return { status: 200, jsonBody: FUTURES_DATA };
    } catch (error) {
      context.error('Error in nfl-futures:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
