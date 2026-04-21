/**
 * 4S竞品情报系统 - API认证中间件
 */

// 获取配置的API密钥列表
function getConfiguredApiKeys() {
  return [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY,
  ].filter(Boolean);
}

/**
 * 检查是否需要认证
 */
function isAuthDisabled() {
  return process.env.AUTH_DISABLED === 'true';
}

/**
 * API Key 认证中间件
 */
function requireAuth(req, res, next) {
  // 开发模式：跳过认证
  if (isAuthDisabled()) {
    return next();
  }

  const keys = getConfiguredApiKeys();
  
  // 如果没有配置任何密钥，跳过认证
  if (keys.length === 0) {
    return next();
  }

  // 获取请求中的API Key
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;
  const headerToken = req.headers['x-api-key'];
  const token = bearerToken || headerToken;

  // 验证Token
  if (!token || !keys.includes(token)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid API key',
      hint: 'Please provide API key via Authorization header or X-API-Key header',
    });
  }

  next();
}

module.exports = { requireAuth, isAuthDisabled };
