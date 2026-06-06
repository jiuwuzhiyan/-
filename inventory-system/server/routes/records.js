import express from 'express'
import { prepare } from '../database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取出入库记录
router.get('/', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate, materialName, operator, status } = req.query

    // 查询入库单明细（状态不是草稿）
    let inboundSql = `
      SELECT io.id as order_id, io.order_no, io.status, io.reject_reason, io.created_at,
             'inbound' as type, ii.supplier, u.name as submitter_name,
             ii.material_name, ii.spec, ii.model, ii.unit, ii.quantity,
             ii.unit_price, ii.total_price, ii.remark
      FROM inbound_orders io
      JOIN users u ON io.submitter_id = u.id
      JOIN inbound_items ii ON io.id = ii.inbound_order_id
      WHERE io.status != 'draft'
    `
    const inboundParams = []
    if (status) {
      inboundSql += ' AND io.status = ?'
      inboundParams.push(status)
    }
    if (startDate) {
      inboundSql += ' AND date(io.created_at) >= date(?)'
      inboundParams.push(startDate)
    }
    if (endDate) {
      inboundSql += ' AND date(io.created_at) <= date(?)'
      inboundParams.push(endDate)
    }
    if (operator) {
      inboundSql += ' AND u.name LIKE ?'
      inboundParams.push(`%${operator}%`)
    }
    if (materialName) {
      inboundSql += ' AND ii.material_name LIKE ?'
      inboundParams.push(`%${materialName}%`)
    }
    inboundSql += ' ORDER BY io.created_at DESC'
    const inboundItems = prepare(inboundSql).all(...inboundParams)

    // 查询出库单明细
    let outboundSql = `
      SELECT oo.id as order_id, oo.order_no, oo.status, oo.reject_reason, oo.created_at,
             'outbound' as type, oo.department, oo.receiver, u.name as submitter_name,
             oi.material_name, oi.spec, oi.model, oi.unit, oi.quantity,
             m.unit_price, (oi.quantity * m.unit_price) as total_price,
             oi.remark
      FROM outbound_orders oo
      JOIN users u ON oo.submitter_id = u.id
      JOIN outbound_items oi ON oo.id = oi.outbound_order_id
      LEFT JOIN materials m ON oi.material_id = m.id
      WHERE oo.status != 'draft'
    `
    const outboundParams = []
    if (status) {
      outboundSql += ' AND oo.status = ?'
      outboundParams.push(status)
    }
    if (startDate) {
      outboundSql += ' AND date(oo.created_at) >= date(?)'
      outboundParams.push(startDate)
    }
    if (endDate) {
      outboundSql += ' AND date(oo.created_at) <= date(?)'
      outboundParams.push(endDate)
    }
    if (operator) {
      outboundSql += ' AND u.name LIKE ?'
      outboundParams.push(`%${operator}%`)
    }
    if (materialName) {
      outboundSql += ' AND oi.material_name LIKE ?'
      outboundParams.push(`%${materialName}%`)
    }
    outboundSql += ' ORDER BY oo.created_at DESC'
    const outboundItems = prepare(outboundSql).all(...outboundParams)

    // 查询回库单明细
    let returnSql = `
      SELECT ro.id as order_id, ro.order_no, ro.status, ro.reject_reason, ro.created_at,
             'return' as type, oo.order_no as outbound_order_no, u.name as submitter_name,
             m.name as material_name, m.spec, m.model, m.unit, ri.quantity,
             m.unit_price, (ri.quantity * m.unit_price) as total_price
      FROM return_orders ro
      JOIN users u ON ro.submitter_id = u.id
      JOIN outbound_orders oo ON ro.outbound_order_id = oo.id
      JOIN return_items ri ON ro.id = ri.return_order_id
      JOIN materials m ON ri.material_id = m.id
      WHERE ro.status != 'draft'
    `
    const returnParams = []
    if (status) {
      returnSql += ' AND ro.status = ?'
      returnParams.push(status)
    }
    if (startDate) {
      returnSql += ' AND date(ro.created_at) >= date(?)'
      returnParams.push(startDate)
    }
    if (endDate) {
      returnSql += ' AND date(ro.created_at) <= date(?)'
      returnParams.push(endDate)
    }
    if (operator) {
      returnSql += ' AND u.name LIKE ?'
      returnParams.push(`%${operator}%`)
    }
    if (materialName) {
      returnSql += ' AND m.name LIKE ?'
      returnParams.push(`%${materialName}%`)
    }
    returnSql += ' ORDER BY ro.created_at DESC'
    const returnItems = prepare(returnSql).all(...returnParams)

    // 合并所有明细并排序
    const allItems = [...inboundItems, ...outboundItems, ...returnItems].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // 为每个明细添加完整信息，用于详情查看
    const enrichedItems = allItems.map(item => {
      const enrichedItem = { ...item, id: `${item.type}_${item.order_id}_${item.material_name}` }
      return enrichedItem
    })

    res.json({ code: 200, data: enrichedItems })
  } catch (error) {
    console.error('获取出入库记录错误:', error)
    res.json({ code: 500, msg: '获取出入库记录失败' })
  }
})

export default router
