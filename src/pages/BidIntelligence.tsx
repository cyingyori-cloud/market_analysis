import { useEffect, useState } from 'react';
import { Target, FileText, Download, Plus, Clock } from 'lucide-react';
import { useAppStore, fetchBidResults, createBidPackage } from '../store/appStore';
import clsx from 'clsx';

function formatCurrency(amount: number) {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(2)}亿`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}万`;
  return `¥${amount.toLocaleString()}`;
}

export function BidIntelligence() {
  const { bidResults, competitors, setLoading } = useAppStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'results'>('pending');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchBidResults().finally(() => setLoading(false));
  }, []);

  const handleCreatePackage = async () => {
    setIsGenerating(true);
    try {
      await createBidPackage('国网2026年配网物资第二批');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target size={24} className="text-emerald-600" />
            投标情报包
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            投标前自动生成竞品情报包：历史中标记录、产品动态、价格区间、技术方案亮点
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
            <Download size={16} />
            导出全部
          </button>
          <button 
            onClick={handleCreatePackage}
            disabled={isGenerating}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} />
            {isGenerating ? '生成中...' : '新建情报包'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '待投标项目', value: 3, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '本月开标情报', value: bidResults.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '竞品历史报价', value: 86, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '开标速报时效', value: '≤24h', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'pending', label: '待投标情报包', count: 3 },
          { id: 'results', label: '开标结果速报', count: bidResults.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'px-4 py-2 text-sm rounded-lg transition-colors',
              activeTab === tab.id 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Bid Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">国网2026年第一批配网物资招标结果</h2>
          <p className="text-xs text-slate-500 mt-1">公示日期：2026-04-19 · 速报生成：公示后18小时</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">中标企业</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">中标金额</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">份额</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">份额变化</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">主要标段</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">趋势</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bidResults.slice(0, 6).map((result, i) => {
              const isSiyuan = result.competitorName === '思源电气';
              const shareNum = parseFloat(result.marketShare) || 0;
              return (
                <tr key={result.id} className={isSiyuan ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3">
                    <span className={clsx('font-semibold', isSiyuan && 'text-red-700')}>
                      {result.competitorName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(result.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(shareNum * 10, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{result.marketShare}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'text-sm font-medium',
                      result.shareChange.startsWith('+') ? 'text-emerald-600' : 
                      result.shareChange.startsWith('-') ? 'text-red-600' : 'text-slate-600'
                    )}>
                      {result.shareChange}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {result.mainCategories?.join('、')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'text-sm',
                      result.shareChange.startsWith('+') ? 'text-emerald-600' : 
                      result.shareChange.startsWith('-') ? 'text-red-600' : 'text-slate-400'
                    )}>
                      {result.shareChange.startsWith('+') ? '📈' : result.shareChange.startsWith('-') ? '📉' : '➡️'}{' '}
                      {result.shareChange.startsWith('+') ? '上升' : result.shareChange.startsWith('-') ? '下降' : '持平'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Analysis Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Price Range */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">竞品历史中标价格区间</h3>
          <div className="space-y-4">
            {[
              { name: '思源电气', range: '85-128万/站', width: 70, color: 'bg-blue-500' },
              { name: '国电南瑞', range: '95-145万/站', width: 80, color: 'bg-emerald-500' },
              { name: '许继电气', range: '78-118万/站', width: 60, color: 'bg-amber-500' },
              { name: '中电电力', range: '82-120万/站', width: 65, color: 'bg-purple-500' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={i === 3 ? 'font-semibold text-purple-600' : ''}>{item.name}</span>
                  <span className={i === 3 ? 'text-purple-600' : 'text-slate-500'}>{item.range}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full opacity-70`} style={{ width: `${item.width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">💡 Agent 应对建议</h3>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
              <div className="text-sm font-semibold text-red-700">思源电气份额持续提升（+1.2%）</div>
              <p className="text-xs text-red-600 mt-1">
                建议在开关柜和互感器标段适当调整报价策略，同时强调整体方案优势
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
              <div className="text-sm font-semibold text-amber-700">安科瑞+派诺份额缓慢提升</div>
              <p className="text-xs text-amber-600 mt-1">
                智能仪表标段需关注安科瑞的AI差异化，储能BMS领域需加快布局
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
              <div className="text-sm font-semibold text-emerald-700">中电电力份额微升（+0.3%）</div>
              <p className="text-xs text-emerald-600 mt-1">
                配网自动化标段策略正确，可继续加大投入
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
