import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from '../pages/Dashboard';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const sampleBrief = {
  greeting: 'सुप्रभात, Sharma Ji!',
  date: '19 September 2026',
  weather: {
    temperature_celsius: 28.5,
    apparent_temperature_celsius: 30.2,
    relative_humidity_percent: 65,
    condition: 'साफ धूप (Clear Sky)',
    is_day: true,
    senior_advice: 'मौसम अनुकूल है।',
  },
  today_meds: [],
  missed_doses: [],
  appointments: [],
  wellness_tip: 'गुनगुना पानी पिएं।',
  safety_tip: 'अनजान OTP शेयर न करें।',
  generated_at: '2026-09-19T06:00:00Z',
};

global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url === '/api/morning-brief') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(sampleBrief),
    });
  }
  if (url === '/api/medicines') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  }
  if (url === '/api/medicines/schedule/today') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  }
  if (url === '/api/medicines/adherence?days=7') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          overall_adherence_percent: 95.0,
          total_scheduled: 10,
          total_taken: 9,
          total_skipped: 1,
          missed_medicines: [],
        }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 6 senior action tiles, morning brief, and hero talk button', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </AccessibilityProvider>
    );

    // Tiles
    expect(screen.getByText(/दवाइयां एवं पर्चा \(Medicines\)/i)).toBeInTheDocument();
    expect(screen.getByText(/फ्रॉड रक्षक \(Scam Shield\)/i)).toBeInTheDocument();
    expect(screen.getByText(/स्वास्थ्य ट्रैकर \(Health & Vitals\)/i)).toBeInTheDocument();
    expect(screen.getByText(/कागज़ात समझें \(Documents\)/i)).toBeInTheDocument();
    expect(screen.getByText(/टेक गुरु \(Tech Tutor\)/i)).toBeInTheDocument();
    expect(screen.getByText(/परिवार एवं SOS \(Family Circle\)/i)).toBeInTheDocument();

    // Hero Floating Voice button
    expect(
      screen.getByRole('button', { name: /Open Saathi Voice Companion/i })
    ).toBeInTheDocument();
  });

  it('navigates to Medicines feature and back to home', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const medTile = screen.getByText(/दवाइयां एवं पर्चा \(Medicines\)/i);
    fireEvent.click(medTile);

    await waitFor(() => {
      expect(screen.getByText(/पर्चा स्कैन करें/i)).toBeInTheDocument();
    });

    // Click back to dashboard
    const backBtn = screen.getByRole('button', { name: /वापस डैशबोर्ड/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/दवाइयां एवं पर्चा \(Medicines\)/i)).toBeInTheDocument();
    });
  });
});
