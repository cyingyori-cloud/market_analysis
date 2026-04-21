import { 
  LayoutDashboard, Radio, Target, FileText, FileBarChart,
  Users, Settings, Bell
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import clsx from 'clsx';

const navItems = [
  { id: 'dashboard', label: '总览仪表盘', icon: LayoutDashboard },
  { id: 'competitor-monitor', label: '竞品动态监测', icon: Radio, badge: 12 },
  { id: 'bid-intelligence', label: '投标情报包', icon: Target, badge: 3 },
  { id: 'policy-analysis', label: '政策信号解读', icon: FileText, badge: 5 },
  { id: 'report-center', label: '竞品分析报告', icon: FileBarChart },
];

const competitorList = [
  { name: '思源电气', color: 'bg-blue-500' },
  { name: '派诺科技', color: 'bg-emerald-500' },
  { name: '安科瑞', color: 'bg-amber-500' },
  { name: '国电南瑞', color: 'bg-red-500' },
  { name: '许继电气', color: 'bg-gray-500' },
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
              className={clsx(
                'w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors',
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 font-medium border-r-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
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

        {/* Competitor List */}
        <div className="px-4 mt-6 mb-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">重点竞品</div>
        </div>
        {competitorList.map((comp) => (
          <div key={comp.name} className="flex items-center gap-2 px-5 py-2 text-sm text-slate-600">
            <div className={clsx('w-2 h-2 rounded-full', comp.color)} />
            <span>{comp.name}</span>
          </div>
        ))}

        {/* Settings */}
        <div className="px-4 mt-6 mb-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">设置</div>
        </div>
        <button className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
          <Settings size={18} />
          <span>扫描配置</span>
        </button>
        <button className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
          <Bell size={18} />
          <span>推送规则</span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-400 text-center">
          4S Intelligence v1.0
        </div>
      </div>
    </div>
  );
}
