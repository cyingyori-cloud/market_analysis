import { useEffect, useState } from 'react';
import { Radio, Filter, RefreshCw, ExternalLink, Bookmark, Share2 } from 'lucide-react';
import { useAppStore, fetchCompetitorNews, fetchCompetitors } from '../store/appStore';
import clsx from 'clsx';

const tagConfig: Record<string, { label: string; bg: string; color: string }> = {
  major: { label: '重大信号', bg: 'bg-red-100', color: 'text-red-700' },
  new: { label: '新产品', bg: 'bg-blue-100', color: 'text-blue-700' },
  bid: { label: '中标喜报', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  strategy: { label: '战略合作', bg: 'bg-amber-100', color: 'text-amber-700' },
  personnel: { label: '人员变动', bg: 'bg-purple-100', color: 'text-purple-700' },
  report: { label: '业绩报告', bg: 'bg-slate-100', color: 'text-slate-700' },
};

export function CompetitorMonitor() {
  const { competitors, competitorNews, setLoading, isLoading } = useAppStore();
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterCompetitor, setFilterCompetitor] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCompetitors(),
      fetchCompetitorNews(),
    ]).finally(() => setLoading(false));
  }, []);

  const filteredNews = competitorNews.filter(news => {
    if (filterTag !== 'all' && news.tag !== filterTag) return false;
    if (filterCompetitor !== 'all' && news.competitorId !== filterCompetitor) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Radio size={24} className="text-blue-600" />
            竞品动态实时监测
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            每日自动扫描50家竞品官网、公众号、新闻动态，自动打标签并识别重大信号
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
            <Filter size={16} />
            筛选
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <RefreshCw size={16} />
            立即扫描
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: '今日采集', value: competitorNews.filter(n => n.publishedAt.startsWith(new Date().toISOString().split('T')[0])).length },
          { label: '已标注', value: competitorNews.filter(n => n.status === 'published').length },
          { label: '重大信号', value: competitorNews.filter(n => n.tag === 'major').length },
          { label: '推送销售', value: 23 },
          { label: '标注准确率', value: '98%' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 flex-wrap">
        <div className="text-sm text-slate-600 font-medium">标签：</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterTag('all')}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-full transition-colors',
              filterTag === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            全部
          </button>
          {Object.entries(tagConfig).map(([tag, config]) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-full transition-colors',
                filterTag === tag ? 'bg-blue-600 text-white' : `${config.bg} ${config.color} hover:opacity-80`
              )}
            >
              {config.label}
            </button>
          ))}
        </div>
        
        <div className="border-l border-slate-200 pl-4 flex items-center gap-2">
          <div className="text-sm text-slate-600 font-medium">竞品：</div>
          <select 
            value={filterCompetitor}
            onChange={(e) => setFilterCompetitor(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
          >
            <option value="all">全部竞品</option>
            {competitors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* News List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">竞品动态时间线</h2>
          <span className="text-sm text-slate-500">共 {filteredNews.length} 条动态</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredNews.map((news) => {
            const config = tagConfig[news.tag] || tagConfig.report;
            return (
              <div key={news.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Tag */}
                  <div className={clsx('px-3 py-1 rounded-lg text-sm font-medium self-start', config.bg, config.color)}>
                    {config.label}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{news.competitorName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{news.title}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{news.content}</p>
                    
                    {news.impactAnalysis && (
                      <div className="bg-red-50 border-l-4 border-red-500 px-3 py-2 rounded-r-lg mb-2">
                        <div className="text-xs text-red-700">
                          <strong>⚠️ 影响判断：</strong>{news.impactAnalysis}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>来源：{news.source}</span>
                      <span>{new Date(news.publishedAt).toLocaleString('zh-CN')}</span>
                      {news.pushedTo.length > 0 && (
                        <span className="text-blue-600">已推送：{news.pushedTo.join('、')}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Bookmark size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Share2 size={18} />
                    </button>
                    {news.sourceUrl && (
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <ExternalLink size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
