import fs from 'fs';
import path from 'path';

interface Shop {
  id: number;
  platform: string;
  shopName: string;
  address?: string;
  rating?: number;
  sales?: number;
  district: string;
  createdAt: string;
  updatedAt: string;
}

interface Package {
  id: number;
  shopId: number;
  packageName: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  sales?: number;
  createdAt: string;
}

interface Review {
  id: number;
  shopId: number;
  userName?: string;
  rating?: number;
  content?: string;
  reviewTime?: string;
  createdAt: string;
}

interface Task {
  id: number;
  platform: string;
  district: string;
  status: string;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface CronJob {
  id: number;
  name: string;
  cronExpression: string;
  platform: string;
  district: string;
  enabled: number;
  createdAt: string;
}

interface Database {
  shops: Shop[];
  packages: Package[];
  reviews: Review[];
  tasks: Task[];
  cronJobs: CronJob[];
  nextId: {
    shops: number;
    packages: number;
    reviews: number;
    tasks: number;
    cronJobs: number;
  };
}

let db: Database | null = null;
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'database.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function initDatabase(): Database {
  if (db) return db;

  ensureDataDir();

  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      db = JSON.parse(data);
      return db;
    } catch (e) {
      console.error('读取数据库失败，创建新数据库');
    }
  }

  db = {
    shops: [],
    packages: [],
    reviews: [],
    tasks: [],
    cronJobs: [],
    nextId: {
      shops: 1,
      packages: 1,
      reviews: 1,
      tasks: 1,
      cronJobs: 1
    }
  };

  saveDatabase();
  return db;
}

