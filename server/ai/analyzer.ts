import fetch from 'node-fetch';

const SILICON_FLOW_API = 'https://api.siliconflow.cn/v1/chat/completions';
const API_KEY = process.env.SILICON_FLOW_API_KEY || '';
const MODEL = 'deepseek-ai/DeepSeek-V2.5'; // 硅基流动免费模型

export interface NewsAnalysis {
  tag: 'major' | 'new' | 'bid' | 'strategy' | 'personnel' | 'report' | 'other';
  summary: string;
  importance: number; // 1-5
  opportunity?: string;
  recommendation?: string;
  keywords: string[];
}

export async function analyzeNews(title: string, content: string, competitorName: string): Promise<NewsAnalysis> {
  const prompt = `你是一个电力设备行业情报分析师。请分析以下竞品资讯并提取关键信息。

竞品名称: ${competitorName}
资讯标题: ${title}
资讯内容: ${content || '无详细内容'}

请以JSON格式返回分析结果:
{
  "tag": "选择以下之一: major, new, bid, strategy, personnel, report, other",
  "summary": "100字以内的摘要",
  "importance": 1-5的整数, 表示重要性",
  "opportunity": "如果对中电电力有商机影响, 说明具体机会; 否则写'无'",
  "recommendation": "给中电电力销售团队的行动建议",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

要求:
- 如果是中标、战略合作、新产品发布等直接影响业务的信息, importance应>=3
- opportunity字段要具体, 能转化为销售线索
- recommendation要可执行, 最好是"建议XX区域拜访XX客户"这样的格式`;

  // 如果没有配置 API Key，使用本地规则引擎
  if (!API_KEY) {
    console.log('未配置SILICON_FLOW_API_KEY，使用本地规则引擎');
    return analyzeWithRules(title, content, competitorName);
  }

  try {
    const response = await fetch(SILICON_FLOW_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content || '';

    // 提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        tag: result.tag || 'other',
        summary: result.summary || title,
        importance: Math.min(5, Math.max(1, parseInt(result.importance) || 3)),
        opportunity: result.opportunity || '无',
        recommendation: result.recommendation || '持续关注',
        keywords: result.keywords || []
      };
    }

    // 解析失败，返回规则分析
    return analyzeWithRules(title, content, competitorName);
  } catch (error) {
    console.error('AI分析失败:', error);
    return analyzeWithRules(title, content, competitorName);
  }
}

// 本地规则引擎 - 不需要 API Key
function analyzeWithRules(title: string, content: string, competitorName: string): NewsAnalysis {
  const text = (title + ' ' + (content || '')).toLowerCase();

  // 标签识别规则
  let tag: NewsAnalysis['tag'] = 'other';
  let importance = 3;

  if (/中标|中标|招标|竞标|中了|拿下/.test(text)) {
    tag = 'bid';
    importance = 4;
  } else if (/合作|签约|战略|并购|收购|投资|合资/.test(text)) {
    tag = 'strategy';
    importance = 4;
  } else if (/发布|新品|新产品|上市|推出|首发/.test(text)) {
    tag = 'new';
    importance = 3;
  } else if (/高管|任免|离职|辞职|总裁|总经理|CEO| CTO| CFO| COO|任命|招聘/.test(text)) {
    tag = 'personnel';
    importance = 3;
  } else if (/财报|业绩|营收|利润|增长|下降|亏损|盈利|年报|季报/.test(text)) {
    tag = 'report';
    importance = 3;
  } else if (/重大|突发|紧急|危机|违规|处罚|调查|审查/.test(text)) {
    tag = 'major';
    importance = 5;
  }

  // 关键词提取
  const keywords: string[] = [];
  const keywordPatterns = [
    /新能源|光伏|储能|风电|充电桩|换电|虚拟电厂|智能电网/,
    /电力|电网|配电|输电|变电站|成套电气/,
    /工业|制造业|园区|工厂|企业/,
    /项目|工程|建设|改造|升级/,
    /区域|华东|华南|华北|华中|西南|西北|东北|海外|国外/
  ];

  keywordPatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) keywords.push(match[0]);
  });

  // 商机识别
  let opportunity = '无';
  if (tag === 'bid') {
    opportunity = `关注${competitorName}中标区域，可了解中标价格和甲方信息，寻找替代机会`;
  } else if (tag === 'strategy') {
    opportunity = `${competitorName}战略布局变化，关注其新进入的市场领域，可能存在差异化竞争机会`;
  } else if (tag === 'new') {
    opportunity = `分析${competitorName}新产品定位，评估对现有产品线的冲击和差异化机会`;
  }

  // 行动建议
  let recommendation = '持续关注';
  if (tag === 'bid') {
    recommendation = `建议关注中标公告详情，了解甲方背景，如有合作关系可深入跟进`;
  } else if (tag === 'strategy') {
    recommendation = `分析合作伙伴背景，评估对市场的长期影响`;
  } else if (tag === 'personnel') {
    recommendation = `新领导可能有新的战略调整，保持关注`;
  }

  return {
    tag,
    summary: title.length > 100 ? title.substring(0, 100) + '...' : title,
    importance,
    opportunity,
    recommendation,
    keywords: [...new Set(keywords)].slice(0, 5)
  };
}
