import { chromium, Browser, Page } from 'playwright';
import { Shop, Package, Review } from '../types';
import { prepare } from '../database';

export class MeituanScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(60000);
  }

  async scrape(district: string, onProgress: (progress: number) => void): Promise<Shop[]> {
    const shops: Shop[] = [];
    
    try {
      onProgress(10);
      
      await this.page?.goto('https://www.meituan.com/');
      await this.page?.waitForTimeout(3000);
      
      onProgress(30);
      
      const mockShops = this.generateMockData(district, 5);
      
      for (let i = 0; i < mockShops.length; i++) {
        const shop = mockShops[i];
        const result = prepare('INSERT INTO shops (platform, shop_name, address, rating, sales, district) VALUES (?, ?, ?, ?, ?, ?)').run('meituan', shop.shopName, shop.address, shop.rating, shop.sales, shop.district);
        
        const shopId = result.lastInsertRowid as number;
        
        const packages = this.generateMockPackages(shopId, 3);
        for (const pkg of packages) {
          prepare('INSERT INTO packages (shop_id, package_name, description, price, original_price, sales) VALUES (?, ?, ?, ?, ?, ?)').run(pkg.shopId, pkg.packageName, pkg.description, pkg.price, pkg.originalPrice, pkg.sales);
        }
        
        const reviews = this.generateMockReviews(shopId, 10);
        for (const review of reviews) {
          prepare('INSERT INTO reviews (shop_id, user_name, rating, content, review_time) VALUES (?, ?, ?, ?, ?)').run(review.shopId, review.userName, review.rating, review.content, review.reviewTime);
        }
        
        shop.id = shopId;
        shops.push(shop);
        onProgress(30 + (i + 1) * 14);
      }
      
      onProgress(100);
      return shops;
    } catch (error) {
      console.error('美团采集失败:', error);
      throw error;
    }
  }

  private generateMockData(district: string, count: number): Shop[] {
    const shops: Shop[] = [];
    const shopNames = ['人气餐厅', '特色火锅店', '网红烧烤', '精致日料', '高端西餐', '甜蜜甜品', '精品咖啡', '网红奶茶'];
    const addresses = ['XX大道123号', 'YY巷456号', 'ZZ广场789号', 'AA商场101号', 'BB中心202号'];
    
    for (let i = 0; i < count; i++) {
      shops.push({
        id: 0,
        platform: 'meituan',
        shopName: `${district}${shopNames[i % shopNames.length]}`,
        address: addresses[i % addresses.length],
        rating: 3.8 + Math.random() * 1.2,
        sales: Math.floor(Math.random() * 15000),
        district: district
      });
    }
    return shops;
  }

  private generateMockPackages(shopId: number, count: number): Package[] {
    const packages: Package[] = [];
    const packageNames = ['豪华双人餐', '精品单人餐', '欢乐家庭餐', '商务聚餐', '精致下午茶'];
    const descriptions = ['精选美味', '限时优惠', '新鲜食材', '品质保证', '贴心服务'];
    
    for (let i = 0; i < count; i++) {
      const price = 60 + Math.random() * 250;
      packages.push({
        id: 0,
        shopId,
        packageName: packageNames[i % packageNames.length],
        description: descriptions[i % descriptions.length],
        price: Math.round(price * 100) / 100,
        originalPrice: Math.round((price * 1.6) * 100) / 100,
        sales: Math.floor(Math.random() * 6000)
      });
    }
    return packages;
  }

  private generateMockReviews(shopId: number, count: number): Review[] {
    const reviews: Review[] = [];
    const userNames = ['美食达人', '探店小王', '美食博主', '资深吃货', '普通顾客'];
    const contents = ['非常满意！', '环境很好', '服务热情', '价格实惠', '还会再来', '真心推荐', '很不错', '体验极佳'];
    
    for (let i = 0; i < count; i++) {
      reviews.push({
        id: 0,
        shopId,
        userName: `${userNames[i % userNames.length]}${i + 1}`,
        rating: 3.5 + Math.random() * 1.5,
        content: contents[i % contents.length],
        reviewTime: new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    return reviews;
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}
