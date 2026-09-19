import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechTutor } from '../features/tutor/TechTutor';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const mockCatalog = [
  {
    id: 'upi_payment',
    title: 'UPI या QR कोड से सुरक्षित भुगतान करना',
    category: 'finance',
    target_app: 'GPay / PhonePe',
    difficulty: 'आसान (Easy)',
    total_steps: 5,
    language: 'hi',
  },
];

const mockTutorial = {
  id: 'upi_payment',
  title: 'UPI या QR कोड से सुरक्षित भुगतान करना',
  category: 'finance',
  target_app: 'GPay / PhonePe',
  difficulty: 'आसान (Easy)',
  total_steps: 2,
  language: 'hi',
  steps: [
    {
      step_number: 1,
      title: 'पेमेंट ऐप खोलें',
      description: 'Google Pay या PhonePe पर टैप करें।',
      tip: 'इंटरनेट चालू रखें।',
      icon: '📱',
    },
    {
      step_number: 2,
      title: 'QR स्कैनर खोलें',
      description: 'कैमरा स्कैनर पर टैप करें।',
      warning: '⚠️ पैसे प्राप्त करने के लिए कभी UPI PIN न डालें।',
      icon: '📷',
    },
  ],
};

global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url === '/api/tutor/tutorials') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockCatalog),
    });
  }
  if (url === '/api/tutor/tutorials/upi_payment') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockTutorial),
    });
  }
  if (url === '/api/tutor/ask-help') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          answer: 'स्क्रीन के नीचे ध्यान से देखें, वहां स्कैनर बटन है।',
          reassuring_note: 'चिंता मत कीजिए शर्मा जी!',
        }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

describe('TechTutor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tutorial catalog and allows starting a guide', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <TechTutor onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/टेक गुरु • डिजिटल मार्गदर्शक/i)).toBeInTheDocument();
      expect(screen.getByText(/UPI या QR कोड से सुरक्षित भुगतान करना/i)).toBeInTheDocument();
    });

    // Click 'Start' on the UPI tutorial
    const startBtn = screen.getByRole('button', { name: /शुरू करें \(Start\)/i });
    fireEvent.click(startBtn);

    // Should load single-step view
    await waitFor(() => {
      expect(screen.getByText(/कदम 1 \/ 2/i)).toBeInTheDocument();
      expect(screen.getByText(/पेमेंट ऐप खोलें/i)).toBeInTheDocument();
    });

    // Advance to Step 2
    const nextBtn = screen.getByRole('button', { name: /अगला कदम \(Next\)/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/कदम 2 \/ 2/i)).toBeInTheDocument();
      expect(screen.getByText(/QR स्कैनर खोलें/i)).toBeInTheDocument();
      expect(screen.getByText(/पैसे प्राप्त करने के लिए कभी UPI PIN न डालें/i)).toBeInTheDocument();
    });

    // Click 'I am stuck' button
    const stuckBtn = screen.getByRole('button', { name: /मैं यहाँ अटक गया\/गई हूँ/i });
    fireEvent.click(stuckBtn);

    await waitFor(() => {
      expect(screen.getByText(/घबराएं नहीं, साथी आपके साथ है!/i)).toBeInTheDocument();
    });
  });
});
