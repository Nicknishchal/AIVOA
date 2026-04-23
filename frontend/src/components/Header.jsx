import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentView, setFilterHCP } from '../store/interactionSlice';
import { Bell, User, Sparkles, PlusCircle, History } from 'lucide-react';

const Header = () => {
  const { currentView } = useSelector((state) => state.interaction);
  const dispatch = useDispatch();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50 px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg cursor-pointer" onClick={() => dispatch(setCurrentView('form'))}>
            <Sparkles size={20} />
          </div>
          <div className="cursor-pointer" onClick={() => dispatch(setCurrentView('form'))}>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">HCP Interaction Tracker</h1>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">AI-powered CRM system</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
           <button 
             onClick={() => dispatch(resetSystem())}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentView === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <PlusCircle size={14} />
             LOG NEW
           </button>
           <button 
             onClick={() => {
               dispatch(setFilterHCP(null));
               dispatch(setCurrentView('history'));
             }}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentView === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <History size={14} />
             HISTORY
           </button>
        </nav>
      </div>

      <div className="flex items-center gap-8">
        {/* AI Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest">AI Online</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
