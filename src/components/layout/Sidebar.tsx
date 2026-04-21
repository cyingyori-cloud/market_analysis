import {
  Radio, FileText
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';


const navItems = [
  { id: 'competitor-monitor', label: '竞品动态监测', icon: Radio, badge: 83 },
  { id: 'policy-analysis', label: '政策信号解读', icon: FileText, badge: 5 },
];



export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">4S</span>
          </div>
          <div>
            <div className="font-bold text-slate-900">竞品情报系统</div>
            <div className="text-xs text-slate-500">Competitive Intel</div>
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
