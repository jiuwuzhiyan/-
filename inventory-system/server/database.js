import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.db');
let db;
let SQL;

export async function initDatabase() {
  SQL = await initSqlJs();
  
  let Uint8ArrayFromDisk;
  if (fs.existsSync(dbPath)) {
    Uint8ArrayFromDisk = fs.readFileSync(dbPath);
  }
  
  if (Uint8ArrayFromDisk) {
    db = new SQL.Database(Uint8ArrayFromDisk);
  } else {
    db = new SQL.Database();
  }
  
  console.log('Initializing database...');
  
  // 创建用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('business', 'finance', 'admin', 'superadmin')),
      can_print_inbound INTEGER DEFAULT 0,
      can_print_outbound INTEGER DEFAULT 0,
      can_print_return INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建物资表
  db.run(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      spec TEXT,
      model TEXT,
      unit TEXT NOT NULL,
      current_stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      unit_price DECIMAL(10,2) DEFAULT 0,
      remark TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建入库单表
  db.run(`
    CREATE TABLE IF NOT EXISTS inbound_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      submitter_id INTEGER NOT NULL,
      supplier TEXT,
      total_amount DECIMAL(10,2),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      finance_approver_id INTEGER,
      admin_approver_id INTEGER,
      finance_approved_at TIMESTAMP,
      admin_approved_at TIMESTAMP,
      reject_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitter_id) REFERENCES users(id),
      FOREIGN KEY (finance_approver_id) REFERENCES users(id),
      FOREIGN KEY (admin_approver_id) REFERENCES users(id)
    )
  `);

  // 创建入库单明细表
  db.run(`
    CREATE TABLE IF NOT EXISTS inbound_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbound_order_id INTEGER NOT NULL,
      material_id INTEGER,
      material_name TEXT NOT NULL,
      spec TEXT,
      model TEXT,
      unit TEXT,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      supplier TEXT,
      remark TEXT,
      FOREIGN KEY (inbound_order_id) REFERENCES inbound_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // 创建出库单表
  db.run(`
    CREATE TABLE IF NOT EXISTS outbound_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      submitter_id INTEGER NOT NULL,
      department TEXT NOT NULL,
      receiver TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      finance_approver_id INTEGER,
      admin_approver_id INTEGER,
      finance_approved_at TIMESTAMP,
      admin_approved_at TIMESTAMP,
      reject_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitter_id) REFERENCES users(id),
      FOREIGN KEY (finance_approver_id) REFERENCES users(id),
      FOREIGN KEY (admin_approver_id) REFERENCES users(id)
    )
  `);

  // 创建出库单明细表
  db.run(`
    CREATE TABLE IF NOT EXISTS outbound_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outbound_order_id INTEGER NOT NULL,
      material_id INTEGER,
      material_name TEXT NOT NULL,
      spec TEXT,
      model TEXT,
      unit TEXT,
      quantity INTEGER NOT NULL,
      remark TEXT,
      FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // 创建回库单表
  db.run(`
    CREATE TABLE IF NOT EXISTS return_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      submitter_id INTEGER NOT NULL,
      outbound_order_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      finance_approver_id INTEGER,
      admin_approver_id INTEGER,
      finance_approved_at TIMESTAMP,
      admin_approved_at TIMESTAMP,
      reject_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitter_id) REFERENCES users(id),
      FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id),
      FOREIGN KEY (finance_approver_id) REFERENCES users(id),
      FOREIGN KEY (admin_approver_id) REFERENCES users(id)
    )
  `);

  // 创建回库单明细表
  db.run(`
    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_order_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      spec TEXT,
      model TEXT,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (return_order_id) REFERENCES return_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // 创建库存变动记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS stock_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER,
      type TEXT NOT NULL CHECK (type IN ('inbound', 'outbound', 'return')),
      order_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // 删除旧的 expiry_date 字段（如果存在）
  try {
    db.run("ALTER TABLE inbound_items DROP COLUMN expiry_date");
  } catch (e) {
    // 字段不存在，忽略
  }
  try {
    db.run("ALTER TABLE outbound_items DROP COLUMN expiry_date");
  } catch (e) {
    // 字段不存在，忽略
  }
  try {
    db.run("ALTER TABLE return_items DROP COLUMN expiry_date");
  } catch (e) {
    // 字段不存在，忽略
  }

  // 初始化超级管理员账号
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  stmt.bind(['admin']);
  const existingAdmin = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', [
      'admin',
      hashedPassword,
      '系统管理员',
      'superadmin'
    ]);
    console.log('超级管理员账号已创建: admin / 123456');
    
    // 创建测试账号
    const testUsers = [
      { username: 'business1', name: '业务人员1', role: 'business' },
      { username: 'finance1', name: '财务人员1', role: 'finance' },
      { username: 'admin1', name: '行政人员1', role: 'admin' }
    ];
    
    testUsers.forEach(user => {
      db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', [
        user.username, hashedPassword, user.name, user.role
      ]);
    });
    console.log('测试账号已创建');
    
    // 初始化测试物资
    const testMaterials = [
      { name: '笔记本电脑', spec: 'ThinkPad', model: 'X1 Carbon', unit: '台', current_stock: 10, min_stock: 5 },
      { name: '无线鼠标', spec: '罗技', model: 'MX Master 3', unit: '个', current_stock: 50, min_stock: 20 },
      { name: '机械键盘', spec: 'Cherry', model: 'MX Board', unit: '把', current_stock: 30, min_stock: 10 }
    ];
    
    testMaterials.forEach(mat => {
      db.run('INSERT INTO materials (name, spec, model, unit, current_stock, min_stock) VALUES (?, ?, ?, ?, ?, ?)', [
        mat.name, mat.spec, mat.model, mat.unit, mat.current_stock, mat.min_stock
      ]);
    });
    console.log('测试物资已创建');
  }

  saveDatabase();
  console.log('Database initialized successfully');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function prepare(sql) {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return {
    get(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      return result;
    },
    all(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
    run(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      const changes = db.getRowsModified();
      const result = db.exec('SELECT last_insert_rowid() as id');
      const lastInsertRowid = result[0] && result[0].values[0] && result[0].values[0][0] ? result[0].values[0][0] : 0;
      stmt.free();
      saveDatabase();
      console.log('DB run executed, id:', lastInsertRowid, 'changes:', changes);
      return { lastInsertRowid, changes };
    }
  };
}

export default { prepare };
export { prepare, db };
