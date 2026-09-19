import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DocumentSimplifier } from '../features/documents/DocumentSimplifier';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const sampleDoc = {
  id: 'doc_123',
  title: 'Electricity Bill',
  doc_type: 'electricity_bill',
  uploaded_at: '2026-09-18T10:00:00Z',
  sections: {
    summary: 'BSES बिजली का बिल है। कुल राशि ₹1,840 है।',
    important_numbers: [
      { label: 'उपभोक्ता संख्या', value: '102938475' },
      { label: 'कुल राशि', value: '₹1,840' },
    ],
    deadlines: [
      {
        title: 'बिल भुगतान की अंतिम तिथि',
        due_date: '2026-09-28',
        converted_to_reminder: false,
      },
    ],
    next_steps: ['अंतिम तारीख से पहले भुगतान करें।', 'लेट फीस से बचें।'],
  },
};

global.fetch = vi.fn().mockImplementation((url) => {
  if (url === '/api/documents') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([sampleDoc]),
    });
  }
  if (url === '/api/documents/doc_123/remind-deadline') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'रिमाइंडर सेट हो गया!' }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

describe('DocumentSimplifier', () => {
  it('renders 4 fixed sections and allows converting deadline to reminder', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <DocumentSimplifier onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    // Assert 4 sections
    await waitFor(() => {
      expect(screen.getByText(/1. मुख्य सार/i)).toBeInTheDocument();
      expect(screen.getByText(/2. ज़रूरी नंबर व राशियां/i)).toBeInTheDocument();
      expect(screen.getByText(/3. अंतिम तारीखें/i)).toBeInTheDocument();
      expect(screen.getByText(/4. आगे क्या करें/i)).toBeInTheDocument();
      expect(screen.getByText(/102938475/i)).toBeInTheDocument();
      expect(screen.getByText(/1-Tap Reminder/i)).toBeInTheDocument();
    });
  });
});
