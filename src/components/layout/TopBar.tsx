import { Bell, RefreshCw, User } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const tabNames: Record<string, string> = {
  'competitor-monitor': '竞品动态监测',
  'policy-analysis': '政策信号解读',
};

export function TopBar() {
  const { activeTab, alerts, isLoading, setLoading } = useAppStore();
  const unreadAlerts = alerts.filter(a => a.level === 'high').length;

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-900">
          {tabNames[activeTab] || '总览'}
        </h1>
        <div className="text-sm text-slate-400">
          数据更新：{new Date().toLocaleString('zh-CN')}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          刷新
        </button>
        
        <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <Bell size={20} />
          {unreadAlerts > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadAlerts}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">管理员</div>
            <div className="text-xs text-slate-500">市场部</div>
          </div>
        </div>
      </div>
    </header>
  );
}
