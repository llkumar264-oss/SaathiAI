import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserSession {
  uid: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  isGuest: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
  loginAsGuest: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailLink: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('saathi_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate or fetch current session on boot
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('saathi_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser({
            uid: data.uid,
            displayName: data.display_name || 'Sharma Ji',
            email: data.email,
            phoneNumber: data.phone_number,
            isGuest: data.is_guest || savedToken.startsWith('guest-'),
          });
          setToken(savedToken);
        } else {
          // Token expired or invalid
          localStorage.removeItem('saathi_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify session token:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginAsGuest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/guest/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to start guest session');
      }

      const data = await res.json();
      const guestToken = data.token;
      localStorage.setItem('saathi_token', guestToken);
      setToken(guestToken);
      setUser({
        uid: data.guest_id,
        displayName: data.display_name,
        isGuest: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // In production with Firebase Auth client SDK, signInWithPopup(auth, googleProvider) is used.
      // For local dev/test fallback, we provide a dev senior token
      const devToken = 'dev-senior-sharma';
      localStorage.setItem('saathi_token', devToken);
      setToken(devToken);
      setUser({
        uid: 'senior_sharma_101',
        displayName: 'Sharma Ji',
        email: 'sharmaji@family.in',
        isGuest: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmailLink = async (email: string) => {
    setIsLoading(true);
    try {
      const devToken = `dev-${email.split('@')[0]}`;
      localStorage.setItem('saathi_token', devToken);
      setToken(devToken);
      setUser({
        uid: `user_${email.split('@')[0]}`,
        displayName: 'Sharma Ji',
        email,
        isGuest: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('saathi_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginAsGuest,
        loginWithGoogle,
        loginWithEmailLink,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
