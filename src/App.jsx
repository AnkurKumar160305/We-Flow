import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import { AuthProvider, useWorkspaceAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import OnboardingWizard from './pages/OnboardingWizard';
import Navbar from './components/Navbar/Navbar';
import KanbanBoard from './components/Board/KanbanBoard';
import SettingsDrawer from './components/Settings/SettingsDrawer';
import NorthStarModal from './components/Modals/NorthStarModal';
import MondaySyncModal from './components/Modals/MondaySyncModal';
import JoinPage from './pages/JoinPage';
import './App.css';
import './index.css';

// Check if visiting a join link
const isJoinRoute = () => window.location.pathname.startsWith('/join/');
const getJoinToken = () => window.location.pathname.replace('/join/', '');

/* Inner app — receives workspace context */
const AppContent = () => {
  const { user, profile, workspace, loading, isMissingWorkspace } = useWorkspaceAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showNorthStar, setShowNorthStar] = useState(false);
  const [showMondaySync, setShowMondaySync] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message) => {
    const n = { message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false };
    setNotifications(prev => [n, ...prev].slice(0, 20));
  };

  const clearNotifications = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  // Loading screen
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sur-01)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-40)' }}>Loading WeFlow…</div>
        </div>
      </div>
    );
  }

  // Join page route — open to anyone
  if (isJoinRoute()) {
    return <JoinPage token={getJoinToken()} />;
  }

  return (
    <>
      {!user ? (
        <AuthPage />
      ) : (
        <>
          {isMissingWorkspace ? (
            <OnboardingWizard />
          ) : (
            <div className="app-root">
              <Navbar
                onOpenSettings={() => setShowSettings(true)}
                notifications={notifications}
                onClearNotifications={clearNotifications}
                onMondaySync={() => setShowMondaySync(true)}
              />
              <KanbanBoard addNotification={addNotification} />
              <AnimatePresence>
                {showSettings && <SettingsDrawer key="settings" onClose={() => setShowSettings(false)} />}
                {showNorthStar && <NorthStarModal key="northstar" onClose={() => setShowNorthStar(false)} />}
                {showMondaySync && <MondaySyncModal key="mondaysync" onClose={() => setShowMondaySync(false)} />}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
