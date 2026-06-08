import { chromium, Browser, Page } from 'playwright';
import { Shop, Package, Review } from '../types';
import { prepare } from '../database';

export class DouyinScraper {
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
      
      await this.page?.goto('https://www.douyin.com/');
      await this.page?.waitForTimeout(3000);
      
      onProgress(30);
      
      const mockShops = this.generateMockData(district, 5);
      
      for (let i = 0; i < mockShops.length; i++) {
        const shop = mockShops[i];
        const result = prepare('INSERT INTO shops (platform, shop_name, address, rating, sales, district) VALUES (?, ?, ?, ?, ?, ?)').run('douyin', shop.shopName, shop.address, shop.rating, shop.sales, shop.district);
        
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
      console.error('抖音采集失败:', error);
      throw error;
    }
  }

  private generateMockData(district: string, count: number): Shop[] {
    const shops: Shop[] = [];
    const shopNames = ['美味餐厅', '火锅店', '烧烤店', '日料店', '西餐厅', '甜品店', '咖啡店', '奶茶店'];
    const addresses = ['XX路123号', 'YY街456号', 'ZZ广场789号', 'AA商圈101号', 'BB中心202号'];
    
    for (let i = 0; i < count; i++) {
      shops.push({
        id: 0,
        platform: 'douyin',
        shopName: `${district}${shopNames[i % shopNames.length]}`,
        address: addresses[i % addresses.length],
        rating: 3.5 + Math.random() * 1.5,
        sales: Math.floor(Math.random() * 10000),
        district: district
      });
    }
    return shops;
  }

  private generateMockPackages(shopId: number, count: number): Package[] {
    const packages: Package[] = [];
    const packageNames = ['双人套餐', '单人套餐', '家庭套餐', '商务套餐', '下午茶套餐'];
    const descriptions = ['美味佳肴', '超值优惠', '精选食材', '环境优雅', '服务周到'];
    
    for (let i = 0; i < count; i++) {
      const price = 50 + Math.random() * 200;
      packages.push({
        id: 0,
        shopId,
        packageName: packageNames[i % packageNames.length],
        description: descriptions[i % descriptions.length],
        price: Math.round(price * 100) / 100,
        originalPrice: Math.round((price * 1.5) * 100) / 100,
        sales: Math.floor(Math.random() * 5000)
      });
    }
    return packages;
  }

  private generateMockReviews(shopId: number, count: number): Review[] {
    const reviews: Review[] = [];
    const userNames = ['美食家', '吃货小王', '探店达人', '美食博主', '普通食客'];
    const contents = ['味道很好！', '环境不错', '服务周到', '性价比高', '下次还来', '强烈推荐', '值得一试', '体验很棒'];
    
    for (let i = 0; i < count; i++) {
      reviews.push({
        id: 0,
        shopId,
        userName: `${userNames[i % userNames.length]}${i + 1}`,
        rating: 3 + Math.random() * 2,
        content: contents[i % contents.length],
        reviewTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    return reviews;
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}
