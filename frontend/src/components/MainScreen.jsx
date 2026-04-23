import React from 'react';
import { useSelector } from 'react-redux';
import InteractionForm from './InteractionForm';
import ChatAssistant from './ChatAssistant';
import HistoryView from './HistoryView';
import Header from './Header';

const MainScreen = () => {
  const { currentView } = useSelector((state) => state.interaction);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f9fafb]">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto w-full h-[calc(100vh-64px)]">
        {/* Left Column: UI (65%) */}
        <div className="w-full lg:w-[65%] overflow-y-auto p-6 md:p-8 lg:p-10 custom-scrollbar">
          {currentView === 'form' ? <InteractionForm /> : <HistoryView />}
        </div>

        {/* Right Column: AI Assistant (35%) */}
        <div className="w-full lg:w-[35%] bg-white border-l border-slate-200 flex flex-col h-full shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.03)] transition-all">
          <ChatAssistant />
        </div>
      </main>
    </div>
  );
};

export default MainScreen;
