import { prepare } from '../database';
import { DouyinScraper } from '../scrapers/douyin';
import { MeituanScraper } from '../scrapers/meituan';
import cron from 'node-cron';
import WebSocket from 'ws';

let wss: WebSocket.Server | null = null;

export function setWebSocketServer(server: WebSocket.Server) {
  wss = server;
}

function broadcastTaskProgress(taskId: number, progress: number, status: string) {
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'taskProgress', taskId, progress, status }));
    }
  });
}

export function createTask(platform: 'douyin' | 'meituan' | 'both', district: string): number {
  const result = prepare('INSERT INTO tasks (platform, district, status, progress) VALUES (?, ?, ?, ?)').run([platform, district, 'pending', 0]);
  return result.lastInsertRowid as number;
}

export async function runTask(taskId: number): Promise<void> {
  const task = prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  
  if (!task) {
    throw new Error('任务不存在');
  }
  
  prepare('UPDATE tasks SET status = ?, progress = ?, startedAt = CURRENT_TIMESTAMP WHERE id = ?').run(['running', 0, taskId]);
  broadcastTaskProgress(taskId, 0, 'running');

  try {
    if (task.platform === 'douyin' || task.platform === 'both') {
      const douyinScraper = new DouyinScraper();
      await douyinScraper.init();
      await douyinScraper.scrape(task.district, (progress) => {
        const totalProgress = task.platform === 'both' ? progress / 2 : progress;
        updateTaskProgress(taskId, Math.round(totalProgress));
      });
      await douyinScraper.close();
    }

    if (task.platform === 'meituan' || task.platform === 'both') {
      const meituanScraper = new MeituanScraper();
      await meituanScraper.init();
      await meituanScraper.scrape(task.district, (progress) => {
        const totalProgress = task.platform === 'both' ? 50 + progress / 2 : progress;
        updateTaskProgress(taskId, Math.round(totalProgress));
      });
      await meituanScraper.close();
    }

    prepare('UPDATE tasks SET status = ?, progress = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?').run(['completed', 100, taskId]);
    broadcastTaskProgress(taskId, 100, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    prepare('UPDATE tasks SET status = ?, errorMessage = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?').run(['failed', errorMessage, taskId]);
    broadcastTaskProgress(taskId, 0, 'failed');
    throw error;
  }
}

function updateTaskProgress(taskId: number, progress: number): void {
  prepare('UPDATE tasks SET progress = ? WHERE id = ?').run([progress, taskId]);
  broadcastTaskProgress(taskId, progress, 'running');
}

export function getTasks() {
  return prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all();
}

const cronJobs = new Map<number, cron.ScheduledTask>();

export function loadCronJobs() {
  const jobs = prepare('SELECT * FROM cron_jobs WHERE enabled = 1').all();
  
  for (const job of jobs as any[]) {
    startCronJob(job);
  }
}

function startCronJob(job: any) {
  const task = cron.schedule(job.cronExpression, async () => {
    try {
      const taskId = createTask(job.platform, job.district);
      await runTask(taskId);
    } catch (error) {
      console.error(`定时任务 ${job.name} 执行失败:`, error);
    }
  });
  cronJobs.set(job.id, task);
}

export function addCronJob(name: string, cronExpression: string, platform: 'douyin' | 'meituan' | 'both', district: string): number {
  const result = prepare('INSERT INTO cron_jobs (name, cronExpression, platform, district) VALUES (?, ?, ?, ?)').run([name, cronExpression, platform, district]);
  const jobId = result.lastInsertRowid as number;
  const job = prepare('SELECT * FROM cron_jobs WHERE id = ?').get(jobId);
  startCronJob(job);
  return jobId;
}

export function getCronJobs() {
  return prepare('SELECT * FROM cron_jobs ORDER BY createdAt DESC').all();
}

export function deleteCronJob(jobId: number) {
  const job = cronJobs.get(jobId);
  if (job) {
    job.stop();
    cronJobs.delete(jobId);
  }
  prepare('DELETE FROM cron_jobs WHERE id = ?').run([jobId]);
}
