import express from 'express'
import { prepare } from '../database.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取待审批单据列表
router.get('/pending', authMiddleware, roleMiddleware('finance', 'admin', 'superadmin'), (req, res) => {
  try {
    console.log('获取待审批单据，用户角色:', req.user.role)

    // 获取财务和行政待审批的入库单和出库单
    let inboundOrders, outboundOrders, returnOrders

    if (req.user.role === 'finance' || req.user.role === 'superadmin') {
      inboundOrders = prepare(`
        SELECT o.*, u.name as submitter_name, 'inbound' as type
        FROM inbound_orders o
        JOIN users u ON o.submitter_id = u.id
        WHERE o.status = 'pending' AND o.finance_approver_id IS NULL
        ORDER BY o.created_at DESC
      `).all()

      outboundOrders = prepare(`
        SELECT o.*, u.name as submitter_name, 'outbound' as type
        FROM outbound_orders o
        JOIN users u ON o.submitter_id = u.id
        WHERE o.status = 'pending' AND o.finance_approver_id IS NULL
        ORDER BY o.created_at DESC
      `).all()

      returnOrders = prepare(`
        SELECT o.*, u.name as submitter_name, oo.order_no as outbound_order_no, 'return' as type
        FROM return_orders o
        JOIN users u ON o.submitter_id = u.id
        JOIN outbound_orders oo ON o.outbound_order_id = oo.id
        WHERE o.status = 'pending' AND o.finance_approver_id IS NULL
        ORDER BY o.created_at DESC
      `).all()
    } else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      inboundOrders = prepare(`
        SELECT o.*, u.name as submitter_name, 'inbound' as type
        FROM inbound_orders o
        JOIN users u ON o.submitter_id = u.id
        WHERE o.status = 'pending' AND o.admin_approver_id IS NULL
        ORDER BY o.created_at DESC
      `).all()

      outboundOrders = prepare(`
        SELECT o.*, u.name as submitter_name, 'outbound' as type
        FROM outbound_orders o
        JOIN users u ON o.submitter_id = u.id
        WHERE o.status = 'pending' AND o.admin_approver_id IS NULL
        ORDER BY o.created_at DESC
      `).all()

      returnOrders = prepare(`
        SELECT o.*, u.name as submitter_name, oo.order_no as outbound_order_no, 'return' as type
        FROM return_orders o
        JOIN users u ON o.submitter_id = u.id
        JOIN outbound_orders oo ON o.outbound_order_id = oo.id
        WHERE o.status = 'pending' AND o.admin_approver_id IS NULL
        ORDER BY o.created_at DESC
      `).all()
    } else {
      inboundOrders = []
      outboundOrders = []
      returnOrders = []
    }

    const pendingList = [...inboundOrders, ...outboundOrders, ...returnOrders].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    console.log('找到待审批单据数量:', pendingList.length)
    res.json({ code: 200, data: pendingList })
  } catch (error) {
    console.error('获取待审批单据错误:', error)
    res.json({ code: 500, msg: '获取待审批单据失败', error: String(error) })
  }
})

// 审批通过入库单
router.post('/inbound/:id/approve', authMiddleware, roleMiddleware('finance', 'admin', 'superadmin'), (req, res) => {
  try {
    const { id } = req.params
    console.log('审批通过入库单:', id, '用户角色:', req.user.role)

    const order = prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '入库单不存在' })
    }

    if (order.status !== 'pending') {
      return res.json({ code: 400, msg: '当前状态不允许审批' })
    }

    // 检查是否有权限审批
    const canFinanceApprove = (req.user.role === 'finance' || req.user.role === 'superadmin') && !order.finance_approver_id
    const canAdminApprove = (req.user.role === 'admin' || req.user.role === 'superadmin') && !order.admin_approver_id

    if (!canFinanceApprove && !canAdminApprove) {
      return res.json({ code: 403, msg: '没有权限审批此单据' })
    }

    // 更新审批状态
    let bothApproved = false
    if (canFinanceApprove && canAdminApprove) {
      // 同时是财务和行政角色，同时通过
      prepare(`
        UPDATE inbound_orders
        SET finance_approver_id = ?, admin_approver_id = ?,
            finance_approved_at = CURRENT_TIMESTAMP, admin_approved_at = CURRENT_TIMESTAMP,
            status = 'approved'
        WHERE id = ?
      `).run(req.user.id, req.user.id, id)
      bothApproved = true
    } else if (canFinanceApprove) {
      prepare(`
        UPDATE inbound_orders
        SET finance_approver_id = ?, finance_approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, id)
    } else if (canAdminApprove) {
      prepare(`
        UPDATE inbound_orders
        SET admin_approver_id = ?, admin_approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, id)
    }

    // 检查是否两边都审批通过，创建库存记录
    const updatedOrder = prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id)
    if (updatedOrder.finance_approver_id && updatedOrder.admin_approver_id) {
      if (!bothApproved) {
        prepare('UPDATE inbound_orders SET status = ? WHERE id = ?').run('approved', id)
      }
      
      // 审批通过，更新库存
      const items = prepare('SELECT * FROM inbound_items WHERE inbound_order_id = ?').all(id)

      items.forEach(item => {
        if (item.material_id) {
          // 关联了物资表，更新现有物资库存、单价和备注
          prepare('UPDATE materials SET current_stock = current_stock + ?, unit_price = ?, remark = ? WHERE id = ?').run(item.quantity, item.unit_price, item.remark, item.material_id)
        } else {
          // 未关联物资表，创建新物资
          const result = prepare(`
            INSERT INTO materials (name, specification, unit, current_stock, min_stock, unit_price, remark)
            VALUES (?, ?, ?, ?, 0, ?, ?)
          `).run(item.material_name, item.specification || '', item.unit || '', item.quantity, item.unit_price, item.remark)
        }
        
        // 记录库存变动
        prepare(`
          INSERT INTO stock_records (material_id, type, order_id, quantity, operator_id)
          VALUES (?, 'inbound', ?, ?, ?)
        `).run(item.material_id || null, id, item.quantity, req.user.id)
      })
    }

    res.json({ code: 200, msg: '审批通过' })
  } catch (error) {
    console.error('审批入库单错误:', error)
    res.json({ code: 500, msg: '审批失败', error: String(error) })
  }
})

