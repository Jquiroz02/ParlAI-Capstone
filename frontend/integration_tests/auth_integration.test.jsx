import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';
import Login from '../src/pages/login';
import Dashboard from '../src/pages/dashboard';
import { AuthProvider } from '../src/context/AuthContext';

const originalLocation = window.location;

beforeAll(() => {
  delete window.location;
  window.location = { href: '', origin: 'http://localhost' };
});

beforeEach(() => {
  window.location.href = '';
  cleanup();
});

afterAll(() => {
  window.location = originalLocation;
});

//Define the cases for each provider
const authProviders = [
  {
    provider: 'Google',
    buttonLabel: /google/i,
    expectedUrl: '/.auth/login/google',
  },
  {
    provider: 'Facebook',
    buttonLabel: /facebook/i,
    expectedUrl: '/.auth/login/facebook',
  },
  {
    provider: 'Twitter',
    buttonLabel: /x/i,
    expectedUrl: '/.auth/login/twitter',
  },
];

// Run the test loop
describe('Auth Integration Tests', () => {
  test.each(authProviders)(
    'Continue with $provider button triggers correct redirect to $expectedUrl',
    async ({ buttonLabel, expectedUrl }) => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      const loginBtn = screen.getByRole('button', { name: buttonLabel });
      await user.click(loginBtn);

      expect(window.location.href).toContain(expectedUrl);
    },
  );
});
