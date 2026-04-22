import {
  Radio, FileText
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';


const navItems = [
  { id: 'competitor-monitor', label: '竞争对手动态监测', icon: Radio, badge: 83 },
  { id: 'policy-analysis', label: '政策信号解读', icon: FileText, badge: 5 },
];



export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-slate-900">市场洞察分析</div>
            <div className="text-xs text-slate-500">Market Intelligence</div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">系统导航</div>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-600 font-medium border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}


      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-400 text-center">
          4S Intelligence v2.0
        </div>
      </div>
    </div>
  );
}
