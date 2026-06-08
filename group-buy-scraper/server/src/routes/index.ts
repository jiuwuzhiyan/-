import { Router, Request, Response } from 'express';
import { createTask, runTask, getTasks, addCronJob, getCronJobs, deleteCronJob } from '../taskManager';
import { getDatabase } from '../database';
import { exportToExcel, exportToCSV, exportToJSON } from '../export';

const router = Router();

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { platform, district } = req.body;
    const taskId = createTask(platform, district);
    res.json({ success: true, taskId });
    
    runTask(taskId).catch(console.error);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const tasks = getTasks();
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/shops', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { platform, district, page = 1, limit = 20 } = req.query;
    
    let query = 'SELECT * FROM shops';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (platform) {
      conditions.push('platform = ?');
      params.push(platform);
    }
    if (district) {
      conditions.push('district = ?');
      params.push(district);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), (parseInt(page as string) - 1) * parseInt(limit as string));
    
    const shops = db.prepare(query).all(...params);
    
    const countQuery = conditions.length > 0 
      ? 'SELECT COUNT(*) as total FROM shops WHERE ' + conditions.join(' AND ')
      : 'SELECT COUNT(*) as total FROM shops';
    const countResult: any = db.prepare(countQuery).get(...params.slice(0, -2));
    
    res.json({ 
      success: true, 
      shops, 
      total: countResult.total,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/shops/:shopId/packages', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const packages = db.prepare('SELECT * FROM packages WHERE shop_id = ?').all(req.params.shopId);
    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/shops/:shopId/reviews', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const reviews = db.prepare('SELECT * FROM reviews WHERE shop_id = ?').all(req.params.shopId);
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/districts', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const districts = db.prepare('SELECT DISTINCT district FROM shops ORDER BY district').all();
    res.json({ success: true, districts: (districts as any[]).map((d: any) => d.district) });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.post('/cron-jobs', async (req: Request, res: Response) => {
  try {
    const { name, cronExpression, platform, district } = req.body;
    const jobId = addCronJob(name, cronExpression, platform, district);
    res.json({ success: true, jobId });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/cron-jobs', async (req: Request, res: Response) => {
  try {
    const jobs = getCronJobs();
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.delete('/cron-jobs/:jobId', async (req: Request, res: Response) => {
  try {
    deleteCronJob(parseInt(req.params.jobId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/export/excel', async (req: Request, res: Response) => {
  try {
    const { platform, district } = req.query;
    await exportToExcel(res, { 
      platform: platform as string, 
      district: district as string 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const { platform, district } = req.query;
    await exportToCSV(res, { 
      platform: platform as string, 
      district: district as string 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

router.get('/export/json', async (req: Request, res: Response) => {
  try {
    const { platform, district } = req.query;
    await exportToJSON(res, { 
      platform: platform as string, 
      district: district as string 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '未知错误' });
  }
});

export default router;
