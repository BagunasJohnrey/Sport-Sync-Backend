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

  async getLowStockProducts(threshold = null) {
    let query;
    let params = [];

    if (threshold !== null) {
      // Use Global Setting (Removed 'AND p.quantity > 0' to include Out of Stock)
      query = `
        SELECT p.*, pc.category_name 
        FROM products p 
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id 
        WHERE p.quantity <= ? AND p.status = 'Active'
      `;
      params.push(threshold);
    } else {
      // Fallback (Removed 'AND p.quantity > 0')
      query = `
        SELECT p.*, pc.category_name 
        FROM products p 
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id 
        WHERE p.quantity <= p.reorder_level AND p.status = 'Active'
      `;
    }
    return this.executeQuery(query, params);
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

  // Inventory Report Methods 
  async getInventorySummary(threshold = null) {
    let lowStockExpression;
    let params = [];

    if (threshold !== null) {
        lowStockExpression = `CASE WHEN quantity <= ? AND quantity > 0 THEN 1 ELSE 0 END`;
        params.push(threshold);
    } else {
        lowStockExpression = `CASE WHEN quantity <= reorder_level AND quantity > 0 THEN 1 ELSE 0 END`;
    }

    const query = `
      SELECT
        COUNT(*) as total_products,
        COALESCE(SUM(quantity * cost_price), 0) as total_inventory_value,
        SUM(${lowStockExpression}) as low_stock_count,
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM products
      WHERE status = 'Active'
    `;
    const result = await this.executeQuery(query, params);
    return result[0];
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

  // Add this method to the ProductModel class
  async getProductProfitability() {
    const query = `
      SELECT 
        p.product_id,
        p.product_name,
        pc.category_name,
        p.cost_price,
        p.selling_price,
        (p.selling_price - p.cost_price) as gross_profit,
        CASE 
          WHEN p.selling_price > 0 THEN ((p.selling_price - p.cost_price) / p.selling_price) * 100
          ELSE 0 
        END as margin_percent
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      WHERE p.status = 'Active'
      ORDER BY margin_percent DESC
    `;
    return this.executeQuery(query);
  }

  getPrimaryKey() {
    return 'product_id';
  }
}

module.exports = new ProductModel();