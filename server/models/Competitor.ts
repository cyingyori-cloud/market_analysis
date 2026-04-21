import mongoose from 'mongoose';

const competitorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  industry: { type: String, default: '电力设备' },
  website: { type: String },
  officialWechat: { type: String }, // 公众号名称
  newsUrls: [{
    name: String,
    url: String,
    type: { type: String, enum: ['website', 'wechat', 'news'] }
  }],
  tags: [String], // 业务标签
  lastScannedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

competitorSchema.index({ name: 1 });

export const Competitor = mongoose.model('Competitor', competitorSchema);
