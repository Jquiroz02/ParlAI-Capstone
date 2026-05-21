import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SoccerCard from '../src/components/SoccerCard';

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

const mockGame = {
  id: '1',
  status: 'live',
  startTime: '2026-03-20T18:00:00Z',
  homeTeam: 'Arsenal',
  awayTeam: 'Chelsea',
  homeScore: 2,
  awayScore: 1,
  homeLogo: '',
  awayLogo: '',
  totalLine: '2.5',
  overOdds: '-110',
  underOdds: '-110',
  h2hPicks: {
    home: { id: 1, label: 'Arsenal', odds: '-150' },
    draw: { id: 3, label: 'Draw', odds: '+220' },
    away: { id: 2, label: 'Chelsea', odds: '+300' },
  },
  totalsPicks: {
    over: { id: 4, label: 'Over', lineValue: '2.5', odds: '-110' },
    under: { id: 5, label: 'Under', lineValue: '2.5', odds: '-110' },
  },
};

describe('SoccerCard Component', () => {
  const renderComponent = (game = mockGame) => {
    return render(<SoccerCard game={game} />);
  };

  test('renders teams and scores correctly', () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { name: /arsenal/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /chelsea/i }),
    ).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('renders moneyline odds correctly', () => {
    renderComponent();

    // Now these will be successfully pulled from h2hPicks!
    expect(screen.getByText('-150')).toBeInTheDocument();
    expect(screen.getByText('+220')).toBeInTheDocument();
    expect(screen.getByText('+300')).toBeInTheDocument();
  });

  test('displays LIVE indicator when game is in progress', () => {
    renderComponent();

    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  test('displays FINAL status when game is completed', () => {
    renderComponent({ ...mockGame, status: 'finished' });

    expect(screen.getByText(/final/i)).toBeInTheDocument();
  });

  test('toggles expanded section on user interaction', async () => {
    renderComponent();

    // 1. Expand the section
    fireEvent.click(screen.getByText(/more bets/i));
    expect(await screen.findByText(/total goals/i)).toBeInTheDocument();

    // 2. Collapse the section
    fireEvent.click(screen.getByText(/fewer bets/i));

    // 3. Verify it closed by checking that the button text reverted!
    await waitFor(() => {
      expect(screen.getByText(/more bets/i)).toBeInTheDocument();
    });
  });

  test('renders total goals and additional odds when expanded', async () => {
    renderComponent();

    // Match the actual text here too
    fireEvent.click(screen.getByText(/more bets/i));

    expect(await screen.findByText(/total goals/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        (content, el) => el?.tagName === 'SPAN' && content === '2.5',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Over')).toBeInTheDocument();
    expect(screen.getByText('Under')).toBeInTheDocument();

    const odds = screen.getAllByText('-110');
    expect(odds.length).toBeGreaterThanOrEqual(2);
  });
});
