import express from 'express';
import { prepare } from '../database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

function generateOrderNo(type) {
  const prefix = type === 'inbound' ? 'RK' : type === 'outbound' ? 'CK' : 'HK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + timestamp + random;
}

router.get('/', authMiddleware, (req, res) => {
  try {
    let orders;
    console.log('Fetching inbound orders, user role:', req.user.role, 'user id:', req.user.id);
    
    if (req.user.role === 'business') {
      orders = prepare(
        `SELECT io.*, u.name as submitter_name,
         fa.name as finance_approver_name, aa.name as admin_approver_name
         FROM inbound_orders io
         LEFT JOIN users u ON io.submitter_id = u.id
         LEFT JOIN users fa ON io.finance_approver_id = fa.id
         LEFT JOIN users aa ON io.admin_approver_id = aa.id
         WHERE io.submitter_id = ? ORDER BY io.created_at DESC`
      ).all(req.user.id);
    } else {
      orders = prepare(
        `SELECT io.*, u.name as submitter_name,
         fa.name as finance_approver_name, aa.name as admin_approver_name
         FROM inbound_orders io
         LEFT JOIN users u ON io.submitter_id = u.id
         LEFT JOIN users fa ON io.finance_approver_id = fa.id
         LEFT JOIN users aa ON io.admin_approver_id = aa.id
         ORDER BY io.created_at DESC`
      ).all();
    }

    // 为每个订单获取物资明细
    orders = orders.map(order => {
      const items = prepare(
        'SELECT * FROM inbound_items WHERE inbound_order_id = ?'
      ).all(order.id);
      
      const materialNames = items.map(i => i.material_name).join('、');
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const avgPrice = items.length > 0 ? (items.reduce((sum, i) => sum + (i.unit_price || 0), 0) / items.length).toFixed(2) : 0;
      
      return { ...order, items, materialNames, totalQty, avgPrice };
    });
    
    console.log('Found orders:', orders);
    res.json({ code: 200, data: orders });
  } catch (error) {
    console.error('获取入库单列表错误:', error);
    res.json({ code: 500, msg: '获取入库单列表失败', error: String(error) });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    const order = prepare(
      'SELECT io.*, u.name as submitter_name FROM inbound_orders io LEFT JOIN users u ON io.submitter_id = u.id WHERE io.id = ?'
    ).get(id);

    if (!order) {
      return res.json({ code: 404, msg: '入库单不存在' });
    }

    const items = prepare(
      'SELECT * FROM inbound_items WHERE inbound_order_id = ?'
    ).all(id);

    res.json({ code: 200, data: { ...order, items } });
  } catch (error) {
    console.error('获取入库单详情错误:', error);
    res.json({ code: 500, msg: '获取入库单详情失败' });
  }
});

router.post('/', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { supplier, total_amount, items } = req.body;
    console.log('Creating inbound order:', { supplier, total_amount, items: items?.length });

    if (!items || items.length === 0) {
      return res.json({ code: 400, msg: '请添加物资明细' });
    }

    const orderNo = generateOrderNo('inbound');

    const result = prepare(
      'INSERT INTO inbound_orders (order_no, submitter_id, supplier, total_amount, status) VALUES (?, ?, ?, ?, ?)'
    ).run(orderNo, req.user.id, supplier || '', total_amount || 0, 'draft');

    const orderId = result.lastInsertRowid;
    console.log('Created order with id:', orderId);

    const insertItem = prepare(
      'INSERT INTO inbound_items (inbound_order_id, material_id, material_name, specification, unit, quantity, unit_price, total_price, supplier, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    items.forEach((item, index) => {
      const inserted = insertItem.run(
        orderId, 
        item.material_id || null, 
        item.material_name || '', 
        item.specification || '', 
        item.unit || '', 
        item.quantity || 0, 
        item.unit_price || 0, 
        item.total_price || 0,
        item.supplier || '',
        item.remark || ''
      );
      console.log('Inserted item', index, 'result:', inserted);
    });

    res.json({ code: 200, msg: '创建成功', data: { id: orderId, order_no: orderNo } });
  } catch (error) {
    console.error('创建入库单错误:', error);
    res.json({ code: 500, msg: '创建入库单失败', error: String(error) });
  }
});

router.put('/:id', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params;
    const { supplier, total_amount, items } = req.body;

    const order = prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id);
    if (!order) {
      return res.json({ code: 404, msg: '入库单不存在' });
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限修改此单据' });
    }

    if (order.status !== 'draft' && order.status !== 'rejected') {
      return res.json({ code: 400, msg: '当前状态不允许修改' });
    }

    prepare(
      'UPDATE inbound_orders SET supplier = ?, total_amount = ? WHERE id = ?'
    ).run(supplier || '', total_amount || 0, id);

    prepare('DELETE FROM inbound_items WHERE inbound_order_id = ?').run(id);

    const insertItem = prepare(
      'INSERT INTO inbound_items (inbound_order_id, material_id, material_name, specification, unit, quantity, unit_price, total_price, supplier, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    items.forEach(item => {
      insertItem.run(
        id, 
        item.material_id || null, 
        item.material_name || '', 
        item.specification || '', 
        item.unit || '', 
        item.quantity || 0, 
        item.unit_price || 0, 
        item.total_price || 0,
        item.supplier || '',
        item.remark || ''
      );
    });

    res.json({ code: 200, msg: '更新成功' });
  } catch (error) {
    console.error('更新入库单错误:', error);
    res.json({ code: 500, msg: '更新入库单失败' });
  }
});

router.delete('/:id', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params;

    const order = prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id);
    if (!order) {
      return res.json({ code: 404, msg: '入库单不存在' });
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限删除此单据' });
    }

    if (order.status !== 'draft') {
      return res.json({ code: 400, msg: '当前状态不允许删除' });
    }

    prepare('DELETE FROM inbound_orders WHERE id = ?').run(id);
    res.json({ code: 200, msg: '删除成功' });
  } catch (error) {
    console.error('删除入库单错误:', error);
    res.json({ code: 500, msg: '删除入库单失败' });
  }
});

router.post('/:id/submit', authMiddleware, roleMiddleware('business'), (req, res) => {
  try {
    const { id } = req.params;

    const order = prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id);
    if (!order) {
      return res.json({ code: 404, msg: '入库单不存在' });
    }

    if (order.submitter_id !== req.user.id) {
      return res.json({ code: 403, msg: '没有权限提交此单据' });
    }

    if (order.status !== 'draft' && order.status !== 'rejected') {
      return res.json({ code: 400, msg: '当前状态不允许提交' });
    }

    prepare("UPDATE inbound_orders SET status = 'pending' WHERE id = ?").run(id);

    res.json({ code: 200, msg: '提交成功' });
  } catch (error) {
    console.error('提交入库单错误:', error);
    res.json({ code: 500, msg: '提交入库单失败' });
  }
});

export default router;
