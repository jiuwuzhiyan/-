import express from 'express'
import { prepare } from '../database.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 生成单据编号
function generateOrderNo(type) {
  const prefix = type === 'inbound' ? 'RK' : type === 'outbound' ? 'CK' : 'HK'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

// 获取回库单列表
router.get('/', authMiddleware, (req, res) => {
  try {
    let orders
    if (req.user.role === 'business') {
      orders = prepare(`
        SELECT o.*, u.name as submitter_name, oo.order_no as outbound_order_no
        FROM return_orders o
        JOIN users u ON o.submitter_id = u.id
        JOIN outbound_orders oo ON o.outbound_order_id = oo.id
        WHERE o.submitter_id = ?
        ORDER BY o.id DESC
      `).all(req.user.id)
    } else {
      orders = prepare(`
        SELECT o.*, u.name as submitter_name, oo.order_no as outbound_order_no,
               fa.name as finance_approver_name, aa.name as admin_approver_name
        FROM return_orders o
        JOIN users u ON o.submitter_id = u.id
        JOIN outbound_orders oo ON o.outbound_order_id = oo.id
        LEFT JOIN users fa ON o.finance_approver_id = fa.id
        LEFT JOIN users aa ON o.admin_approver_id = aa.id
        ORDER BY o.id DESC
      `).all()
    }

    // 获取明细
    orders = orders.map(order => {
      const items = prepare(`
        SELECT i.*, m.name as material_name, m.specification
        FROM return_items i
        JOIN materials m ON i.material_id = m.id
        WHERE i.return_order_id = ?
      `).all(order.id)
      return { ...order, items }
    })

    res.json({ code: 200, data: orders })
  } catch (error) {
    console.error('获取回库单列表错误:', error)
    res.json({ code: 500, msg: '获取回库单列表失败' })
  }
})

// 获取回库单详情
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params

    const order = prepare(`
      SELECT o.*, u.name as submitter_name, oo.order_no as outbound_order_no
      FROM return_orders o
      JOIN users u ON o.submitter_id = u.id
      JOIN outbound_orders oo ON o.outbound_order_id = oo.id
      WHERE o.id = ?
    `).get(id)

    if (!order) {
      return res.json({ code: 404, msg: '回库单不存在' })
    }

    const items = prepare(`
      SELECT i.*, m.name as material_name, m.specification
      FROM return_items i
      JOIN materials m ON i.material_id = m.id
      WHERE i.return_order_id = ?
    `).all(id)

    res.json({ code: 200, data: { ...order, items } })
  } catch (error) {
    console.error('获取回库单详情错误:', error)
    res.json({ code: 500, msg: '获取回库单详情失败' })
  }
})

// 根据出库单ID获取回库单
router.get('/by-outbound/:outboundId', authMiddleware, (req, res) => {
  try {
    const { outboundId } = req.params

    const orders = prepare(`
      SELECT * FROM return_orders WHERE outbound_order_id = ?
    `).all(outboundId)

    res.json({ code: 200, data: orders })
  } catch (error) {
    console.error('获取回库单错误:', error)
    res.json({ code: 500, msg: '获取回库单失败' })
  }
})

// 创建回库单
router.post('/', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { outbound_order_id, items } = req.body

    if (!items || items.length === 0) {
      return res.json({ code: 400, msg: '请添加物资明细' })
    }

    // 验证出库单是否存在且已批准
    const outboundOrder = prepare('SELECT * FROM outbound_orders WHERE id = ?').get(outbound_order_id)
    if (!outboundOrder) {
      return res.json({ code: 404, msg: '关联的出库单不存在' })
    }

    if (outboundOrder.status !== 'approved') {
      return res.json({ code: 400, msg: '关联的出库单尚未审批通过' })
    }

    const orderNo = generateOrderNo('return')

    const result = prepare(`
      INSERT INTO return_orders (order_no, submitter_id, outbound_order_id, status)
      VALUES (?, ?, ?, 'draft')
    `).run(orderNo, req.user.id, outbound_order_id)

    const orderId = result.lastInsertRowid

    // 插入明细
    const insertItem = prepare(`
      INSERT INTO return_items (return_order_id, material_id, quantity)
      VALUES (?, ?, ?)
    `)

    items.forEach(item => {
      insertItem.run(orderId, item.material_id, item.quantity)
    })

    res.json({ code: 200, msg: '创建成功', data: { id: orderId, order_no: orderNo } })
  } catch (error) {
    console.error('创建回库单错误:', error)
    res.json({ code: 500, msg: '创建回库单失败' })
  }
})

// 更新回库单
router.put('/:id', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params
    const { outbound_order_id, items } = req.body

    const order = prepare('SELECT * FROM return_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '回库单不存在' })
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限修改此单据' })
    }

    if (order.status !== 'draft' && order.status !== 'rejected') {
      return res.json({ code: 400, msg: '当前状态不允许修改' })
    }

    prepare('DELETE FROM return_items WHERE return_order_id = ?').run(id)

    const insertItem = prepare(`
      INSERT INTO return_items (return_order_id, material_id, quantity)
      VALUES (?, ?, ?)
    `)

    items.forEach(item => {
      insertItem.run(id, item.material_id, item.quantity)
    })

    res.json({ code: 200, msg: '更新成功' })
  } catch (error) {
    console.error('更新回库单错误:', error)
    res.json({ code: 500, msg: '更新回库单失败' })
  }
})

// 提交回库单
router.post('/:id/submit', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params

    const order = prepare('SELECT * FROM return_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '回库单不存在' })
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限提交此单据' })
    }

    if (order.status !== 'draft' && order.status !== 'rejected') {
      return res.json({ code: 400, msg: '当前状态不允许提交' })
    }

    prepare("UPDATE return_orders SET status = 'pending' WHERE id = ?").run(id)

    res.json({ code: 200, msg: '提交成功，回库单已进入审批流程' })
  } catch (error) {
    console.error('提交回库单错误:', error)
    res.json({ code: 500, msg: '提交回库单失败' })
  }
})

// 删除回库单
router.delete('/:id', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params

    const order = prepare('SELECT * FROM return_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '回库单不存在' })
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限删除此单据' })
    }

    if (order.status !== 'draft') {
      return res.json({ code: 400, msg: '当前状态不允许删除' })
    }

    prepare('DELETE FROM return_orders WHERE id = ?').run(id)
    res.json({ code: 200, msg: '删除成功' })
  } catch (error) {
    console.error('删除回库单错误:', error)
    res.json({ code: 500, msg: '删除回库单失败' })
  }
})

export default router
