import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { AuthProvider } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
