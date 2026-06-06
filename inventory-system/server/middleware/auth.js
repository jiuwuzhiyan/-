import jwt from 'jsonwebtoken'

const JWT_SECRET = 'inventory-system-secret-key-2024'

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, msg: '未登录或登录已过期' })
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ code: 401, msg: 'token无效或已过期' })
  }
}

export function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, msg: '未登录' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, msg: '没有权限访问此功能' })
    }
    next()
  }
}

export { JWT_SECRET }