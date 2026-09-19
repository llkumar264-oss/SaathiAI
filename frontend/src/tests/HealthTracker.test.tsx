import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthTracker, VitalEntry } from '../features/health/HealthTracker';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const mockVitals: VitalEntry[] = [
  {
    id: 'vital_1',
    timestamp: '2026-09-19T08:00:00Z',
    systolic: 184,
    diastolic: 112,
    pulse: 98,
    blood_sugar: 128,
    sugar_context: 'random',
    tier: 'Urgent',
    bp_tier: 'Urgent',
    sugar_tier: 'Normal',
    jnc8_target_met: false,
    is_anomaly: true,
    anomaly_reason: 'Urgent Tier: Systolic >= 180 mmHg.',
    advisory: '⚠️ URGENT: Blood pressure or sugar level is at a critical threshold. Please contact a doctor now / call 112 immediately.',
    urgent: true,
    notes: 'Felt dizzy',
  },
  {
    id: 'vital_2',
    timestamp: '2026-09-18T08:00:00Z',
    systolic: 128,
    diastolic: 82,
    pulse: 72,
    blood_sugar: 105,
    sugar_context: 'fasting',
    tier: 'Normal',
    bp_tier: 'Normal',
    sugar_tier: 'Normal',
    jnc8_target_met: true,
    is_anomaly: false,
    advisory: 'Healthy reading',
    urgent: false,
  },
];

describe('HealthTracker Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders urgent banner and advisory when latest reading is urgent', () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <HealthTracker initialVitals={mockVitals} onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    // Urgent banner check
    expect(screen.getByText(/चेतावनी: तत्काल चिकित्सकीय ध्यान आवश्यक/i)).toBeInTheDocument();
    expect(screen.getByText(/Please contact a doctor now \/ call 112 immediately/i)).toBeInTheDocument();

    // Latest BP and Sugar readings
    expect(screen.getByText('184/112')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();

    // Medical disclaimer
    expect(screen.getByText(/अस्वीकरण \(Medical Disclaimer\)/i)).toBeInTheDocument();
  });

  it('allows manual form input for vitals', () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <HealthTracker initialVitals={mockVitals} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const sysInput = screen.getByLabelText(/ऊपर का BP \(Systolic\)/i);
    const diaInput = screen.getByLabelText(/नीचे का BP \(Diastolic\)/i);
    const sugarInput = screen.getByLabelText(/ब्लड शुगर/i);

    fireEvent.change(sysInput, { target: { value: '130' } });
    fireEvent.change(diaInput, { target: { value: '85' } });
    fireEvent.change(sugarInput, { target: { value: '110' } });

    expect(sysInput).toHaveValue(130);
    expect(diaInput).toHaveValue(85);
    expect(sugarInput).toHaveValue(110);
  });
});
