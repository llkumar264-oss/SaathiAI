import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SaathiChatModal } from '../features/chat/SaathiChatModal';
import { AuthProvider } from '../context/AuthContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';

describe('SaathiChatModal', () => {
  it('renders chat interface with welcome message when open', () => {
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <SaathiChatModal isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    expect(screen.getByText(/साथी AI/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/यहाँ लिखें या माइक दबाएं|Type here/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <AccessibilityProvider>
        <AuthProvider>
          <SaathiChatModal isOpen={false} onClose={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('allows user to type and send a chat message', async () => {
    // Mock fetch for chat SSE streaming response
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        body: {
          getReader: () => {
            let done = false;
            return {
              read: () => {
                if (!done) {
                  done = true;
                  const encoder = new TextEncoder();
                  return Promise.resolve({
                    done: false,
                    value: encoder.encode('data: {"type": "text", "text": "नमस्ते शर्मा जी!"}\n\n'),
                  });
                }
                return Promise.resolve({ done: true, value: undefined });
              },
            };
          },
        },
      })
    );

    render(
      <AccessibilityProvider>
        <AuthProvider>
          <SaathiChatModal isOpen={true} onClose={vi.fn()} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const input = screen.getByPlaceholderText(/यहाँ लिखें या माइक दबाएं|Type here/i);
    fireEvent.change(input, { target: { value: 'मेरी आज की दवाई बताओ' } });
    expect(input).toHaveValue('मेरी आज की दवाई बताओ');

    const sendBtn = screen.getByLabelText(/Send message/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <AccessibilityProvider>
        <AuthProvider>
          <SaathiChatModal isOpen={true} onClose={onCloseMock} />
        </AuthProvider>
      </AccessibilityProvider>
    );

    const closeBtn = screen.getByLabelText(/Close conversation/i);
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
