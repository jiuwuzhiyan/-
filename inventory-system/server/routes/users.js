import express from 'express'
import bcrypt from 'bcryptjs'
import { prepare } from '../database.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取用户列表
router.get('/', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const users = prepare('SELECT id, username, password, name, role, can_print_inbound, can_print_outbound, can_print_return, created_at FROM users ORDER BY id').all()
    // 解密密码用于显示
    const usersWithDecryptedPassword = users.map(user => ({
      ...user,
      password: user.password // 保持加密密码
    }))
    res.json({ code: 200, data: usersWithDecryptedPassword })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.json({ code: 500, msg: '获取用户列表失败' })
  }
})

// 创建用户
router.post('/', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const { username, password, name, role, can_print_inbound, can_print_outbound, can_print_return } = req.body

    if (!username || !password || !name || !role) {
      return res.json({ code: 400, msg: '参数不完整' })
    }

    const existing = prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (existing) {
      return res.json({ code: 400, msg: '用户名已存在' })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)
    const result = prepare(
      'INSERT INTO users (username, password, name, role, can_print_inbound, can_print_outbound, can_print_return) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      username, hashedPassword, name, role, can_print_inbound || 0, can_print_outbound || 0, can_print_return || 0
    )

    res.json({ code: 200, msg: '创建成功', data: { id: result.lastInsertRowid } })
  } catch (error) {
    console.error('创建用户错误:', error)
    res.json({ code: 500, msg: '创建用户失败' })
  }
})

// 更新用户
router.put('/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const { id } = req.params
    const { name, role, password, can_print_inbound, can_print_outbound, can_print_return } = req.body

    const user = prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      return res.json({ code: 404, msg: '用户不存在' })
    }

    let sql = 'UPDATE users SET name = ?, role = ?, can_print_inbound = ?, can_print_outbound = ?, can_print_return = ?'
    let params = [name, role, can_print_inbound ?? user.can_print_inbound, can_print_outbound ?? user.can_print_outbound, can_print_return ?? user.can_print_return]

    if (password) {
      sql += ', password = ?'
      params.push(bcrypt.hashSync(password, 10))
    }

    sql += ' WHERE id = ?'
    params.push(id)

    prepare(sql).run(...params)
    res.json({ code: 200, msg: '更新成功' })
  } catch (error) {
    console.error('更新用户错误:', error)
    res.json({ code: 500, msg: '更新用户失败' })
  }
})

// 删除用户
router.delete('/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const { id } = req.params

    const user = prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      return res.json({ code: 404, msg: '用户不存在' })
    }

    prepare('DELETE FROM users WHERE id = ?').run(id)
    res.json({ code: 200, msg: '删除成功' })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.json({ code: 500, msg: '删除用户失败' })
  }
})

// 重置用户密码（系统管理员专用）
router.post('/:id/reset-password', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body

    const user = prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!user) {
      return res.json({ code: 404, msg: '用户不存在' })
    }

    const passwordToSet = newPassword || '123456' // 默认密码为123456
    const hashedPassword = bcrypt.hashSync(passwordToSet, 10)
    prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id)

    res.json({
      code: 200,
      msg: `密码重置成功${newPassword ? '' : '（默认密码：123456）'}`,
      data: { password: passwordToSet }
    })
  } catch (error) {
    console.error('重置用户密码错误:', error)
    res.json({ code: 500, msg: '重置密码失败' })
  }
})

export default router