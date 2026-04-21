/**
 * 4S竞品情报系统 - 参数验证中间件
 */

/**
 * 验证竞品相关参数
 */
function validateCompetitorParams(req, res, next) {
  const errors = [];
  
  // 验证 projectId
  if (req.body.projectId && typeof req.body.projectId !== 'string') {
    errors.push('projectId must be a string');
  }
  
  // 验证 projectName
  if (req.body.projectName && typeof req.body.projectName !== 'string') {
    errors.push('projectName must be a string');
  }
  
  // 如果有错误，返回错误响应
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }
  
  next();
}

/**
 * 验证竞品动态参数
 */
function validateNewsParams(req, res, next) {
  const errors = [];
  
  // 必填字段
  if (!req.body.title) {
    errors.push('title is required');
  }
  
  if (!req.body.competitorId) {
    errors.push('competitorId is required');
  }
  
  if (!req.body.content && !req.body.summary) {
    errors.push('content or summary is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }
  
  next();
}

/**
 * 验证政策解读参数
 */
function validatePolicyParams(req, res, next) {
  const errors = [];
  
  if (!req.body.title) {
    errors.push('title is required');
  }
  
  if (!req.body.content) {
    errors.push('content is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }
  
  next();
}

/**
 * 验证中标记录参数
 */
function validateBidResultParams(req, res, next) {
  const errors = [];
  
  if (!req.body.competitorName) {
    errors.push('competitorName is required');
  }
  
  if (req.body.amount !== undefined && typeof req.body.amount !== 'number') {
    errors.push('amount must be a number');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors,
    });
  }
  
  next();
}

module.exports = {
  validateCompetitorParams,
  validateNewsParams,
  validatePolicyParams,
  validateBidResultParams,
};
