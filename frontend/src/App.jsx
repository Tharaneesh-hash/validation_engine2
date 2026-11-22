import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import HeaderInspector from './pages/HeaderInspector';
import CookieValidator from './pages/CookieValidator';
import DfaStateMachine from './pages/DfaStateMachine';
import SecurityAnalysis from './pages/SecurityAnalysis';
import ValidationHistory from './pages/ValidationHistory';
import Settings from './pages/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transferCookie, setTransferCookie] = useState(null);

  // Transition handler from Header Inspector to Cookie Validator
  const handleNavigateToCookie = (cookieObj) => {
    setTransferCookie(cookieObj);
    setActiveTab('cookies');
  };

  // Transition handler from Cookie Validator to DFA State Machine
  const handleNavigateToDfa = (cookieRecord) => {
    setTransferCookie(cookieRecord);
    setActiveTab('dfa');
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
      case 'headers':
        return <HeaderInspector onNavigateToCookie={handleNavigateToCookie} />;
      case 'cookies':
        return (
          <CookieValidator
            initialCookie={transferCookie}
            onNavigateToDfa={handleNavigateToDfa}
          />
        );
      case 'dfa':
        return <DfaStateMachine targetCookie={transferCookie} />;
      case 'security':
        return <SecurityAnalysis />;
      case 'history':
        return <ValidationHistory />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100">
      {/* Top Navigation Bar with Database Status indicator */}
      <Navbar
        onOpenSettings={() => setActiveTab('settings')}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Center Content Stage */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
