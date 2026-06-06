import express from 'express'
import { prepare } from '../database.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

function generateOrderNo() {
  const prefix = 'HK'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return prefix + timestamp + random
}

router.get('/', authMiddleware, (req, res) => {
  try {
    let orders
    console.log('获取回库单列表，用户角色:', req.user.role, '用户id:', req.user.id)
    
    if (req.user.role === 'business') {
      orders = prepare(`
        SELECT r.*, u.name as submitter_name, o.order_no as outbound_order_no
        FROM return_orders r
        LEFT JOIN users u ON r.submitter_id = u.id
        LEFT JOIN outbound_orders o ON r.outbound_order_id = o.id
        WHERE r.submitter_id = ?
        ORDER BY r.created_at DESC
      `).all(req.user.id)
    } else {
      orders = prepare(`
        SELECT r.*, u.name as submitter_name, o.order_no as outbound_order_no
        FROM return_orders r
        LEFT JOIN users u ON r.submitter_id = u.id
        LEFT JOIN outbound_orders o ON r.outbound_order_id = o.id
        ORDER BY r.created_at DESC
      `).all()
    }

    orders = orders.map(order => {
      const items = prepare('SELECT r.*, m.name as material_name, m.spec, m.model, m.unit FROM return_items r LEFT JOIN materials m ON r.material_id = m.id WHERE r.return_order_id = ?').all(order.id)
      return { ...order, items }
    })
    
    console.log('找到回库单数量:', orders.length)
    res.json({ code: 200, data: orders })
  } catch (error) {
    console.error('获取回库单列表错误:', error)
    res.json({ code: 500, msg: '获取回库单列表失败', error: String(error) })
  }
})

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params

    const order = prepare(`
      SELECT r.*, u.name as submitter_name, o.order_no as outbound_order_no
      FROM return_orders r
      LEFT JOIN users u ON r.submitter_id = u.id
      LEFT JOIN outbound_orders o ON r.outbound_order_id = o.id
      WHERE r.id = ?
    `).get(id)

    if (!order) {
      return res.json({ code: 404, msg: '回库单不存在' })
    }

    const items = prepare('SELECT r.*, m.name as material_name, m.spec, m.model, m.unit FROM return_items r LEFT JOIN materials m ON r.material_id = m.id WHERE r.return_order_id = ?').all(id)

    res.json({ code: 200, data: { ...order, items } })
  } catch (error) {
    console.error('获取回库单详情错误:', error)
    res.json({ code: 500, msg: '获取回库单详情失败' })
  }
})

router.post('/', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { outbound_order_id, items } = req.body
    console.log('创建回库单:', { outbound_order_id, items: items?.length })

    if (!items || items.length === 0) {
      return res.json({ code: 400, msg: '请添加物资明细' })
    }

    for (const item of items) {
      const material = prepare('SELECT * FROM materials WHERE id = ?').get(item.material_id)
      if (!material) {
        return res.json({ code: 400, msg: `物资不存在: ${item.material_id}` })
      }
    }

    const orderNo = generateOrderNo()

    const result = prepare(`
      INSERT INTO return_orders (order_no, submitter_id, outbound_order_id, status)
      VALUES (?, ?, ?, ?)
    `).run(orderNo, req.user.id, outbound_order_id, 'draft')

    const orderId = result.lastInsertRowid
    console.log('创建回库单id:', orderId)

    const insertItem = prepare(`
      INSERT INTO return_items (return_order_id, material_id, spec, model, quantity)
      VALUES (?, ?, ?, ?, ?)
    `)

    items.forEach(item => {
      insertItem.run(
        orderId, 
        item.material_id, 
        item.spec || '',
        item.model || '',
        item.quantity
      )
    })

    res.json({ code: 200, msg: '创建成功', data: { id: orderId, order_no: orderNo } })
  } catch (error) {
    console.error('创建回库单错误:', error)
    res.json({ code: 500, msg: '创建回库单失败', error: String(error) })
  }
})

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

    if (order.status !== 'draft') {
      return res.json({ code: 400, msg: '当前状态不允许修改' })
    }

    for (const item of items) {
      const material = prepare('SELECT * FROM materials WHERE id = ?').get(item.material_id)
      if (!material) {
        return res.json({ code: 400, msg: `物资不存在: ${item.material_id}` })
      }
    }

    prepare(`
      UPDATE return_orders SET outbound_order_id = ? WHERE id = ?
    `).run(outbound_order_id, id)

    prepare('DELETE FROM return_items WHERE return_order_id = ?').run(id)

    const insertItem = prepare(`
      INSERT INTO return_items (return_order_id, material_id, spec, model, quantity)
      VALUES (?, ?, ?, ?, ?)
    `)

    items.forEach(item => {
      insertItem.run(
        id, 
        item.material_id, 
        item.spec || '',
        item.model || '',
        item.quantity
      )
    })

    res.json({ code: 200, msg: '更新成功' })
  } catch (error) {
    console.error('更新回库单错误:', error)
    res.json({ code: 500, msg: '更新回库单失败' })
  }
})

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
