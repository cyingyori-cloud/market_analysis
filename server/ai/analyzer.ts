import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface NewsAnalysis {
  tag: 'major' | 'new' | 'bid' | 'strategy' | 'personnel' | 'report' | 'other';
  summary: string;
  importance: number; // 1-5
  opportunity?: string;
  recommendation?: string;
  keywords: string[];
}

const TAG_PROMPT = {
  major: '重大信号 - 可能影响市场格局的突发事件',
  new: '新产品 - 新产品发布、技术突破',
  bid: '中标喜报 - 招投标中标信息',
  strategy: '战略合作 - 战略合作、并购投资',
  personnel: '人员变动 - 高管任免、组织调整',
  report: '业绩报告 - 财报、业绩预告',
  other: '其他行业动态'
};

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

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
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

    // 解析失败，返回默认值
    return {
      tag: 'other',
      summary: title,
      importance: 3,
      opportunity: '无',
      recommendation: '持续关注该竞品动态',
      keywords: []
    };
  } catch (error) {
    console.error('AI分析失败:', error);
    return {
      tag: 'other',
      summary: title,
      importance: 3,
      opportunity: '无',
      recommendation: '需人工审核',
      keywords: []
    };
  }
}
