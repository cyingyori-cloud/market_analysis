import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  competitorId: { type: String, required: true, index: true },
  competitorName: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String },
  summary: { type: String },
  source: { type: String }, // 来源URL
  sourceName: { type: String }, // 来源名称
  tag: {
    type: String,
    enum: ['major', 'new', 'bid', 'strategy', 'personnel', 'report', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  publishedAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // AI分析字段
  aiAnalysis: {
    importance: { type: Number, min: 1, max: 5 }, // 重要性 1-5
    opportunity: { type: String }, // 商机线索
    recommendation: { type: String }, // 行动建议
    keywords: [String]
  }
}, { timestamps: true });

newsSchema.index({ publishedAt: -1 });
newsSchema.index({ tag: 1, publishedAt: -1 });
newsSchema.index({ competitorId: 1, publishedAt: -1 });

export const News = mongoose.model('News', newsSchema);
