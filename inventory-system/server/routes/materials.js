import express from 'express'
import { prepare } from '../database.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取物资列表
router.get('/', authMiddleware, (req, res) => {
  try {
    const materials = prepare(`
      SELECT m.*,
        COALESCE(SUM(CASE WHEN si.type = 'inbound' THEN si.quantity ELSE 0 END), 0) as total_inbound,
        COALESCE(SUM(CASE WHEN si.type = 'outbound' THEN si.quantity ELSE 0 END), 0) as total_outbound
      FROM materials m
      LEFT JOIN stock_records si ON m.id = si.material_id
      GROUP BY m.id
      ORDER BY m.id
    `).all()

    res.json({ code: 200, data: materials })
  } catch (error) {
    console.error('获取物资列表错误:', error)
    res.json({ code: 500, msg: '获取物资列表失败' })
  }
})

// 创建物资
router.post('/', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const { name, spec, model, unit, min_stock, unit_price } = req.body

    if (!name || !unit) {
      return res.json({ code: 400, msg: '物资名称和单位不能为空' })
    }

    const result = prepare('INSERT INTO materials (name, spec, model, unit, min_stock, unit_price) VALUES (?, ?, ?, ?, ?, ?)').run(
      name, spec || '', model || '', unit, min_stock || 0, unit_price || 0
    )

    res.json({ code: 200, msg: '创建成功', data: { id: result.lastInsertRowid } })
  } catch (error) {
    console.error('创建物资错误:', error)
    res.json({ code: 500, msg: '创建物资失败' })
  }
})

// 更新物资
router.put('/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const { id } = req.params
    const { name, spec, model, unit, min_stock, unit_price } = req.body

    const material = prepare('SELECT * FROM materials WHERE id = ?').get(id)
    if (!material) {
      return res.json({ code: 404, msg: '物资不存在' })
    }

    prepare('UPDATE materials SET name = ?, spec = ?, model = ?, unit = ?, min_stock = ?, unit_price = ? WHERE id = ?').run(
      name, spec || '', model || '', unit, min_stock || 0, unit_price || 0, id
    )

    res.json({ code: 200, msg: '更新成功' })
  } catch (error) {
    console.error('更新物资错误:', error)
    res.json({ code: 500, msg: '更新物资失败' })
  }
})

// 删除物资
router.delete('/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  try {
    const { id } = req.params

    const material = prepare('SELECT * FROM materials WHERE id = ?').get(id)
    if (!material) {
      return res.json({ code: 404, msg: '物资不存在' })
    }

    prepare('DELETE FROM materials WHERE id = ?').run(id)
    res.json({ code: 200, msg: '删除成功' })
  } catch (error) {
    console.error('删除物资错误:', error)
    res.json({ code: 500, msg: '删除物资失败' })
  }
})

export default router
