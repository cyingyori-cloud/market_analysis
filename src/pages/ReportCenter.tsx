import { useEffect, useState } from 'react';
import { FileBarChart, Download, RefreshCw, Printer, Users } from 'lucide-react';
import { useAppStore, fetchCompetitors, fetchBidResults, generateReport } from '../store/appStore';
import clsx from 'clsx';

export function ReportCenter() {
  const { competitors, bidResults, setLoading } = useAppStore();
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCompetitors(), fetchBidResults()]).finally(() => setLoading(false));
  }, []);

  const handleGenerateReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    setGenerating(type);
    try {
      await generateReport(type);
    } finally {
      setGenerating(null);
    }
  };

  // Calculate market share changes
  const marketChanges = bidResults.slice(0, 6).map(result => ({
    ...result,
    shareNum: parseFloat(result.marketShare) || 0,
    changeNum: parseFloat(result.shareChange) || 0,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart size={24} className="text-purple-600" />
            竞品分析报告
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            每日/月度自动生成竞品报告，15家核心竞品深度档案，一键生成竞品对标卡
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
            <Printer size={16} />
            打印
          </button>
          <button className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
            <Download size={16} />
            下载PDF
          </button>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { type: 'daily', label: '竞品动态日报', desc: '一页纸，3-5条最重要动态', meta: '每日 08:00 自动生成' },
          { type: 'weekly', label: '竞品周度报告', desc: '本周竞品动态汇总分析', meta: '每周一生成' },
          { type: 'monthly', label: '竞品月度分析', desc: '3-5页深入分析，含SWOT', meta: '每月1日生成' },
          { type: 'profile', label: '竞品深度档案', desc: '15家核心竞品深度档案', meta: '季度更新' },
        ].map((report) => (
          <div 
            key={report.type}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <FileBarChart size={24} className="text-purple-600" />
            </div>
            <div className="font-semibold text-slate-900 mb-1">{report.label}</div>
            <div className="text-sm text-slate-500 mb-3">{report.desc}</div>
            <div className="text-xs text-purple-600 font-medium mb-4">{report.meta}</div>
            <button
              onClick={() => handleGenerateReport(report.type as any)}
              disabled={generating === report.type}
              className="w-full py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={generating === report.type ? 'animate-spin' : ''} />
              {generating === report.type ? '生成中...' : '立即生成'}
            </button>
          </div>
        ))}
      </div>

      {/* Market Share Changes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">竞品份额变化矩阵</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">竞品</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">2025H2</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">2026H1</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">变化</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {marketChanges.map((result, i) => {
              const isSiyuan = result.competitorName === '思源电气';
              const isZD = result.competitorName === '中电电力';
              return (
                <tr key={result.id} className={isSiyuan ? 'bg-red-50' : isZD ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'font-semibold',
                      isSiyuan && 'text-red-700',
                      isZD && 'text-blue-700',
                    )}>
                      {result.competitorName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(parseFloat(result.marketShare) - result.changeNum).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {result.marketShare}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'text-sm font-medium',
                      result.changeNum > 0 ? 'text-emerald-600' : result.changeNum < 0 ? 'text-red-600' : 'text-slate-400'
                    )}>
                      {result.changeNum > 0 ? '↑' : result.changeNum < 0 ? '↓' : '→'} {result.shareChange}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SWOT Analysis */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { title: '💪 优势 S', items: ['配网自动化整体方案完整', '客户关系稳定，区域口碑好', '产品性价比优于部分竞品'], bg: 'bg-emerald-50', border: 'border-emerald-300' },
          { title: '⚠️ 劣势 W', items: ['特高压GIL产品线空白', '数字化平台IT能力弱于国电南瑞', '储能BMS领域刚起步'], bg: 'bg-red-50', border: 'border-red-300' },
          { title: '🚀 机会 O', items: ['配网改造5000亿投资计划', '新型工业化方案利好数字化', '储能市场高速增长'], bg: 'bg-blue-50', border: 'border-blue-300' },
          { title: '⚡ 威胁 T', items: ['思源份额持续上升', '派诺武汉基地投产压价', '安科瑞AI差异化威胁'], bg: 'bg-amber-50', border: 'border-amber-300' },
        ].map((swot, i) => (
          <div key={i} className={`${swot.bg} rounded-xl border ${swot.border} p-4`}>
            <h3 className="font-semibold text-slate-900 mb-3">{swot.title}</h3>
            <ul className="space-y-2">
              {swot.items.map((item, j) => (
                <li key={j} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Competitor Cards */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-4">重点竞品深度档案</h2>
        <div className="grid grid-cols-3 gap-4">
          {competitors.slice(0, 6).map((comp) => (
            <div key={comp.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold',
                  comp.threatLevel === 'high' && 'bg-red-500',
                  comp.threatLevel === 'medium' && 'bg-amber-500',
                  comp.threatLevel === 'low' && 'bg-slate-400'
                )}>
                  {comp.shortName.slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{comp.name}</div>
                  <div className="text-xs text-slate-500">{comp.marketCap}</div>
                </div>
                <div className={clsx(
                  'ml-auto px-2 py-1 rounded text-xs font-medium',
                  comp.threatLevel === 'high' && 'bg-red-100 text-red-700',
                  comp.threatLevel === 'medium' && 'bg-amber-100 text-amber-700',
                  comp.threatLevel === 'low' && 'bg-slate-100 text-slate-600'
                )}>
                  {comp.threatLevel === 'high' ? '高威胁' : comp.threatLevel === 'medium' ? '中威胁' : '低威胁'}
                </div>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div>
                  <span className="text-slate-500">产品线：</span>
                  <span className="text-slate-700">{comp.mainProducts?.slice(0, 2).join('、')}</span>
                </div>
                <div>
                  <span className="text-slate-500">核心优势：</span>
                  <span className="text-slate-700">{comp.coreStrengths?.slice(0, 2).join('、')}</span>
                </div>
                <div>
                  <span className="text-slate-500">国网份额：</span>
                  <span className="font-medium text-red-600">{comp.marketShare?.nationalGrid}</span>
                </div>
              </div>
              <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">档案更新：2026-04-01</span>
                <button className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  生成对标卡 <Users size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
