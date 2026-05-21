import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import Onboarding from '../src/pages/onboarding';
import { useAuth } from '../src/context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Onboarding Component', () => {
  const mockCheckAuth = vi.fn();

  const mockAuthData = { clientPrincipal: { userId: 'azure-user-123' } };
  const mockTeamsData = [
    { id: 1, name: 'Arsenal', logoUrl: 'arsenal.png' },
    { id: 2, name: 'Liverpool', logoUrl: 'liverpool.png' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ checkAuth: mockCheckAuth });

    globalThis.fetch = vi.fn((url) => {
      if (url === '/.auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuthData),
        });
      }
      if (url === '/api/teams') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTeamsData),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  test('validates nickname length and format', async () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText('Choose your display name')).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText('BettingGuru123');
    const nextButton = screen.getByRole('button', { name: /next/i });

    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.click(nextButton);
    expect(
      screen.getByText('Nickname must be at least 3 characters long.'),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'cool user!' } });
    fireEvent.click(nextButton);
    expect(
      screen.getByText(
        'Nickname can only contain letters, numbers, and underscores.',
      ),
    ).toBeInTheDocument();
  });

  test('completes the full happy path successfully', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url === '/.auth/me')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuthData),
        });
      if (url === '/api/teams')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTeamsData),
        });
      if (url === '/api/complete-onboarding') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ message: 'Success' }),
        });
      }
    });

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText('Choose your display name')).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText('BettingGuru123');
    fireEvent.change(input, { target: { value: 'ValidName123' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Step 2: Pick your favorite teams'),
      ).toBeInTheDocument(),
    );

    const arsenalButton = screen.getByText('Arsenal');
    fireEvent.click(arsenalButton);

    const finishButton = screen.getByRole('button', { name: /finish/i });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/complete-onboarding',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          azureUserId: 'azure-user-123',
          nickname: 'ValidName123',
          teamIds: [1],
        }),
      }),
    );
  });

  test('displays 409 conflict error when nickname is taken', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url === '/.auth/me')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuthData),
        });
      if (url === '/api/teams')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTeamsData),
        });
      if (url === '/api/complete-onboarding') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({ error: 'That nickname is already taken!' }),
        });
      }
    });

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText('Choose your display name')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText('BettingGuru123'), {
      target: { value: 'TakenName' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Step 2: Pick your favorite teams'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /finish/i }));

    await waitFor(() => {
      expect(
        screen.getByText('That nickname is already taken!'),
      ).toBeInTheDocument();
    });

    expect(mockCheckAuth).not.toHaveBeenCalled();
  });
});
