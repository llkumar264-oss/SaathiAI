import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorningBriefCard, MorningBrief } from '../features/morning-brief/MorningBriefCard';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const sampleBrief: MorningBrief = {
  greeting: 'सुप्रभात, Sharma Ji!',
  date: '19 September 2026',
  weather: {
    temperature_celsius: 28.5,
    apparent_temperature_celsius: 30.2,
    relative_humidity_percent: 65,
    condition: 'साफ धूप (Clear Sky)',
    is_day: true,
    senior_advice: 'मौसम अनुकूल है। सुबह की सैर के लिए उपयुक्त समय है।',
  },
  today_meds: [
    {
      id: 'med_1',
      name: 'Amlodipine (एम्लोडिपिन)',
      dosage: '5mg',
      timing: '08:30',
      purpose: 'Blood Pressure',
    },
  ],
  missed_doses: ['कल रात Metformin 500mg छूट गई थी'],
  appointments: [],
  wellness_tip: 'कम से कम 8 गिलास गुनगुना पानी पिएं।',
  safety_tip: 'बिजली का बिल कटने का फर्जी SMS आने पर किसी अनजान नंबर पर कॉल न करें।',
  generated_at: '2026-09-19T06:00:00Z',
};

describe('MorningBriefCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders greeting, weather, meds, and missed dose alert from brief', () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <MorningBriefCard initialBrief={sampleBrief} onNavigateToMeds={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    expect(screen.getByText(/सुप्रभात, Sharma Ji!/i)).toBeInTheDocument();
    expect(screen.getByText(/29°C/i)).toBeInTheDocument();
    expect(screen.getByText(/साफ धूप/i)).toBeInTheDocument();
    expect(screen.getByText(/दवाई छूटने की सूचना/i)).toBeInTheDocument();
    expect(screen.getByText(/Amlodipine/i)).toBeInTheDocument();
    expect(screen.getByText(/बिजली का बिल कटने का फर्जी SMS/i)).toBeInTheDocument();
  });

  it('toggles audio speech on Listen click', () => {
    const speakMock = vi.fn();
    window.speechSynthesis = {
      speak: speakMock,
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      paused: false,
      pending: false,
      speaking: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any;

    render(
      <AccessibilityProvider>
        <AuthProvider>
          <MorningBriefCard initialBrief={sampleBrief} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const listenBtn = screen.getByRole('button', { name: /Listen to morning brief in Hindi/i });
    fireEvent.click(listenBtn);
    expect(speakMock).toHaveBeenCalled();
  });
});
