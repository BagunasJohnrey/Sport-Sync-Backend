const BaseModel = require('./BaseModel');

class ProductModel extends BaseModel {
  constructor() {
    super('products');
  }

  // Modified to handle 'search' parameter for name/barcode lookup and sorting
  async findAllWithCategory(conditions = {}, sortOption = 'name_asc') {
    let query = `
      SELECT p.*, pc.category_name 
      FROM products p 
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
    `;
    
    const params = [];
    const whereClauses = [];
    
    // Extract special keys
    const { search, ...filters } = conditions;
    
    // Standard Filters (Category, Status)
    if (Object.keys(filters).length > 0) {
      Object.keys(filters).forEach(key => {
        whereClauses.push(`p.${key} = ?`);
        params.push(filters[key]);
      });
    }
    
    // Search Logic (Name, Barcode, OR Category Name)
    if (search) {
      whereClauses.push('(p.product_name LIKE ? OR p.barcode LIKE ? OR pc.category_name LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    // Dynamic Sorting
    const sortMap = {
      'price_asc': 'p.selling_price ASC',
      'price_desc': 'p.selling_price DESC',
      'newest': 'p.date_added DESC',
      'name_asc': 'p.product_name ASC',
      'name_desc': 'p.product_name DESC'
    };

    const orderBy = sortMap[sortOption] || 'p.product_name ASC';
    query += ` ORDER BY ${orderBy}`;
    
    return this.executeQuery(query, params);
  }

  async findByBarcode(barcode) {
    const results = await this.executeQuery(
      'SELECT p.*, pc.category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE p.barcode = ?',
      [barcode]
    );
    return results[0] || null;
  }

  /**
   * Get products requiring attention.
   * - Includes Out of Stock (0), Critical (<= criticalThreshold), and Low (> critical && <= low).
   * - Adds a stock_level field: 'out_of_stock', 'critical', or 'low'
   */
  async getLowStockProducts(criticalThreshold = 10, lowThreshold = 20) {
    const query = `
      SELECT p.*, pc.category_name,
        CASE
          WHEN p.quantity = 0 THEN 'out_of_stock'
          WHEN p.quantity <= ? THEN 'critical'
          WHEN p.quantity > ? AND p.quantity <= ? THEN 'low'
          ELSE 'normal'
        END AS stock_level
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      WHERE p.quantity <= ?  -- Removed "p.quantity > 0" to include Out of Stock items
        AND p.status = 'Active'
      ORDER BY p.quantity ASC
    `;

    // params: 
    // 1. criticalThreshold (CASE: critical)
    // 2. criticalThreshold (CASE: low start)
    // 3. lowThreshold (CASE: low end)
    // 4. lowThreshold (WHERE clause)
    const params = [criticalThreshold, criticalThreshold, lowThreshold, lowThreshold];

    const results = await this.executeQuery(query, params);

    console.log(`📦 getLowStockProducts - critical=${criticalThreshold}, low=${lowThreshold}, found=${results.length}`);
    return results;
  }

  async updateStock(productId, newQuantity, userId = null, changeType = 'Adjustment') {
    try {
      const products = await this.executeQuery(
        'SELECT * FROM products WHERE product_id = ?',
        [productId]
      );
      const product = products[0];

      if (!product) {
        throw new Error('Product not found');
      }

      let validUserId = userId;

      if (!validUserId) {
        // Pick any existing user from users table as fallback
        const users = await this.executeQuery(
          'SELECT user_id FROM users LIMIT 1'
        );
        if (users.length === 0) {
          throw new Error('No valid user found for stock log');
        }
        validUserId = users[0].user_id;
      }

      const quantityChange = newQuantity - product.quantity;

      await this.executeQuery(
        'UPDATE products SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
        [newQuantity, productId]
      );

      await this.executeQuery(
        `INSERT INTO stock_logs 
         (product_id, user_id, change_type, quantity_change, previous_quantity, new_quantity, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [productId, validUserId, changeType, quantityChange, product.quantity, newQuantity]
      );

      return { previousQuantity: product.quantity, newQuantity, quantityChange, userId: validUserId };

    } catch (error) {
      console.error('[updateStock Error]', error.message);
      throw error;
    }
  }


  async getInventorySummary(criticalThreshold = 10, lowThreshold = 20) {
    // FIX: Removed "WHERE status = 'Active'" from the main clause so total_products counts everything.
    // Added "CASE WHEN status = 'Active'" to specific metrics so Archived items don't trigger alerts or add to value.
    const query = `
      SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN status = 'Active' AND quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
        SUM(CASE WHEN status = 'Active' AND quantity > 0 AND quantity <= ? THEN 1 ELSE 0 END) AS critical_stock_count,
        SUM(CASE WHEN status = 'Active' AND quantity > ? AND quantity <= ? THEN 1 ELSE 0 END) AS low_stock_count,
        COALESCE(SUM(CASE WHEN status = 'Active' THEN cost_price * quantity ELSE 0 END), 0) AS total_inventory_value
      FROM products;
    `;
    // params: criticalThreshold (for critical), criticalThreshold (lower bound for low), lowThreshold (upper bound for low)
    const params = [criticalThreshold, criticalThreshold, lowThreshold];
    const result = await this.executeQuery(query, params);
    return result[0] || {
      total_products: 0,
      out_of_stock_count: 0,
      critical_stock_count: 0,
      low_stock_count: 0,
      total_inventory_value: 0
    };
  }

  // UPDATED: Now includes total value and low stock counts per category
  async getInventoryByCategory() {
    const query = `
      SELECT
        pc.category_name,
        COUNT(p.product_id) as product_count,
        COALESCE(SUM(p.quantity), 0) as total_stock,
        COALESCE(SUM(p.quantity * p.cost_price), 0) as total_value,
        SUM(CASE WHEN p.quantity <= p.reorder_level THEN 1 ELSE 0 END) as low_stock_count
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      WHERE p.status = 'Active'
      GROUP BY pc.category_id
    `;
    return this.executeQuery(query);
  }

async getProductProfitability(startDate, endDate) {
    // Default start date if missing
    const start = startDate || '2000-01-01';

    let end = endDate || new Date().toISOString().split('T')[0];
    if (end.length === 10) {
        end += ' 23:59:59'; 
    }

    const query = `
      SELECT 
        p.product_id,
        p.product_name,
        pc.category_name,
        p.cost_price,
        p.selling_price,

        -- 1. Total Quantity Sold
        COALESCE(SUM(ti.quantity), 0) as total_quantity_sold,
        
        -- 2. Total Revenue
        COALESCE(SUM(ti.total_price), 0) as total_revenue,

        -- 3. Gross Profit
        COALESCE(SUM(ti.total_price) - (SUM(ti.quantity) * p.cost_price), 0) as gross_profit,

        -- 4. Margin %
        CASE 
          WHEN SUM(ti.total_price) > 0 THEN 
            ((SUM(ti.total_price) - (SUM(ti.quantity) * p.cost_price)) / SUM(ti.total_price)) * 100
          ELSE 0 
        END as margin_percent

      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      INNER JOIN transaction_items ti ON p.product_id = ti.product_id
      INNER JOIN transactions t ON ti.transaction_id = t.transaction_id

      -- The Filter
      WHERE t.transaction_date >= ? 
      AND t.transaction_date <= ? 
      AND t.status = 'Completed'

      GROUP BY p.product_id, p.product_name, pc.category_name, p.cost_price, p.selling_price
      ORDER BY gross_profit DESC
    `;

    return this.executeQuery(query, [start, end]);
  }

  getPrimaryKey() {
    return 'product_id';
  }
}

module.exports = new ProductModel();