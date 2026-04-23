import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Check } from 'lucide-react';
import { useAppStore, fetchPolicies, createScanJob, fetchScanJob } from '../store/appStore';
import clsx from 'clsx';

const impactFilters = [
  { value: 'all', label: '全部' },
  { value: 'high', label: '高影响' },
  { value: 'medium', label: '中影响' },
  { value: 'low', label: '低影响' },
];

// 根据实际数据动态计算来源分类
function getSourceFilters(policies: any[]) {
  const sourceCount: Record<string, number> = {};
  policies.forEach(p => {
    sourceCount[p.source] = (sourceCount[p.source] || 0) + 1;
  });
  
  // 分类统计
  const govSources = ['能源局', '发改委', '工信部', '生态环境部', '人民政府网', '政府网', '人民政府'];
  const industrySources = ['北极星', '电力网', '能源网', '电网技术', '中国节能', '数据中心', '电力网'];
  
  let govCount = 0, localCount = 0, industryCount = 0, otherCount = 0;
  Object.entries(sourceCount).forEach(([source, count]) => {
    if (govSources.some(g => source.includes(g))) govCount += count;
    else if (source.includes('人民政府') || source.includes('政府网')) localCount += count;
    else if (industrySources.some(i => source.includes(i))) industryCount += count;
    else otherCount += count;
  });

  return [
    { value: 'all', label: '全部来源', count: policies.length },
    ...(govCount > 0 ? [{ value: 'gov', label: `国家政策(${govCount})`, count: govCount }] : []),
    ...(localCount > 0 ? [{ value: 'local', label: `地方政府(${localCount})`, count: localCount }] : []),
    ...(industryCount > 0 ? [{ value: 'industry', label: `行业网站(${industryCount})`, count: industryCount }] : []),
  ];
}

function getSourceType(source: string) {
  const govSources = ['能源局', '发改委', '工信部', '生态环境部', '人民政府网', '政府网'];
  const industrySources = ['北极星', '电力网', '能源网', '电网技术', '中国节能', '数据中心'];
  if (govSources.some(g => source.includes(g))) return 'gov';
  if (source.includes('人民政府') || source.includes('政府网')) return 'local';
  if (industrySources.some(i => source.includes(i))) return 'industry';
  return 'other';
}

// 监控的官方数据来源
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

type PolicyLead = {
  product: string;
  type: string;
  description: string;
  clues: string[];
  followUp?: string;
};

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

// 政策关键词 → 中电电力线索映射
function getPolicyLeads(policy: any) {
  const content = (policy.title + policy.content).toLowerCase();
  const leads: PolicyLead[] = [];
  const affectedProducts = Array.isArray(policy.affectedProducts) ? policy.affectedProducts : [];
  const opportunities = Array.isArray(policy.opportunities) ? policy.opportunities : [];

  const buildLead = (
    product: string,
    type: string,
    description: string,
    baseClues: string[],
    followUp?: string,
  ): PolicyLead => ({
    product,
    type,
    description,
    clues: unique([
      ...baseClues,
      ...affectedProducts.slice(0, 2).map((item: string) => `关注 ${item} 相关预算、立项和改造计划`),
      ...opportunities.slice(0, 2).map((item: string) => `机会点：${item}`),
    ]).slice(0, 4),
    followUp: followUp || policy.recommendation,
  });

  if (content.includes('新能源') || content.includes('光伏') || content.includes('风电') || content.includes('储能')) {
    leads.push(buildLead(
      '新能源监控解决方案',
      '项目机会',
      '新能源项目推进时，通常会带出站端监控、储能协同和远程运维平台建设需求。',
      [
        '优先盯新能源基地、园区微网和储能示范项目的招标节奏',
        '可切入站控层监控、边缘采集和储能 EMS 协同场景',
      ],
      '优先梳理本地新能源投资主体、EPC 和运维方名单，提前介入方案交流',
    ));
  }
  if (content.includes('能耗') || content.includes('节能') || content.includes('双碳') || content.includes('碳达峰')) {
    leads.push(buildLead(
      '能耗管理系统',
      '客户需求',
      '节能考核和双碳压力会倒逼客户补齐分项计量、能效分析和碳管理平台。',
      [
        '重点跟进高耗能制造企业、园区和公共机构的节能改造预算',
        '适合切入分项计量、能效驾驶舱、碳排监测和节能诊断服务',
      ],
      '建议对接重点用能客户，先从能耗透明化和节能诊断试点切入',
    ));
  }
  if (content.includes('配电') || content.includes('供电') || content.includes('电力')) {
    leads.push(buildLead(
      '智能配电监控',
      '改造机会',
      '涉及配电网、供配电升级的政策，通常会带来配电监控、终端改造和系统联动需求。',
      [
        '关注存量园区、工厂、楼宇的配电改造和状态感知升级项目',
        '可切入配电监控主站、终端采集、告警联动和远程运维场景',
      ],
      '建议筛出近期有配电扩容、老旧配电房改造计划的客户先行拜访',
    ));
  }
  if (content.includes('充电') || content.includes('电动车') || content.includes('新能源车')) {
    leads.push(buildLead(
      '充电桩运营管理',
      '新业务机会',
      '充电基础设施政策往往会拉动站点运营监控、用电分析和运维平台建设。',
      [
        '跟进公共充电场站、园区停车场和物流场站的建设计划',
        '可切入站点监控、负荷管理、告警派单和运营分析平台',
      ],
      '建议优先锁定有停车资源和高频补能场景的运营主体',
    ));
  }
  if (content.includes('工业') || content.includes('工厂')) {
    leads.push(buildLead(
      '工业物联网平台',
      '大客户机会',
      '工业和工厂数字化政策会把设备联网、能效管理和运维平台需求一起拉出来。',
      [
        '优先关注重点制造企业、链主工厂和示范园区的数字化项目',
        '适合从设备接入、能效分析、运维看板和多站点集控切入',
      ],
      '建议联合客户信息化或设备部门，以“先接入、再分析、后扩面”的方式推进',
    ));
  }
  if (content.includes('轨道') || content.includes('交通') || content.includes('机场') || content.includes('港口')) {
    leads.push(buildLead(
      '交通能源管理终端',
      '场景机会',
      '交通基础设施政策会带出站场供配电监控、能耗计量和设备运维联动需求。',
      [
        '跟进轨道交通、机场、港口和高速服务区的节能与配电升级项目',
        '可切入站场配电监测、设备状态感知和综合能源调度平台',
      ],
      '建议优先摸排交通类重点项目业主、总包单位和设计院线索',
    ));
  }
  if (content.includes('数据中心') || content.includes('算力') || content.includes('机房')) {
    leads.push(buildLead(
      '数据中心配电监控',
      '重点项目',
      '算力和数据中心政策通常会释放机房配电监控、能效管理和容量评估需求。',
      [
        '重点关注新建机房、算力中心和存量机房节能改造计划',
        '可切入列头柜监测、PUE 看板、容量预警和动环协同接口',
      ],
      '建议锁定本地数据中心运营方和总包集成商，提前进入方案池',
    ));
  }
  if (leads.length === 0) {
    leads.push(buildLead(
      '综合能源管理',
      '泛化机会',
      '该政策可延伸到能效、配电、终端采集和平台化改造等多条产品线。',
      [
        '先从受政策影响最大的行业客户和区域项目库切入',
        '优先挖掘已有合作客户的二次扩容、升级和联动管理需求',
      ],
      '建议先做客户分层，再按行业模板组织一轮政策影响沟通',
    ));
  }
  return leads.slice(0, 4);
}

