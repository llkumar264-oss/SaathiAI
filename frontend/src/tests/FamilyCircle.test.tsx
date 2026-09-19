import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FamilyCircle, TrustedContact } from '../features/family/FamilyCircle';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const mockContacts: TrustedContact[] = [
  {
    id: 'contact_1',
    name: 'Amit Sharma (अमित)',
    relationship: 'बेटा (Son)',
    phone_number: '+91 9876543210',
    is_primary: true,
    notify_on_scam: true,
    notify_on_vitals: true,
    notify_on_sos: true,
  },
  {
    id: 'contact_2',
    name: 'Priya Sharma (प्रिया)',
    relationship: 'बेटी (Daughter)',
    phone_number: '+91 9811223344',
    is_primary: false,
    notify_on_scam: true,
    notify_on_vitals: true,
    notify_on_sos: true,
  },
];

global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url === '/api/family/contacts') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockContacts),
    });
  }
  if (url === '/api/family/caregiver-view') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          senior_name: 'Sharma Ji',
          today_date: '19 September 2026',
          adherence_rate_7d: 92.5,
          today_doses_summary: [{ name: 'Amlodipine 5mg', time: '08:30' }],
          latest_vitals: { systolic: 128, diastolic: 82, tier: 'Normal' },
          recent_scam_alerts: [],
        }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

describe('FamilyCircle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contacts list and switches to Caregiver dashboard tab', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <FamilyCircle initialContacts={mockContacts} onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    // Initial contacts view
    expect(screen.getByText(/परिवार सुरक्षा घेरा/i)).toBeInTheDocument();
    expect(screen.getByText(/Amit Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/★ मुख्य आपातकालीन संपर्क/i)).toBeInTheDocument();

    // Switch to Caregiver View tab
    const caregiverTab = screen.getByRole('button', { name: /केयरगिवर डैशबोर्ड/i });
    fireEvent.click(caregiverTab);

    await waitFor(() => {
      expect(screen.getByText(/दैनिक स्वास्थ्य सारांश/i)).toBeInTheDocument();
      expect(screen.getByText(/92.5%/i)).toBeInTheDocument();
      expect(screen.getByText(/128\/82 mmHg/i)).toBeInTheDocument();
    });
  });
});
