import express from 'express'
import { prepare } from '../database.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

function generateOrderNo(type) {
  const prefix = type === 'inbound' ? 'RK' : type === 'outbound' ? 'CK' : 'HK'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return prefix + timestamp + random
}

router.get('/', authMiddleware, (req, res) => {
  try {
    let orders
    console.log('获取出库单列表，用户角色:', req.user.role, '用户id:', req.user.id)
    
    if (req.user.role === 'business') {
      orders = prepare(`
        SELECT o.*, u.name as submitter_name,
               fa.name as finance_approver_name, aa.name as admin_approver_name
        FROM outbound_orders o
        LEFT JOIN users u ON o.submitter_id = u.id
        LEFT JOIN users fa ON o.finance_approver_id = fa.id
        LEFT JOIN users aa ON o.admin_approver_id = aa.id
        WHERE o.submitter_id = ?
        ORDER BY o.created_at DESC
      `).all(req.user.id)
    } else {
      orders = prepare(`
        SELECT o.*, u.name as submitter_name,
               fa.name as finance_approver_name, aa.name as admin_approver_name
        FROM outbound_orders o
        LEFT JOIN users u ON o.submitter_id = u.id
        LEFT JOIN users fa ON o.finance_approver_id = fa.id
        LEFT JOIN users aa ON o.admin_approver_id = aa.id
        ORDER BY o.created_at DESC
      `).all()
    }

    orders = orders.map(order => {
      const items = prepare('SELECT * FROM outbound_items WHERE outbound_order_id = ?').all(order.id)
      const materialNames = items.map(i => i.material_name || '').join('、')
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0)
      return { ...order, items, materialNames, totalQty }
    })
    
    console.log('找到出库单数量:', orders.length)
    res.json({ code: 200, data: orders })
  } catch (error) {
    console.error('获取出库单列表错误:', error)
    res.json({ code: 500, msg: '获取出库单列表失败', error: String(error) })
  }
})

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params

    const order = prepare(`
      SELECT o.*, u.name as submitter_name
      FROM outbound_orders o
      LEFT JOIN users u ON o.submitter_id = u.id
      WHERE o.id = ?
    `).get(id)

    if (!order) {
      return res.json({ code: 404, msg: '出库单不存在' })
    }

    const items = prepare('SELECT * FROM outbound_items WHERE outbound_order_id = ?').all(id)

    res.json({ code: 200, data: { ...order, items } })
  } catch (error) {
    console.error('获取出库单详情错误:', error)
    res.json({ code: 500, msg: '获取出库单详情失败' })
  }
})

router.post('/', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { department, receiver, items } = req.body
    console.log('创建出库单:', { department, receiver, items: items?.length })

    if (!items || items.length === 0) {
      return res.json({ code: 400, msg: '请添加物资明细' })
    }

    for (const item of items) {
      const material = prepare('SELECT * FROM materials WHERE id = ?').get(item.material_id)
      if (!material) {
        return res.json({ code: 400, msg: `物资不存在: ${item.material_id}` })
      }
      if (material.current_stock < item.quantity) {
        return res.json({ code: 400, msg: `${material.name} 库存不足，当前库存: ${material.current_stock}` })
      }
    }

    const orderNo = generateOrderNo('outbound')

    const result = prepare(`
      INSERT INTO outbound_orders (order_no, submitter_id, department, receiver, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(orderNo, req.user.id, department, receiver, 'draft')

    const orderId = result.lastInsertRowid
    console.log('创建出库单id:', orderId)

    const insertItem = prepare(`
      INSERT INTO outbound_items (outbound_order_id, material_id, material_name, spec, model, unit, quantity, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    items.forEach(item => {
      const material = prepare('SELECT * FROM materials WHERE id = ?').get(item.material_id)
      insertItem.run(
        orderId, 
        item.material_id, 
        material.name, 
        material.spec || '', 
        material.model || '', 
        material.unit || '', 
        item.quantity,
        item.remark || ''
      )
    })

    res.json({ code: 200, msg: '创建成功', data: { id: orderId, order_no: orderNo } })
  } catch (error) {
    console.error('创建出库单错误:', error)
    res.json({ code: 500, msg: '创建出库单失败', error: String(error) })
  }
})

router.put('/:id', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params
    const { department, receiver, items } = req.body

    const order = prepare('SELECT * FROM outbound_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '出库单不存在' })
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限修改此单据' })
    }

    if (order.status !== 'draft' && order.status !== 'rejected') {
      return res.json({ code: 400, msg: '当前状态不允许修改' })
    }

    for (const item of items) {
      const material = prepare('SELECT * FROM materials WHERE id = ?').get(item.material_id)
      if (!material) {
        return res.json({ code: 400, msg: `物资不存在: ${item.material_id}` })
      }
      if (material.current_stock < item.quantity) {
        return res.json({ code: 400, msg: `${material.name} 库存不足，当前库存: ${material.current_stock}` })
      }
    }

    prepare(`
      UPDATE outbound_orders SET department = ?, receiver = ? WHERE id = ?
    `).run(department, receiver, id)

    prepare('DELETE FROM outbound_items WHERE outbound_order_id = ?').run(id)

    const insertItem = prepare(`
      INSERT INTO outbound_items (outbound_order_id, material_id, material_name, spec, model, unit, quantity, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    items.forEach(item => {
      const material = prepare('SELECT * FROM materials WHERE id = ?').get(item.material_id)
      insertItem.run(
        id, 
        item.material_id, 
        material.name, 
        material.spec || '', 
        material.model || '', 
        material.unit || '', 
        item.quantity,
        item.remark || ''
      )
    })

    res.json({ code: 200, msg: '更新成功' })
  } catch (error) {
    console.error('更新出库单错误:', error)
    res.json({ code: 500, msg: '更新出库单失败' })
  }
})

router.delete('/:id', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params

    const order = prepare('SELECT * FROM outbound_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '出库单不存在' })
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限删除此单据' })
    }

    if (order.status !== 'draft') {
      return res.json({ code: 400, msg: '当前状态不允许删除' })
    }

    prepare('DELETE FROM outbound_orders WHERE id = ?').run(id)
    res.json({ code: 200, msg: '删除成功' })
  } catch (error) {
    console.error('删除出库单错误:', error)
    res.json({ code: 500, msg: '删除出库单失败' })
  }
})

router.post('/:id/submit', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params

    const order = prepare('SELECT * FROM outbound_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '出库单不存在' })
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限提交此单据' })
    }

    if (order.status !== 'draft' && order.status !== 'rejected') {
      return res.json({ code: 400, msg: '当前状态不允许提交' })
    }

    prepare("UPDATE outbound_orders SET status = 'pending' WHERE id = ?").run(id)

    res.json({ code: 200, msg: '提交成功' })
  } catch (error) {
    console.error('提交出库单错误:', error)
    res.json({ code: 500, msg: '提交出库单失败' })
  }
})

export default router
