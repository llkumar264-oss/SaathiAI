import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScamShield } from '../features/scam-shield/ScamShield';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

global.fetch = vi.fn().mockImplementation((url) => {
  if (url === '/api/scam/check') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'scam_test_1',
          risk_score: 95,
          tier: 'High Risk (धोखाधड़ी)',
          signals: ['Electricity cut-off threat', 'Urgent deadline tonight'],
          explanation: 'यह एक जानी-पहचानी बिजली बिल की धोखाधड़ी (Scam) है। बिजली विभाग कभी ऐसे धमकी भरे मैसेज नहीं भेजता।',
          family_alerted: false,
        }),
    });
  }
  if (url === '/api/scam/history') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

describe('ScamShield', () => {
  it('renders input area and analyzes suspicious message', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <ScamShield onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    expect(screen.getByText(/धोखाधड़ी कवच/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/जैसे: बिजली बिल कटने की धमकी/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Electricity power will be cut tonight call 9876543210' } });
    const checkBtn = screen.getByRole('button', { name: /संदेश की जांच करें/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/High Risk/i)).toBeInTheDocument();
      expect(screen.getByText(/95/i)).toBeInTheDocument();
      expect(screen.getByText(/Tell My Family in 1-Tap/i)).toBeInTheDocument();
    });
  });
});
