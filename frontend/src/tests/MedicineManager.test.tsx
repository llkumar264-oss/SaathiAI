import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MedicineManager } from '../features/medicines/MedicineManager';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

// Mock fetch for medicines and adherence
global.fetch = vi.fn().mockImplementation((url) => {
  if (url === '/api/medicines') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 'med_amlo_1',
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily - Morning',
            timing: '08:30',
            purpose: 'Blood pressure control',
          },
        ]),
    });
  }
  if (url === '/api/medicines/adherence') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          overall_adherence_percent: 88.5,
          total_scheduled: 14,
          total_taken: 12,
          total_skipped: 2,
          missed_medicines: [],
        }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

describe('MedicineManager', () => {
  it('renders medicines, prescription scanner button, and adherence stats', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <MedicineManager onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    // Scanner & manual add buttons present
    expect(screen.getByText(/पर्चा स्कैन करें/i)).toBeInTheDocument();
    expect(screen.getByText(/नई दवाई लिखें/i)).toBeInTheDocument();

    // Adherence stat rendered after fetch
    await waitFor(() => {
      expect(screen.getByText(/Amlodipine/i)).toBeInTheDocument();
      expect(screen.getByText(/88.5%/i)).toBeInTheDocument();
    });
  });
});
