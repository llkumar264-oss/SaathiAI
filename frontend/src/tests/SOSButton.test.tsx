import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SOSButton } from '../features/family/SOSButton';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

describe('SOSButton Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/family/sos') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'sos_123',
              user_id: 'guest_user',
              timestamp: '2026-09-19T10:00:00Z',
              latitude: 28.6139,
              longitude: 77.209,
              maps_url: 'https://www.google.com/maps?q=28.6139,77.209',
              contacts_alerted: ['Amit Sharma (+91 9876543210)'],
              status: 'active',
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 3-second hold emergency button and triggers SOS upon 3s hold', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <SOSButton />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const sosBtn = screen.getByRole('button', { name: /SOS Emergency Alert/i });
    expect(sosBtn).toBeInTheDocument();

    // Start holding
    fireEvent.mouseDown(sosBtn);

    // Fast forward 3100ms
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    // Modal should now be open
    expect(screen.getByText(/आपातकालीन अलार्म सक्रिय!/i)).toBeInTheDocument();
    expect(screen.getByText(/112 कॉल करें \(Call 112 Now\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Amit Sharma/i)).toBeInTheDocument();
  });

  it('cancels gracefully if released before 3 seconds', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <SOSButton />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const sosBtn = screen.getByRole('button', { name: /SOS Emergency Alert/i });

    // Hold for only 1.5 seconds and release
    fireEvent.mouseDown(sosBtn);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    fireEvent.mouseUp(sosBtn);

    // Advance more time; modal should NOT open
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText(/आपातकालीन अलार्म सक्रिय!/i)).not.toBeInTheDocument();
  });
});
