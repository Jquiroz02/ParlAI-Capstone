import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/pages/login';
import { AuthProvider } from '../src/context/AuthContext';

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthProvider>,
  );
}

test('renders the Sign In buttons', () => {
  renderLogin();

  expect(
    screen.getByRole('button', { name: /continue with google/i }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole('button', { name: /continue with facebook/i }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole('button', { name: /continue with x/i }),
  ).toBeInTheDocument();
});

test('calls loginWithGoogle when Google button is clicked', async () => {
  renderLogin();

  const user = userEvent.setup();
  const googleBtn = screen.getByRole('button', { name: /google/i });

  await user.click(googleBtn);
});

test('calls loginWithFacebook when Facebook button is clicked', async () => {
  renderLogin();

  const user = userEvent.setup();
  const facebookBtn = screen.getByRole('button', { name: /facebook/i });

  await user.click(facebookBtn);
});

test('calls loginWithTwitter when X button is clicked', async () => {
  renderLogin();

  const user = userEvent.setup();
  const twitterBtn = screen.getByRole('button', { name: /x/i });

  await user.click(twitterBtn);
});