function saveDatabase() {
  ensureDataDir();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getDatabase(): Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

function prepare(query: string) {
  const db = getDatabase();
  
  const exec = (...params: any[]) => {
    let result: any = null;
    
    if (query.startsWith('INSERT INTO shops')) {
      const shop: Shop = {
        id: db.nextId.shops++,
        platform: params[0],
        shopName: params[1],
        address: params[2],
        rating: params[3],
        sales: params[4],
        district: params[5],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.shops.push(shop);
      result = { lastInsertRowid: shop.id };
      saveDatabase();
    } else if (query.startsWith('INSERT INTO packages')) {
      const pkg: Package = {
        id: db.nextId.packages++,
        shopId: params[0],
        packageName: params[1],
        description: params[2],
        price: params[3],
        originalPrice: params[4],
        sales: params[5],
        createdAt: new Date().toISOString()
      };
      db.packages.push(pkg);
      result = { lastInsertRowid: pkg.id };
      saveDatabase();
    } else if (query.startsWith('INSERT INTO reviews')) {
      const review: Review = {
        id: db.nextId.reviews++,
        shopId: params[0],
        userName: params[1],
        rating: params[2],
        content: params[3],
        reviewTime: params[4],
        createdAt: new Date().toISOString()
      };
      db.reviews.push(review);
      result = { lastInsertRowid: review.id };
      saveDatabase();
    } else if (query.startsWith('INSERT INTO tasks')) {
      const task: Task = {
        id: db.nextId.tasks++,
        platform: params[0],
        district: params[1],
        status: params[2],
        progress: params[3],
        createdAt: new Date().toISOString()
      };
      db.tasks.push(task);
      result = { lastInsertRowid: task.id };
      saveDatabase();
    } else if (query.startsWith('INSERT INTO cron_jobs')) {
      const job: CronJob = {
        id: db.nextId.cronJobs++,
        name: params[0],
        cronExpression: params[1],
        platform: params[2],
        district: params[3],
        enabled: 1,
        createdAt: new Date().toISOString()
      };
      db.cronJobs.push(job);
      result = { lastInsertRowid: job.id };
      saveDatabase();
    } else if (query.startsWith('UPDATE tasks SET status')) {
      const taskId = params[params.length - 1];
      const task = db.tasks.find(t => t.id === taskId);
      if (task) {
        if (query.includes('startedAt')) {
          task.status = params[0];
          task.progress = params[1];
          task.startedAt = new Date().toISOString();
        } else if (query.includes('errorMessage')) {
          task.status = params[0];
          task.errorMessage = params[1];
          task.completedAt = new Date().toISOString();
        } else if (query.includes('completedAt')) {
          task.status = params[0];
          task.progress = params[1];
          task.completedAt = new Date().toISOString();
        } else {
          task.progress = params[0];
        }
        saveDatabase();
      }
    } else if (query.startsWith('DELETE FROM cron_jobs')) {
      const jobId = params[0];
      db.cronJobs = db.cronJobs.filter(j => j.id !== jobId);
      saveDatabase();
    }
    
    return result;
  };

  const all = (...params: any[]): any[] => {
    if (query.includes('SELECT * FROM shops')) {
      let results = [...db.shops];
      let whereClause = '';
      
      if (query.includes('WHERE')) {
        if (query.includes('platform') && query.includes('district')) {
          results = results.filter(s => 
            s.platform === params[0] && s.district === params[1]
          );
        } else if (query.includes('platform')) {
          results = results.filter(s => s.platform === params[0]);
        } else if (query.includes('district')) {
          results = results.filter(s => s.district === params[0]);
        }
      }
      
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (query.includes('LIMIT')) {
        const limit = params[params.length - 2] as number;
        const offset = params[params.length - 1] as number;
        results = results.slice(offset, offset + limit);
      }
      
      return results.map(s => ({
        id: s.id,
        platform: s.platform,
        shop_name: s.shopName,
        address: s.address,
        rating: s.rating,
        sales: s.sales,
        district: s.district,
        created_at: s.createdAt,
        updated_at: s.updatedAt
      }));
    } else if (query.includes('SELECT * FROM packages WHERE shop_id')) {
      const shopId = params[0] as number;
      return db.packages
        .filter(p => p.shopId === shopId)
        .map(p => ({
          id: p.id,
          shop_id: p.shopId,
          package_name: p.packageName,
          description: p.description,
          price: p.price,
          original_price: p.originalPrice,
          sales: p.sales,
          created_at: p.createdAt
        }));
    } else if (query.includes('SELECT * FROM reviews WHERE shop_id')) {
      const shopId = params[0] as number;
      return db.reviews
        .filter(r => r.shopId === shopId)
        .map(r => ({
          id: r.id,
          shop_id: r.shopId,
          user_name: r.userName,
          rating: r.rating,
          content: r.content,
          review_time: r.reviewTime,
          created_at: r.createdAt
        }));
    } else if (query.includes('SELECT * FROM tasks')) {
      return [...db.tasks]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (query.includes('SELECT * FROM cron_jobs')) {
      if (query.includes('enabled')) {
        return db.cronJobs.filter(j => j.enabled === 1);
      }
      return [...db.cronJobs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (query.includes('SELECT DISTINCT district FROM shops')) {
      const districts = [...new Set(db.shops.map(s => s.district))];
      return districts.sort().map(d => ({ district: d }));
    } else if (query.includes('SELECT COUNT(*) as total FROM shops')) {
      let count = db.shops.length;
      if (query.includes('WHERE')) {
        if (query.includes('platform') && query.includes('district')) {
          count = db.shops.filter(s => 
            s.platform === params[0] && s.district === params[1]
          ).length;
        } else if (query.includes('platform')) {
          count = db.shops.filter(s => s.platform === params[0]).length;
        } else if (query.includes('district')) {
          count = db.shops.filter(s => s.district === params[0]).length;
        }
      }
      return [{ total: count }];
    }
    
    return [];
  };

  const get = (...params: any[]): any => {
    const results = all(...params);
    return results[0] || null;
  };

  return { run: exec, all, get };
}

export { initDatabase, getDatabase, prepare };
export type { Shop, Package, Review, Task, CronJob, Database };
