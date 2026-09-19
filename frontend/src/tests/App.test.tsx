import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { App } from '../App';
import * as authContext from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

describe('App Root Component', () => {
  it('renders loading spinner when auth is loading', () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isLoading: true,
      loginWithGoogle: vi.fn(),
      loginWithEmailLink: vi.fn(),
      loginAsGuest: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    );

    expect(screen.getByText(/साथी AI लोड हो रहा है/i)).toBeInTheDocument();
  });

  it('renders AuthPage when user is not logged in', () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      loginWithGoogle: vi.fn(),
      loginWithEmailLink: vi.fn(),
      loginAsGuest: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    );

    expect(screen.getByText(/दवा व सेहत/i)).toBeInTheDocument();
    expect(screen.getByText(/तुरंत शुरू करें \(बिना पासवर्ड\)/i)).toBeInTheDocument();
  });

  it('renders Dashboard when user is authenticated', () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: {
        uid: 'test_user_1',
        email: 'test@saathi.local',
        displayName: 'Sharma Ji',
        isGuest: true,
      },
      token: 'dev-token',
      isLoading: false,
      loginWithGoogle: vi.fn(),
      loginWithEmailLink: vi.fn(),
      loginAsGuest: vi.fn(),
      logout: vi.fn(),
    });

    // Mock fetch for dashboard morning brief and medicines
    global.fetch = vi.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/brief/today')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              date: '2026-09-19',
              greeting: 'शुभ प्रभात',
              weather: {
                temperature_celsius: 28,
                condition: 'Clear Sky',
                senior_advice: 'सुहावना मौसम',
              },
              medicines: [],
              vitals_status: 'Normal',
              scam_tip: 'सुरक्षित रहें',
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    );

    expect(screen.getByRole('heading', { name: /Sharma Ji/i })).toBeInTheDocument();
    expect(screen.getByText(/साथी AI आपका दैनिक डिजिटल सहायक/i)).toBeInTheDocument();
  });
});
