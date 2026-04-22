import { useEffect, useState } from 'react';
import { FileText, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { useAppStore, fetchPolicies } from '../store/appStore';
import clsx from 'clsx';

const impactFilters = [
  { value: 'all', label: '全部' },
  { value: 'high', label: '高影响' },
  { value: 'medium', label: '中影响' },
  { value: 'low', label: '低影响' },
];

const sourceFilters = [
  { value: 'all', label: '全部来源' },
  { value: 'gov', label: '国家政策(20)' },
  { value: 'local', label: '地方政府(31)' },
  { value: 'industry', label: '行业网站(17)' },
];

// 监控的68个官方数据来源
const monitorSources = [
  // 国家政策网址
  { name: '中国人民政府网', url: 'http://www.gov.cn/', type: 'gov' },
  { name: '生态环境部', url: 'http://www.mee.gov.cn/', type: 'gov' },
  { name: '国家发改委', url: 'http://www.ndrc.gov.cn/', type: 'gov' },
  { name: '住建部', url: 'http://www.mohurd.gov.cn/', type: 'gov' },
  { name: '工信部', url: 'http://www.miit.gov.cn/', type: 'gov' },
  { name: '交通运输部', url: 'http://xxgk.mot.gov.cn/', type: 'gov' },
  { name: '教育部', url: 'http://www.moe.gov.cn/', type: 'gov' },
  { name: '国家统计局', url: 'http://www.stats.gov.cn/', type: 'gov' },
  { name: '市场监管总局', url: 'http://www.samr.gov.cn/', type: 'gov' },
  { name: '国家能源局', url: 'http://www.nea.gov.cn/', type: 'gov' },
  { name: '国家电力需求侧管理平台', url: 'http://www.dsm.gov.cn/', type: 'gov' },
  { name: '国网新能源云', url: 'http://sgnec.esgcc.com.cn/', type: 'gov' },
  // 地方政府网 (部分)
  { name: '北京市', url: 'http://www.beijing.gov.cn/', type: 'local' },
  { name: '上海市', url: 'http://www.shanghai.gov.cn/', type: 'local' },
  { name: '广东省', url: 'http://www.gd.gov.cn/', type: 'local' },
  { name: '浙江省', url: 'http://www.zj.gov.cn/', type: 'local' },
  { name: '江苏省', url: 'http://www.jiangsu.gov.cn/', type: 'local' },
  { name: '山东省', url: 'http://www.shandong.gov.cn/', type: 'local' },
  { name: '河南省', url: 'http://www.henan.gov.cn/', type: 'local' },
  { name: '四川省', url: 'http://www.sc.gov.cn/', type: 'local' },
  // 行业网站
  { name: '北极星电力网', url: 'https://www.bjx.com.cn/', type: 'industry' },
  { name: '中国电力网', url: 'http://www.chinapower.com.cn/', type: 'industry' },
  { name: '能源新闻网', url: 'http://www.cnenergynews.cn/', type: 'industry' },
];

// 政策关键词 → 中电电力线索映射
function getPolicyLeads(policy: any) {
  const content = (policy.title + policy.content).toLowerCase();
  const leads: { product: string; type: string; description: string }[] = [];

  if (content.includes('新能源') || content.includes('光伏') || content.includes('风电') || content.includes('储能')) {
    leads.push({ product: '新能源监控解决方案', type: '项目机会', description: '新能源项目配套监控系统需求' });
  }
  if (content.includes('能耗') || content.includes('节能') || content.includes('双碳') || content.includes('碳达峰')) {
    leads.push({ product: '能耗管理系统', type: '客户需求', description: '企业能耗监测与节能改造需求' });
  }
  if (content.includes('配电') || content.includes('供电') || content.includes('电力')) {
    leads.push({ product: '智能配电监控', type: '改造机会', description: '配电系统智能化升级需求' });
  }
  if (content.includes('充电') || content.includes('电动车') || content.includes('新能源车')) {
    leads.push({ product: '充电桩运营管理', type: '新业务机会', description: '充电基础设施配套监控' });
  }
  if (content.includes('工业') || content.includes('工厂')) {
    leads.push({ product: '工业物联网平台', type: '大客户机会', description: '工厂数字化转型需求' });
  }
  if (leads.length === 0) {
    leads.push({ product: '综合能源管理', type: '泛化机会', description: '可关联我司多条产品线' });
  }
  return leads;
}

// 截断文本
function truncate(text: string, maxLen = 150) {
  if (!text || text.length <= maxLen) return { short: text || '', full: text || '', truncated: false };
  return { short: text.slice(0, maxLen) + '...', full: text, truncated: true };
}

export function PolicyAnalysis() {
  const { policies, setLoading } = useAppStore();
  const [impactFilter, setImpactFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showSources, setShowSources] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  useEffect(() => {
    setLoading(true);
    fetchPolicies().finally(() => setLoading(false));
  }, []);

  // 立即扫描
  const handleScan = async () => {
    setIsScanning(true);
    showToast('正在扫描政策数据源...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/crawler/run`, { method: 'POST' });
      const result = await res.json();
      showToast(result.message || '扫描完成！');
      await fetchPolicies();
    } catch {
      showToast('扫描失败，请检查后端连接');
    }
    setIsScanning(false);
  };

  const filtered = policies.filter(p => {
    if (impactFilter !== 'all' && p.impactLevel !== impactFilter) return false;
    // 来源筛选：支持按URL关键词匹配
    if (sourceFilter !== 'all') {
      const url = (p.sourceUrl || '').toLowerCase();
      const source = (p.source || '').toLowerCase();
      if (sourceFilter === 'gov' && !url.includes('gov.cn') && !url.includes('ndrc') && !url.includes('nea.') && !url.includes('miit') && !url.includes('dsm.gov')) return false;
      if (sourceFilter === 'local' && !url.match(/beijing|shanghai|gd\.gov|zj\.gov|jiangsu|shandong|henan|sc\.gov/)) return false;
      if (sourceFilter === 'industry' && !url.includes('bjx') && !url.includes('chinapower') && !url.includes('cnenergy')) return false;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-4">
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <Check size={16} />
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-slate-500">
            监控68个政府官网及行业网站，自动解读政策影响并关联中电电力销售线索
          </p>
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-xs text-blue-500 hover:text-blue-700 mt-1"
          >
            {showSources ? '收起数据来源' : '查看68个数据来源'}
          </button>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {sourceFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setSourceFilter(f.value)}
              className={clsx(
                'px-2 py-1 text-xs rounded-lg transition-colors',
                sourceFilter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="border-l border-slate-300 mx-1" />
          {impactFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setImpactFilter(f.value)}
              className={clsx(
                'px-2 py-1 text-xs rounded-lg transition-colors',
                impactFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? '扫描中...' : '立即扫描'}
          </button>
        </div>
      </div>

      {/* 数据来源列表 */}
      {showSources && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">📋 监控的68个数据来源</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {monitorSources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  'px-2 py-1.5 rounded flex items-center gap-2 hover:opacity-80',
                  src.type === 'gov' && 'bg-red-50 text-red-700',
                  src.type === 'local' && 'bg-blue-50 text-blue-700',
                  src.type === 'industry' && 'bg-green-50 text-green-700'
                )}
              >
                <span className="font-medium">{src.name}</span>
              </a>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            其余46个来源：各省市自治区人民政府官网（31个）+ 行业协会网站（15个）
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{policies.length}</div>
          <div className="text-xs text-slate-500">全部政策</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-red-600">{policies.filter(p => p.impactLevel === 'high').length}</div>
          <div className="text-xs text-slate-500">高影响</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{policies.filter(p => p.impactLevel === 'medium').length}</div>
          <div className="text-xs text-slate-500">中影响</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-slate-400">{policies.filter(p => p.impactLevel === 'low').length}</div>
          <div className="text-xs text-slate-500">低影响</div>
        </div>
      </div>

      {/* Policy List */}
      <div className="space-y-3">
        {filtered.map((policy) => {
          const { short, full, truncated } = truncate(policy.content || '', 150);
          const isExpanded = expandedIds.has(policy.id);
          const leads = getPolicyLeads(policy);

          return (
            <div key={policy.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4">
                {/* Top row: level + title + source */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-semibold',
                      policy.impactLevel === 'high' && 'bg-red-100 text-red-700',
                      policy.impactLevel === 'medium' && 'bg-amber-100 text-amber-700',
                      policy.impactLevel === 'low' && 'bg-blue-100 text-blue-700'
                    )}>
                      {policy.impactLevel === 'high' ? '高' : policy.impactLevel === 'medium' ? '中' : '低'}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{policy.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{policy.source}</span>
                    {policy.sourceUrl && (
                      <a href={policy.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div className="text-xs text-slate-400 mb-2">
                  {new Date(policy.publishedAt).toLocaleDateString('zh-CN')}
                </div>

                {/* Content - truncated */}
                <p className="text-sm text-slate-600 mb-2">
                  {isExpanded ? full : short}
                  {truncated && (
                    <button onClick={() => toggleExpand(policy.id)} className="text-blue-500 hover:text-blue-700 ml-1 text-xs">
                      {isExpanded ? '收起' : '展开'}
                    </button>
                  )}
                </p>

                {/* Leads - 中电电力业务机会 */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <div className="text-xs font-semibold text-amber-700 mb-2">🎯 中电电力业务机会</div>
                  <div className="flex flex-wrap gap-2">
                    {leads.map((lead, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded flex items-center gap-1">
                        <span className="font-medium">{lead.product}</span>
                        <span className="text-amber-500">·</span>
                        <span>{lead.type}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom: action + tags */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {policy.affectedProducts?.slice(0, 3).map((p, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">{p}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {policy.recommendation && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        💡 {policy.recommendation}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            暂无符合条件的政策
          </div>
        )}
      </div>
    </div>
  );
}