// 截断文本
function truncate(text: string, maxLen = 150) {
  if (!text || text.length <= maxLen) return { short: text || '', full: text || '', truncated: false };
  return { short: text.slice(0, maxLen) + '...', full: text, truncated: true };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function PolicyAnalysis() {
  const { policies, setLoading } = useAppStore();
  const [impactFilter, setImpactFilter] = useState('all');
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
    try {
      showToast('已创建政策同步任务，正在排队...');
      const job = await createScanJob({ scope: 'policy' });

      let resultJob = job;
      for (let i = 0; i < 30; i += 1) {
        resultJob = await fetchScanJob(job.id);
        if (resultJob.status === 'completed') {
          showToast(String(resultJob.resultSnapshot.message || '政策同步完成！'));
          await fetchPolicies();
          setIsScanning(false);
          return;
        }

        if (resultJob.status === 'failed') {
          throw new Error(resultJob.errorMessage || '政策同步失败');
        }

        await sleep(2000);
      }

      throw new Error('政策同步任务超时，请稍后刷新');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '扫描失败，请检查后端连接');
    } finally {
      setIsScanning(false);
    }
  };

  const filtered = policies.filter(p => {
    if (impactFilter !== 'all' && p.impactLevel !== impactFilter) return false;
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
            共{policies.length}条政策，自动解读政策影响并关联中电电力销售线索
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
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
          const formattedDate = new Date(policy.publishedAt).toLocaleDateString('zh-CN');

          return (
            <div key={policy.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4">
                {/* Top row: level + title + source */}
                <div className="flex items-start justify-between gap-4 mb-2">
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
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{policy.source}</span>
                      {policy.sourceUrl && (
                        <a href={policy.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{formattedDate}</span>
                  </div>
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
                  <div className="grid gap-2 md:grid-cols-2">
                    {leads.map((lead, i) => (
                      <div key={i} className="rounded-lg border border-amber-200 bg-white/70 p-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded font-medium">
                            {lead.product}
                          </span>
                          <span className="text-xs text-amber-700 font-medium">{lead.type}</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-5 mb-2">{lead.description}</p>
                        <div className="space-y-1.5">
                          {lead.clues.map((clue, clueIndex) => (
                            <div key={clueIndex} className="flex items-start gap-1.5 text-xs text-amber-700">
                              <span className="mt-0.5 text-amber-500">•</span>
                              <span>{clue}</span>
                            </div>
                          ))}
                        </div>
                        {lead.followUp && (
                          <div className="mt-2 rounded bg-amber-100/70 px-2 py-1 text-[11px] text-amber-700">
                            建议动作：{lead.followUp}
                          </div>
                        )}
                      </div>
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