// 审批驳回入库单
router.post('/inbound/:id/reject', authMiddleware, roleMiddleware('finance', 'admin', 'superadmin'), (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      return res.json({ code: 400, msg: '请填写驳回原因' })
    }

    const order = prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '入库单不存在' })
    }

    if (order.status !== 'pending') {
      return res.json({ code: 400, msg: '当前状态不允许驳回' })
    }

    prepare(`
      UPDATE inbound_orders SET status = 'rejected', reject_reason = ? WHERE id = ?
    `).run(reason, id)

    res.json({ code: 200, msg: '已驳回' })
  } catch (error) {
    console.error('驳回入库单错误:', error)
    res.json({ code: 500, msg: '驳回失败' })
  }
})

// 审批通过出库单
router.post('/outbound/:id/approve', authMiddleware, roleMiddleware('finance', 'admin', 'superadmin'), (req, res) => {
  try {
    const { id } = req.params
    console.log('审批通过出库单:', id, '用户角色:', req.user.role)

    const order = prepare('SELECT * FROM outbound_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '出库单不存在' })
    }

    if (order.status !== 'pending') {
      return res.json({ code: 400, msg: '当前状态不允许审批' })
    }

    // 检查是否有权限审批
    const canFinanceApprove = (req.user.role === 'finance' || req.user.role === 'superadmin') && !order.finance_approver_id
    const canAdminApprove = (req.user.role === 'admin' || req.user.role === 'superadmin') && !order.admin_approver_id

    if (!canFinanceApprove && !canAdminApprove) {
      return res.json({ code: 403, msg: '没有权限审批此单据' })
    }

    // 更新审批状态
    let bothApproved = false
    if (canFinanceApprove && canAdminApprove) {
      prepare(`
        UPDATE outbound_orders
        SET finance_approver_id = ?, admin_approver_id = ?,
            finance_approved_at = CURRENT_TIMESTAMP, admin_approved_at = CURRENT_TIMESTAMP,
            status = 'approved'
        WHERE id = ?
      `).run(req.user.id, req.user.id, id)
      bothApproved = true
    } else if (canFinanceApprove) {
      prepare(`
        UPDATE outbound_orders
        SET finance_approver_id = ?, finance_approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, id)
    } else if (canAdminApprove) {
      prepare(`
        UPDATE outbound_orders
        SET admin_approver_id = ?, admin_approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, id)
    }

    // 检查是否两边都审批通过，创建库存记录
    const updatedOrder = prepare('SELECT * FROM outbound_orders WHERE id = ?').get(id)
    if (updatedOrder.finance_approver_id && updatedOrder.admin_approver_id) {
      if (!bothApproved) {
        prepare('UPDATE outbound_orders SET status = ? WHERE id = ?').run('approved', id)
      }
      
      // 审批通过，更新库存
      const items = prepare('SELECT * FROM outbound_items WHERE outbound_order_id = ?').all(id)

      items.forEach(item => {
        if (item.material_id) {
          // 关联了物资表，更新现有物资库存
          prepare('UPDATE materials SET current_stock = current_stock - ? WHERE id = ?').run(item.quantity, item.material_id)
        }
        
        // 记录库存变动
        prepare(`
          INSERT INTO stock_records (material_id, type, order_id, quantity, operator_id)
          VALUES (?, 'outbound', ?, ?, ?)
        `).run(item.material_id || null, id, item.quantity, req.user.id)
      })
    }

    res.json({ code: 200, msg: '审批通过' })
  } catch (error) {
    console.error('审批出库单错误:', error)
    res.json({ code: 500, msg: '审批失败', error: String(error) })
  }
})

