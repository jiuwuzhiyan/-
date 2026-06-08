import { prepare, getDatabase } from '../database';
import ExcelJS from 'exceljs';
import { Response } from 'express';

export async function exportToExcel(res: Response, filters?: { platform?: string; district?: string }) {
  const db = getDatabase();
  const workbook = new ExcelJS.Workbook();
  
  const shopsSheet = workbook.addWorksheet('店铺信息');
  shopsSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: '平台', key: 'platform', width: 15 },
    { header: '店铺名称', key: 'shopName', width: 30 },
    { header: '地址', key: 'address', width: 40 },
    { header: '评分', key: 'rating', width: 10 },
    { header: '销量', key: 'sales', width: 10 },
    { header: '商圈', key: 'district', width: 20 },
    { header: '创建时间', key: 'createdAt', width: 25 }
  ];

  let query = 'SELECT * FROM shops';
  const params: any[] = [];
  
  if (filters?.platform && filters?.district) {
    query += ' WHERE platform = ? AND district = ?';
    params.push(filters.platform, filters.district);
  } else if (filters?.platform) {
    query += ' WHERE platform = ?';
    params.push(filters.platform);
  } else if (filters?.district) {
    query += ' WHERE district = ?';
    params.push(filters.district);
  }
  
  const shops = prepare(query + ' ORDER BY id').all(...params);
  (shops as any[]).forEach((shop: any) => {
    shopsSheet.addRow({
      id: shop.id,
      platform: shop.platform === 'douyin' ? '抖音' : '美团',
      shopName: shop.shop_name,
      address: shop.address,
      rating: shop.rating,
      sales: shop.sales,
      district: shop.district,
      createdAt: shop.created_at
    });
  });

  const packagesSheet = workbook.addWorksheet('套餐信息');
  packagesSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: '店铺ID', key: 'shopId', width: 10 },
    { header: '套餐名称', key: 'packageName', width: 30 },
    { header: '描述', key: 'description', width: 40 },
    { header: '价格', key: 'price', width: 15 },
    { header: '原价', key: 'originalPrice', width: 15 },
    { header: '销量', key: 'sales', width: 10 }
  ];

  const packages = prepare('SELECT * FROM packages').all();
  (packages as any[]).forEach((pkg: any) => {
    packagesSheet.addRow({
      id: pkg.id,
      shopId: pkg.shop_id,
      packageName: pkg.package_name,
      description: pkg.description,
      price: pkg.price,
      originalPrice: pkg.original_price,
      sales: pkg.sales
    });
  });

  const reviewsSheet = workbook.addWorksheet('用户评价');
  reviewsSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: '店铺ID', key: 'shopId', width: 10 },
    { header: '用户名', key: 'userName', width: 20 },
    { header: '评分', key: 'rating', width: 10 },
    { header: '内容', key: 'content', width: 50 },
    { header: '评价时间', key: 'reviewTime', width: 25 }
  ];

  const reviews = prepare('SELECT * FROM reviews').all();
  (reviews as any[]).forEach((review: any) => {
    reviewsSheet.addRow({
      id: review.id,
      shopId: review.shop_id,
      userName: review.user_name,
      rating: review.rating,
      content: review.content,
      reviewTime: review.review_time
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=' + encodeURIComponent('团购数据.xlsx')
  );
  
  await workbook.xlsx.write(res);
  res.end();
}

export async function exportToCSV(res: Response, filters?: { platform?: string; district?: string }) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM shops';
  const params: any[] = [];
  
  if (filters?.platform && filters?.district) {
    query += ' WHERE platform = ? AND district = ?';
    params.push(filters.platform, filters.district);
  } else if (filters?.platform) {
    query += ' WHERE platform = ?';
    params.push(filters.platform);
  } else if (filters?.district) {
    query += ' WHERE district = ?';
    params.push(filters.district);
  }
  
  const shops = prepare(query + ' ORDER BY id').all(...params);
  const packages = prepare('SELECT * FROM packages').all();
  const reviews = prepare('SELECT * FROM reviews').all();
  
  const headers = ['店铺ID', '平台', '店铺名称', '地址', '评分', '销量', '商圈', '套餐名称', '价格', '原价', '评价用户', '评价内容', '评价评分'];
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('团购数据.csv'));
  
  res.write('\uFEFF');
  res.write(headers.join(',') + '\n');
  
  (shops as any[]).forEach((shop: any) => {
    const shopPackages = (packages as any[]).filter(p => p.shop_id === shop.id);
    const shopReviews = (reviews as any[]).filter(r => r.shop_id === shop.id);
    
    if (shopPackages.length === 0 && shopReviews.length === 0) {
      const values = [
        shop.id,
        shop.platform === 'douyin' ? '抖音' : '美团',
        `"${shop.shop_name}"`,
        `"${shop.address || ''}"`,
        shop.rating,
        shop.sales,
        shop.district,
        '', '', '', '', '', ''
      ];
      res.write(values.join(',') + '\n');
    } else {
      const maxCount = Math.max(shopPackages.length, shopReviews.length);
      for (let i = 0; i < maxCount; i++) {
        const pkg = shopPackages[i];
        const review = shopReviews[i];
        const values = [
          shop.id,
          shop.platform === 'douyin' ? '抖音' : '美团',
          `"${shop.shop_name}"`,
          `"${shop.address || ''}"`,
          shop.rating,
          shop.sales,
          shop.district,
          pkg ? `"${pkg.package_name || ''}"` : '',
          pkg ? pkg.price : '',
          pkg ? pkg.original_price : '',
          review ? `"${review.user_name || ''}"` : '',
          review ? `"${review.content || ''}"` : '',
          review ? review.rating : ''
        ];
        res.write(values.join(',') + '\n');
      }
    }
  });
  
  res.end();
}

export async function exportToJSON(res: Response, filters?: { platform?: string; district?: string }) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM shops';
  const params: any[] = [];
  
  if (filters?.platform && filters?.district) {
    query += ' WHERE platform = ? AND district = ?';
    params.push(filters.platform, filters.district);
  } else if (filters?.platform) {
    query += ' WHERE platform = ?';
    params.push(filters.platform);
  } else if (filters?.district) {
    query += ' WHERE district = ?';
    params.push(filters.district);
  }
  
  const shops = prepare(query + ' ORDER BY id').all(...params);
  const packages = prepare('SELECT * FROM packages').all();
  const reviews = prepare('SELECT * FROM reviews').all();
  
  const result = (shops as any[]).map(shop => ({
    ...shop,
    packages: (packages as any[]).filter(p => p.shop_id === shop.id),
    reviews: (reviews as any[]).filter(r => r.shop_id === shop.id)
  }));
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('团购数据.json'));
  
  res.json(result);
}
