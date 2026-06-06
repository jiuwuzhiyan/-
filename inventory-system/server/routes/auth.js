import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prepare } from '../database.js'
import { JWT_SECRET } from '../middleware/auth.js'

const router = express.Router()

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.json({ code: 400, msg: '用户名和密码不能为空' })
    }

    const user = prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user) {
      return res.json({ code: 401, msg: '用户名或密码错误' })
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password)
    if (!isPasswordValid) {
      return res.json({ code: 401, msg: '用户名或密码错误' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const roleNameMap = {
      business: '业务人员',
      finance: '财务人员',
      admin: '行政人员',
      superadmin: '系统管理员'
    }

    res.json({
      code: 200,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        roleName: roleNameMap[user.role],
        can_print_inbound: user.can_print_inbound || 0,
        can_print_outbound: user.can_print_outbound || 0,
        can_print_return: user.can_print_return || 0,
        token
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.json({ code: 500, msg: '登录失败' })
  }
})

// 获取当前用户信息
router.get('/userinfo', (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, msg: '未登录' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)

    const user = prepare('SELECT id, username, name, role, can_print_inbound, can_print_outbound, can_print_return FROM users WHERE id = ?').get(decoded.id)
    if (!user) {
      return res.json({ code: 404, msg: '用户不存在' })
    }

    const roleNameMap = {
      business: '业务人员',
      finance: '财务人员',
      admin: '行政人员',
      superadmin: '系统管理员'
    }

    res.json({
      code: 200,
      data: {
        ...user,
        roleName: roleNameMap[user.role],
        can_print_inbound: user.can_print_inbound || 0,
        can_print_outbound: user.can_print_outbound || 0,
        can_print_return: user.can_print_return || 0
      }
    })
  } catch (error) {
    res.status(401).json({ code: 401, msg: '未登录或登录已过期' })
  }
})

// 修改当前用户密码
router.post('/change-password', (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, msg: '未登录' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.json({ code: 400, msg: '旧密码和新密码不能为空' })
    }

    if (newPassword.length < 6) {
      return res.json({ code: 400, msg: '新密码至少6位' })
    }

    const user = prepare('SELECT * FROM users WHERE id = ?').get(decoded.id)
    if (!user) {
      return res.json({ code: 404, msg: '用户不存在' })
    }

    // 验证旧密码
    const isOldPasswordValid = bcrypt.compareSync(oldPassword, user.password)
    if (!isOldPasswordValid) {
      return res.json({ code: 400, msg: '旧密码错误' })
    }

    // 更新新密码
    const hashedPassword = bcrypt.hashSync(newPassword, 10)
    prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, decoded.id)

    res.json({ code: 200, msg: '密码修改成功' })
  } catch (error) {
    console.error('修改密码错误:', error)
    res.json({ code: 500, msg: '修改密码失败' })
  }
})

export default router