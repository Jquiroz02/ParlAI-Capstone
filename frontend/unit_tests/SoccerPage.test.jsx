/* global global */
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import SoccerPage from '../src/pages/SoccerPage';

//  Mock the context to provide dummy values to the hook
vi.mock('../src/context/BetSlipContext', () => {
  const mockToggleSelection = vi.fn();
  const mockPruneSelectionsForGames = vi.fn();

  return {
    useGlobalBetSlip: vi.fn(() => ({
      selections: [],
      toggleSelection: mockToggleSelection,
      pruneSelectionsForGames: mockPruneSelectionsForGames,
    })),
  };
});

// 2. Mock the child component so we only test SoccerPage's logic
vi.mock('../src/components/SoccerCard', () => ({
  default: ({ game }) => {
    // Safely extract the odds using optional chaining, just in case
    const homeOdds = game.h2hPicks?.home?.odds || '-';
    const drawOdds = game.h2hPicks?.draw?.odds || '-';
    const awayOdds = game.h2hPicks?.away?.odds || '-';

    return (
      <div data-testid="mock-soccer-card">
        {game.homeTeam} vs {game.awayTeam} - {homeOdds} / {drawOdds} /{' '}
        {awayOdds}
      </div>
    );
  },
}));

// Mock data that mimics your backend structure
const mockBackendData = [
  {
    id: '1',
    league: { id: 700, sport: 'soccer', name: 'English Premier League' },
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    scores: { home: 2, away: 1 },
    markets: [
      {
        type: 'h2h',
        selections: [
          { id: 1, label: 'Arsenal', odds: '-150' },
          { id: 2, label: 'Chelsea', odds: '+300' },
          { id: 3, label: 'Draw', odds: '+220' },
        ],
      },
      {
        type: 'totals',
        selections: [
          { label: 'Over', lineValue: '2.5', odds: '-110' },
          { label: 'Under', lineValue: '2.5', odds: '-110' },
        ],
      },
    ],
  },
];

describe('SoccerPage Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.spyOn(window, 'setInterval');
    vi.spyOn(window, 'clearInterval');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  test('renders loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));
    render(<SoccerPage />);
    expect(screen.getByText('Loading live odds...')).toBeInTheDocument();
  });

  test('renders empty state when no games are returned', async () => {
    global.fetch.mockResolvedValue({
      json: async () => [],
    });
    render(<SoccerPage />);
    expect(
      await screen.findByText('No games scheduled at this moment.'),
    ).toBeInTheDocument();
  });

  test('fetches and parses game data correctly', async () => {
    global.fetch.mockResolvedValue({
      json: async () => mockBackendData,
    });
    render(<SoccerPage />);

    const parsedCardText = await screen.findByText(
      'Arsenal vs Chelsea - -150 / +220 / +300',
    );
    expect(parsedCardText).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/getGames?leagueName=English+Premier+League',
      ),
    );
  });

  test('sets up and cleans up the polling interval', async () => {
    // 1. Make sure fake timers are OFF for this test
    vi.useRealTimers();

    global.fetch.mockResolvedValue({
      json: async () => [],
    });

    // 2. Spy on the window timers
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    // 3. Render the component
    const { unmount } = render(<SoccerPage />);

    // 4. Wait for the initial mount fetch to settle using the UI
    await screen.findByText('No games scheduled at this moment.');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 5. Verify the interval was registered
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000);

    const pollingFunction = setIntervalSpy.mock.calls[0][0];

    // 6. Manually execute the function just like setInterval would
    await act(async () => {
      await pollingFunction();
    });

    // 7. Prove the polling function triggered a second fetch!
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // 8. Unmount and prove the cleanup returns the specific interval ID
    // We grab the mocked ID that setIntervalSpy returned
    const intervalId = setIntervalSpy.mock.results[0].value;

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
  });
});
