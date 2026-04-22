import { Radio, FileText } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import clsx from 'clsx';

const navItems = [
  { id: 'competitor-monitor', label: '竞争对手动态监测', icon: Radio, badge: 83 },
  { id: 'policy-analysis', label: '政策信号解读', icon: FileText, badge: 5 },
];

export function TopBar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="bg-white border-b border-slate-200 px-6">
      <div className="flex items-center justify-between h-14">
        {/* Logo 区域 */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">市场洞察分析</div>
            <div className="text-xs text-slate-400 leading-tight">Market Intelligence v2.0</div>
          </div>
        </div>

        {/* 顶部导航 Tab */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )}
              >
                <Icon size={16} />
                {item.label}
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 右侧占位 */}
        <div className="w-40" />
      </div>
    </div>
  );
}
