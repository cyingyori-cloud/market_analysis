import { useEffect } from 'react';
import { FileText, ExternalLink, ArrowRight } from 'lucide-react';
import { useAppStore, fetchPolicies } from '../store/appStore';
import clsx from 'clsx';

export function PolicyAnalysis() {
  const { policies, setLoading } = useAppStore();

  useEffect(() => {
    setLoading(true);
    fetchPolicies().finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={24} className="text-amber-600" />
            行业政策信号解读
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            监控51个站点，自动解读政策影响，关联产品线与客户群，主动推送机会预警
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-slate-900">51</div>
            <div className="text-xs text-slate-500">监控站点</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-amber-600">{policies.filter(p => p.impactLevel === 'high').length}</div>
            <div className="text-xs text-slate-500">高影响政策</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-emerald-600">24h</div>
            <div className="text-xs text-slate-500">解读时效</div>
          </div>
        </div>
      </div>

      {/* Policy List */}
      <div className="space-y-4">
        {policies.map((policy) => (
          <div 
            key={policy.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'px-3 py-1 rounded-lg text-sm font-semibold',
                    policy.impactLevel === 'high' && 'bg-red-100 text-red-700',
                    policy.impactLevel === 'medium' && 'bg-amber-100 text-amber-700',
                    policy.impactLevel === 'low' && 'bg-blue-100 text-blue-700'
                  )}>
                    {policy.impactLevel === 'high' ? '高影响' : policy.impactLevel === 'medium' ? '中影响' : '低影响'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{policy.title}</h3>
                    <div className="text-xs text-slate-400 mt-1">
                      {policy.source} · {new Date(policy.publishedAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
                {policy.sourceUrl && (
                  <a 
                    href={policy.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>

              <p className="text-sm text-slate-600 mb-4">{policy.content}</p>

              {/* Impact Analysis */}
              {policy.impactAnalysis && (
                <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 rounded-r-lg mb-4">
                  <div className="text-xs font-semibold text-blue-700 mb-1">📊 影响分析</div>
                  <div className="text-sm text-blue-800">{policy.impactAnalysis}</div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {policy.affectedProducts?.map((product, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                    影响产品：{product}
                  </span>
                ))}
              </div>

              {/* Opportunities & Threats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-emerald-700 mb-2">🚀 机会</div>
                  <ul className="text-sm text-emerald-800 space-y-1">
                    {policy.opportunities?.map((opp, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-emerald-500">•</span>
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-red-700 mb-2">⚠️ 威胁</div>
                  <ul className="text-sm text-red-800 space-y-1">
                    {policy.threats?.length > 0 ? (
                      policy.threats.map((threat, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-red-500">•</span>
                          {threat}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-red-500">暂无明显威胁</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Recommendation */}
              {policy.recommendation && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm font-semibold text-amber-800 mb-2">💡 建议行动</div>
                  <div className="text-sm text-amber-900">{policy.recommendation}</div>
                  <button className="mt-3 flex items-center gap-1 text-sm text-amber-700 font-medium hover:text-amber-900">
                    查看关联客户 <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