// 审批驳回出库单
router.post('/outbound/:id/reject', authMiddleware, roleMiddleware('finance', 'admin', 'superadmin'), (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      return res.json({ code: 400, msg: '请填写驳回原因' })
    }

    const order = prepare('SELECT * FROM outbound_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '出库单不存在' })
    }

    if (order.status !== 'pending') {
      return res.json({ code: 400, msg: '当前状态不允许驳回' })
    }

    prepare(`
      UPDATE outbound_orders SET status = 'rejected', reject_reason = ? WHERE id = ?
    `).run(reason, id)

    res.json({ code: 200, msg: '已驳回' })
  } catch (error) {
    console.error('驳回出库单错误:', error)
    res.json({ code: 500, msg: '驳回失败' })
  }
})

// 审批通过回库单
router.post('/return/:id/approve', authMiddleware, roleMiddleware('finance', 'admin', 'superadmin'), (req, res) => {
  try {
    const { id } = req.params
    console.log('审批通过回库单:', id, '用户角色:', req.user.role)

    const order = prepare('SELECT * FROM return_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '回库单不存在' })
    }

    if (order.status !== 'pending') {
      return res.json({ code: 400, msg: '当前状态不允许审批' })
    }

    // 检查是否有权限审批
    const canFinanceApprove = (req.user.role === 'finance' || req.user.role === 'superadmin') && !order.finance_approver_id
    const canAdminApprove = (req.user.role === 'admin' || req.user.role === 'superadmin') && !order.admin_approver_id

    if (!canFinanceApprove && !canAdminApprove) {
      return res.json({ code: 403, msg: '没有权限审批此单据' })
    }

    // 更新审批状态
    let bothApproved = false
    if (canFinanceApprove && canAdminApprove) {
      // 同时是财务和行政角色，同时通过
      prepare(`
        UPDATE return_orders
        SET finance_approver_id = ?, admin_approver_id = ?,
            finance_approved_at = CURRENT_TIMESTAMP, admin_approved_at = CURRENT_TIMESTAMP,
            status = 'approved'
        WHERE id = ?
      `).run(req.user.id, req.user.id, id)
      bothApproved = true
    } else if (canFinanceApprove) {
      prepare(`
        UPDATE return_orders
        SET finance_approver_id = ?, finance_approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, id)
    } else if (canAdminApprove) {
      prepare(`
        UPDATE return_orders
        SET admin_approver_id = ?, admin_approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, id)
    }

    // 检查是否两边都审批通过，更新库存
    const updatedOrder = prepare('SELECT * FROM return_orders WHERE id = ?').get(id)
    if (updatedOrder.finance_approver_id && updatedOrder.admin_approver_id) {
      if (!bothApproved) {
        prepare('UPDATE return_orders SET status = ? WHERE id = ?').run('approved', id)
      }

      const items = prepare('SELECT * FROM return_items WHERE return_order_id = ?').all(id)

      items.forEach(item => {
        // 更新库存
        prepare('UPDATE materials SET current_stock = current_stock + ? WHERE id = ?').run(item.quantity, item.material_id)
        
        // 记录库存变动
        prepare(`
          INSERT INTO stock_records (material_id, type, order_id, quantity, operator_id)
          VALUES (?, 'return', ?, ?, ?)
        `).run(item.material_id, id, item.quantity, req.user.id)
      })
    }

    res.json({ code: 200, msg: '审批通过' })
  } catch (error) {
    console.error('审批回库单错误:', error)
    res.json({ code: 500, msg: '审批失败', error: String(error) })
  }
})

// 审批驳回回库单
router.post('/return/:id/reject', authMiddleware, roleMiddleware('finance', 'admin', 'superadmin'), (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      return res.json({ code: 400, msg: '请填写驳回原因' })
    }

    const order = prepare('SELECT * FROM return_orders WHERE id = ?').get(id)
    if (!order) {
      return res.json({ code: 404, msg: '回库单不存在' })
    }

    if (order.status !== 'pending') {
      return res.json({ code: 400, msg: '当前状态不允许驳回' })
    }

    prepare(`
      UPDATE return_orders SET status = 'rejected', reject_reason = ? WHERE id = ?
    `).run(reason, id)

    res.json({ code: 200, msg: '已驳回' })
  } catch (error) {
    console.error('驳回回库单错误:', error)
    res.json({ code: 500, msg: '驳回失败' })
  }
})

export default router
