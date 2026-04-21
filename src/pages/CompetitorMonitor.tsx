import { useEffect, useState } from 'react';
import { Radio, RefreshCw, ExternalLink, Bookmark, Share2, X, Check } from 'lucide-react';
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

const shareChannels = [
  { id: 'wechat', label: '微信', icon: '💬' },
  { id: 'dingtalk', label: '钉钉', icon: '💬' },
  { id: 'email', label: '邮件', icon: '📧' },
  { id: 'fxiaoke', label: '纷享销客', icon: '📋' },
  { id: 'lark', label: '飞书', icon: '📝' },
];

export function CompetitorMonitor() {
  const { competitors, competitorNews, setLoading, isLoading, updateNews } = useAppStore();
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterCompetitor, setFilterCompetitor] = useState<string>('all');
  const [filterTimeRange, setFilterTimeRange] = useState<string>('week');

  // 模态框状态
  const [tagModal, setTagModal] = useState<{ open: boolean; newsId: string | null; currentTag: string }>({
    open: false,
    newsId: null,
    currentTag: '',
  });
  const [shareModal, setShareModal] = useState<{ open: boolean; newsId: string | null; sharedTo: string[] }>({
    open: false,
    newsId: null,
    sharedTo: [],
  });
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const timeRanges = [
    { value: 'today', label: '今天' },
    { value: 'week', label: '最近7天' },
    { value: 'month', label: '本月' },
    { value: 'all', label: '全部' },
  ];

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    switch (filterTimeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        break;
      case 'all':
      default:
        return null;
    }
    return start;
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCompetitors(),
      fetchCompetitorNews(),
    ]).finally(() => setLoading(false));
  }, []);

  const dateRange = getDateRange();

  const filteredNews = competitorNews.filter(news => {
    if (filterTag !== 'all' && news.tag !== filterTag) return false;
    if (filterCompetitor !== 'all' && news.competitorId !== filterCompetitor) return false;
    if (dateRange && new Date(news.publishedAt) < dateRange) return false;
    return true;
  });

  // 重新打标签
  const handleRetag = (newsId: string) => {
    const news = competitorNews.find(n => n.id === newsId);
    if (news) {
      setTagModal({ open: true, newsId, currentTag: news.tag });
    }
  };

  const handleSaveTag = () => {
    if (tagModal.newsId) {
      updateNews(tagModal.newsId, { tag: tagModal.currentTag as any });
      showToast('标签已更新');
      setTagModal({ open: false, newsId: null, currentTag: '' });
    }
  };

  // 分享
  const handleShare = (newsId: string) => {
    const news = competitorNews.find(n => n.id === newsId);
    if (news) {
      setShareModal({ open: true, newsId, sharedTo: news.pushedTo });
    }
  };

  const handleToggleShare = (channelId: string) => {
    const current = shareModal.sharedTo;
    if (current.includes(channelId)) {
      setShareModal({ ...shareModal, sharedTo: current.filter(c => c !== channelId) });
    } else {
      setShareModal({ ...shareModal, sharedTo: [...current, channelId] });
    }
  };

  const handleSaveShare = () => {
    if (shareModal.newsId) {
      updateNews(shareModal.newsId, { pushedTo: shareModal.sharedTo } as any);
      const count = shareModal.sharedTo.length;
      showToast(count > 0 ? `已分享到 ${count} 个渠道` : '已取消分享');
      setShareModal({ open: false, newsId: null, sharedTo: [] });
    }
  };

  // 跳转原文
  const handleOpenSource = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 立即扫描 - 调用后端爬虫
  const [isScanning, setIsScanning] = useState(false);
  const handleScan = async () => {
    setIsScanning(true);
    showToast('正在扫描竞品官网...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/crawler/run`, {
        method: 'POST',
      });
      const result = await res.json();
      showToast(result.message || '扫描完成！');
      // 刷新数据
      await fetchCompetitorNews({ competitorId: selectedCompetitor === 'all' ? undefined : selectedCompetitor });
    } catch {
      showToast('扫描失败，请检查网络');
    }
    setIsScanning(false);
  };

  // 刷新 - 重新加载数据
  const handleRefresh = async () => {
    showToast('正在刷新数据...');
    await fetchCompetitorNews({ competitorId: selectedCompetitor === 'all' ? undefined : selectedCompetitor });
    showToast('数据已刷新');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <Check size={16} />
          {toast.message}
        </div>
      )}

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
          <div className="px-1">
            {timeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setFilterTimeRange(range.value)}
                className={clsx(
                  'px-3 py-2 text-sm rounded-lg transition-colors',
                  filterTimeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button 
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? '扫描中...' : '立即扫描'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: timeRanges.find(t => t.value === filterTimeRange)?.label || '全部', value: filteredNews.length },
          { label: '已标注', value: filteredNews.filter(n => n.status === 'published').length },
          { label: '重大信号', value: filteredNews.filter(n => n.tag === 'major').length },
          { label: '监测竞品', value: competitors.length },
          { label: '待处理', value: filteredNews.filter(n => n.status === 'draft').length },
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
                    <button
                      onClick={() => handleRetag(news.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="重新打标签"
                    >
                      <Bookmark size={18} />
                    </button>
                    <button
                      onClick={() => handleShare(news.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="分享到"
                    >
                      <Share2 size={18} />
                    </button>
                    {news.sourceUrl && (
                      <button
                        onClick={() => handleOpenSource(news.sourceUrl)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="查看原文"
                      >
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

      {/* 重新打标签模态框 */}
      {tagModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] max-w-[90vw]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">重新打标签</h3>
              <button onClick={() => setTagModal({ open: false, newsId: null, currentTag: '' })}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(tagConfig).map(([tag, config]) => (
                <button
                  key={tag}
                  onClick={() => setTagModal({ ...tagModal, currentTag: tag })}
                  className={clsx(
                    'w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-colors',
                    tagModal.currentTag === tag
                      ? `${config.bg} ${config.color} ring-2 ring-blue-500`
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <span className="font-medium">{config.label}</span>
                  {tagModal.currentTag === tag && <Check size={18} />}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setTagModal({ open: false, newsId: null, currentTag: '' })}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveTag}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享模态框 */}
      {shareModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] max-w-[90vw]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">分享到</h3>
              <button onClick={() => setShareModal({ open: false, newsId: null, sharedTo: [] })}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {shareChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => handleToggleShare(channel.id)}
                  className={clsx(
                    'w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-colors',
                    shareModal.sharedTo.includes(channel.id)
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-500'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{channel.icon}</span>
                    <span className="font-medium">{channel.label}</span>
                  </span>
                  {shareModal.sharedTo.includes(channel.id) && <Check size={18} />}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShareModal({ open: false, newsId: null, sharedTo: [] })}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveShare}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确认分享
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
