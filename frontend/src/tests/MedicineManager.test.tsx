import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineManager } from '../features/medicines/MedicineManager';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

describe('MedicineManager', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (typeof url === 'string' && url.includes('/api/medicines/adherence')) {
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
      if (typeof url === 'string' && url.includes('/log')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'success',
              message: 'Dose marked as taken',
            }),
        });
      }
      if (typeof url === 'string' && url.endsWith('/api/medicines') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'med_met_2',
              name: 'Metformin',
              dosage: '500mg',
              frequency: 'Once daily - Morning',
              timing: '09:00',
              purpose: 'Sugar control',
            }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/medicines')) {
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders medicines, prescription scanner button, and adherence stats', async () => {
    const onBackMock = vi.fn();
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <MedicineManager onBack={onBackMock} />
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

    // Test back button
    const backBtn = screen.getByText(/वापस डैशबोर्ड/i);
    fireEvent.click(backBtn);
    expect(onBackMock).toHaveBeenCalled();
  });

  it('opens manual entry form, fills fields, and submits', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <MedicineManager onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Amlodipine/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByText(/नई दवाई लिखें/i);
    fireEvent.click(addBtn);

    // Verify modal inputs are visible with correct placeholders
    expect(screen.getByPlaceholderText(/जैसे: Amlodipine/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/जैसे: Amlodipine/i);
    fireEvent.change(nameInput, { target: { value: 'Metformin' } });

    const dosageInput = screen.getByPlaceholderText(/जैसे: 5mg \/ 1 गोली/i);
    fireEvent.change(dosageInput, { target: { value: '500mg' } });

    const submitBtn = screen.getByText(/सुरक्षित करें/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/medicines',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('allows logging a dose as taken', async () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <MedicineManager onBack={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Amlodipine/i)).toBeInTheDocument();
    });

    const takeBtn = screen.getByText(/ली \(Taken\)/i);
    fireEvent.click(takeBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/log'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
