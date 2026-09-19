import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BhajanHub } from '../features/bhajan/BhajanHub';

describe('BhajanHub Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'AETFvQonfV8',
              title: 'श्री हनुमान चालीसा (Shree Hanuman Chalisa)',
              singer: 'हरिहरन (Hariharan)',
              category: 'hanuman',
              category_hi: 'हनुमान जी',
              duration: '9:42',
              thumbnail: 'https://img.youtube.com/vi/AETFvQonfV8/hqdefault.jpg',
              description: 'संकट मोचन श्री हनुमान चालीसा',
            },
          ]),
      });
    });
  });

  it('renders BhajanHub with search bar, categories, and video cards', async () => {
    const onBackMock = vi.fn();
    render(<BhajanHub onBack={onBackMock} />);

    // Verify title and search bar
    expect(screen.getByText(/भजन, आरती एवं पावन संगीत/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/कोई भी भजन, आरती या गाना खोजें/i)).toBeInTheDocument();

    // Verify category buttons
    expect(screen.getByText(/हनुमान जी \(Hanuman\)/i)).toBeInTheDocument();
    expect(screen.getByText(/कृष्ण भजन \(Krishna\)/i)).toBeInTheDocument();

    // Verify fetched bhajan card renders
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /श्री हनुमान चालीसा/i })).toBeInTheDocument();
    });

    // Test back button
    const backBtn = screen.getByRole('button', { name: /वापस डैशबोर्ड/i });
    fireEvent.click(backBtn);
    expect(onBackMock).toHaveBeenCalled();
  });

  it('plays video and displays embedded iframe when play button clicked', async () => {
    render(<BhajanHub onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /श्री हनुमान चालीसा/i })).toBeInTheDocument();
    });

    const playBtns = screen.getAllByRole('button', { name: /चलाएं \(Play Bhajan\)/i });
    fireEvent.click(playBtns[0]);

    // Verify iframe embed is rendered
    await waitFor(() => {
      const iframe = screen.getByTitle(/श्री हनुमान चालीसा/i);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', expect.stringContaining('AETFvQonfV8'));
    });
  });
});
