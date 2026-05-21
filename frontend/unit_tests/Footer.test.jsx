import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../src/components/Footer';

test('renders footer text', async () => {
  render(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>,
  );

  expect(
    await screen.findByText('© 2026 ParlAI - AI-Powered Sports Predictions'),
  ).toBeInTheDocument();
});