import express from 'express'
import { prepare } from '../database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取库存列表
router.get('/', authMiddleware, (req, res) => {
  try {
    const materials = prepare('SELECT * FROM materials ORDER BY id').all()
    
    // 为每个物资查询最早的到期日
    const materialsWithExpiry = materials.map(material => {
      // 通过物资名称和规格匹配（不依赖 material_id）
      const expiryInfo = prepare(`
        SELECT MIN(ii.expiry_date) as earliest_expiry_date
        FROM inbound_items ii
        JOIN inbound_orders io ON ii.inbound_order_id = io.id
        WHERE ii.material_name = ? 
          AND (ii.specification = ? OR (ii.specification IS NULL AND ? IS NULL))
          AND io.status = 'approved' 
          AND ii.expiry_date IS NOT NULL 
          AND ii.expiry_date != ''
      `).get(material.name, material.specification || '', material.specification || '')
      
      return {
        ...material,
        expiry_date: expiryInfo?.earliest_expiry_date || null
      }
    })
    
    res.json({ code: 200, data: materialsWithExpiry })
  } catch (error) {
    console.error('获取库存列表错误:', error)
    res.json({ code: 500, msg: '获取库存列表失败' })
  }
})

// 获取库存统计
router.get('/statistics', authMiddleware, (req, res) => {
  try {
    const totalMaterials = prepare('SELECT COUNT(*) as count FROM materials').get()
    const lowStock = prepare('SELECT COUNT(*) as count FROM materials WHERE current_stock <= min_stock').get()
    const todayInbound = prepare(`
      SELECT COUNT(*) as count FROM inbound_orders
      WHERE status = 'approved' AND date(created_at) = date('now')
    `).get()
    const todayOutbound = prepare(`
      SELECT COUNT(*) as count FROM outbound_orders
      WHERE status = 'approved' AND date(created_at) = date('now')
    `).get()

    res.json({
      code: 200,
      data: {
        totalMaterials: totalMaterials.count,
        lowStock: lowStock.count,
        todayInbound: todayInbound.count,
        todayOutbound: todayOutbound.count
      }
    })
  } catch (error) {
    console.error('获取库存统计错误:', error)
    res.json({ code: 500, msg: '获取库存统计失败' })
  }
})

export default router
