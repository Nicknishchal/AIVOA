import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: false },
    { icon: PlusCircle, label: 'New Interaction', active: true },
    { icon: History, label: 'History', active: false },
    { icon: BarChart3, label: 'Analytics', active: false },
  ];

  return (
    <div className="w-64 bg-[#0f172a] h-screen fixed left-0 top-0 text-slate-300 flex flex-col border-r border-slate-800">
      {/* Logo */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-xl font-bold text-white tracking-tight">HCP CRM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
              item.active 
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <item.icon size={20} className={item.active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white transition-colors'} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom Footer */}
      <div className="p-4 border-t border-slate-800/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400">
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
