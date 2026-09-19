import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthPage } from '../pages/AuthPage';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

// Mock fetch for guest login
global.fetch = vi.fn().mockImplementation((url) => {
  if (url === '/api/guest/start') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          guest_id: 'guest_12345',
          token: 'guest-guest_12345',
          display_name: 'Sharma Ji (अतिथि)',
          data: { medicines: [], vitals: [] },
        }),
    });
  }
  return Promise.resolve({ ok: false });
});

describe('AuthPage', () => {
  it('renders senior-friendly welcome text and main login options', () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <AuthPage />
        </AuthProvider>
      </AccessibilityProvider>
    );

    // Assert app title & guest button exist
    expect(screen.getAllByText(/SaathiAI/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Try as Guest/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in with Google/i)).toBeInTheDocument();
  });

  it('triggers guest mode authentication when guest button is clicked', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <AuthPage />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const guestButton = screen.getByRole('button', { name: /तुरंत शुरू करें/i });
    expect(guestButton).toBeInTheDocument();
    fireEvent.click(guestButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/guest/start', expect.any(Object));
    });
  });
});
