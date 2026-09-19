import React from 'react';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-teal-deep border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xl font-bold text-teal-deep">साथी AI लोड हो रहा है...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
};

export default App;
