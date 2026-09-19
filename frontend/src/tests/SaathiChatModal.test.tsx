import { render, screen } from '@testing-library/react';
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
});
