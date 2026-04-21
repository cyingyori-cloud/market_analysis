import { useEffect, useState } from 'react';
import { 
  Radio, Target, FileText, FileBarChart, AlertTriangle, 
  TrendingUp, TrendingDown, Clock, CheckCircle
} from 'lucide-react';
import { useAppStore, fetchCompetitors, fetchCompetitorNews, fetchAlerts, fetchPolicies, fetchBidResults } from '../store/appStore';
import clsx from 'clsx';

function StatCard({ 
  title, value, subtitle, icon: Icon, trend, trendLabel, iconBg, iconColor 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500 mb-1">{title}</div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        </div>
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend > 0 ? (
            <TrendingUp size={14} className="text-emerald-500" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span className={trend > 0 ? 'text-emerald-500' : 'text-red-500'}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-slate-400 ml-1">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function AlertItem({ alert }: { alert: any }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className={clsx(
        'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
        alert.level === 'high' ? 'bg-red-500' : alert.level === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
      )} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{alert.title}</div>
        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.content}</div>
      </div>
      <div className="text-xs text-slate-400 flex-shrink-0">
        {new Date(alert.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

function ActivityItem({ news }: { news: any }) {
  const tagColors: Record<string, string> = {
    major: 'bg-red-100 text-red-700',
    new: 'bg-blue-100 text-blue-700',
    bid: 'bg-emerald-100 text-emerald-700',
    strategy: 'bg-amber-100 text-amber-700',
    personnel: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={clsx('px-2 py-0.5 rounded text-xs font-medium', tagColors[news.tag] || 'bg-gray-100')}>
        {news.tagLabel}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-900">
          <span className="font-medium">{news.competitorName}</span>
          {' '}{news.title}
        </div>
        {news.impactAnalysis && (
          <div className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
            ⚠️ {news.impactAnalysis}
          </div>
        )}
        <div className="text-xs text-slate-400 mt-1">
          {news.source} · {new Date(news.publishedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { competitors, competitorNews, alerts, policies, bidResults, setLoading, isLoading } = useAppStore();
  const [activeTab, setActiveTab] = useState<'all' | 'major' | 'bid' | 'policy'>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCompetitors(),
      fetchCompetitorNews(),
      fetchAlerts(),
      fetchPolicies(),
      fetchBidResults(),
    ]).finally(() => setLoading(false));
  }, []);

  const todayNews = competitorNews.filter(n => 
    n.publishedAt.startsWith(new Date().toISOString().split('T')[0])
  );
  const majorSignals = competitorNews.filter(n => n.tag === 'major');
  const pendingPolicies = policies.filter(p => p.impactLevel === 'high');
  
  const highAlerts = alerts.filter(a => a.level === 'high');

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="今日竞品动态"
          value={todayNews.length}
          subtitle="较昨日 +23%"
          icon={Radio}
          trend={23}
          trendLabel="较昨日"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="重大信号预警"
          value={majorSignals.length}
          subtitle="需立即关注"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          title="政策解读待处理"
          value={pendingPolicies.length}
          subtitle="3条已关联客户"
          icon={FileText}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="本月中标情报"
          value={bidResults.slice(0, 5).length}
          subtitle="覆盖3个区域"
          icon={Target}
          trend={12}
          trendLabel="本月"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* 4S Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { name: '4S-1 竞品动态监测', desc: '每日扫描50家竞品，自动打标签', stat: '156条/日', colorIdx: 0 },
          { name: '4S-2 投标情报包', desc: '历史中标、价格区间、技术方案', stat: '3个待投', colorIdx: 1 },
          { name: '4S-3 政策解读', desc: '51个站点监控，24h解读时效', stat: '8条待解读', colorIdx: 2 },
          { name: '4S-4 分析报告', desc: '日报/月报一键生成，推送微信', stat: '已推送23人', colorIdx: 3 },
        ].map((mod, i) => {
          const Icon = [Radio, Target, FileText, FileBarChart][i];
          const colorMap = [
            { bg: 'bg-blue-50', text: 'text-blue-600' },
            { bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { bg: 'bg-amber-50', text: 'text-amber-600' },
            { bg: 'bg-purple-50', text: 'text-purple-600' },
          ];
          const c = colorMap[mod.colorIdx];
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
            >
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center mb-3', c.bg, c.text)}>
                <Icon size={20} />
              </div>
              <div className="font-semibold text-slate-900 mb-1">{mod.name}</div>
              <div className="text-xs text-slate-500 mb-3">{mod.desc}</div>
              <div className={clsx('text-sm font-medium', c.text)}>{mod.stat}</div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">实时情报流</h2>
              <div className="flex gap-2">
                {(['all', 'major', 'bid', 'policy'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      'px-3 py-1 text-xs rounded-full transition-colors',
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {{ all: '全部', major: '重大信号', bid: '中标', policy: '政策' }[tab]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {competitorNews.slice(0, 10).map((news) => (
              <ActivityItem key={news.id} news={news} />
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              今日预警
            </h2>
            <span className="text-xs text-slate-500">{highAlerts.length}条高优先</span>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {highAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
            {highAlerts.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                暂无高优先级预警
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Competitor Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h2 className="font-semibold text-slate-900 mb-4">竞品活跃度排名（近7天）</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {competitors.slice(0, 5).map((comp, i) => {
            const newsCount = competitorNews.filter(n => n.competitorId === comp.id).length;
            const score = Math.min(100, newsCount * 15 + 20);
            return (
              <div key={comp.id} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx(
                    'w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center',
                    i === 0 && 'bg-red-500',
                    i === 1 && 'bg-amber-500',
                    i === 2 && 'bg-yellow-500',
                    i > 2 && 'bg-slate-400'
                  )}>
                    {i + 1}
                  </div>
                  <span className="font-medium text-sm">{comp.name}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{newsCount}条动态</span>
                  <span className="font-medium">{score}分</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
