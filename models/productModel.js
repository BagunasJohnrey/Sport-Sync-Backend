const BaseModel = require('./BaseModel');

class ProductModel extends BaseModel {
  constructor() {
    super('products');
  }

  // Modified to handle 'search' parameter for name/barcode lookup
  async findAllWithCategory(conditions = {}) {
    let query = `
      SELECT p.*, pc.category_name 
      FROM products p 
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
    `;
    
    const params = [];
    const whereClauses = [];
    
    // Extract 'search' from conditions so it's not treated as a standard column
    const { search, ...filters } = conditions;
    
    //Handle standard exact match filters (e.g., category_id, status)
    if (Object.keys(filters).length > 0) {
      Object.keys(filters).forEach(key => {
        whereClauses.push(`p.${key} = ?`);
        params.push(filters[key]);
      });
    }
    
    // Handle Search Logic (Partial match on product_name OR barcode)
    if (search) {
      whereClauses.push('(p.product_name LIKE ? OR p.barcode LIKE ?)');
      const searchTerm = `%${search}%`; // Wrap with wildcards for partial match
      params.push(searchTerm, searchTerm);
    }
    
    // Construct the final WHERE clause
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    query += ' ORDER BY p.product_name';
    
    return this.executeQuery(query, params);
  }

  async findByBarcode(barcode) {
    const results = await this.executeQuery(
      'SELECT p.*, pc.category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE p.barcode = ?',
      [barcode]
    );
    return results[0] || null;
  }

  async getLowStockProducts() {
    const query = `
      SELECT p.*, pc.category_name 
      FROM products p 
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id 
      WHERE p.quantity <= p.reorder_level AND p.status = 'Active'
    `;
    return this.executeQuery(query);
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
      } else {
        // Verify if provided userId exists
        const users = await this.executeQuery(
          'SELECT user_id FROM users WHERE user_id = ?',
          [validUserId]
        );
        if (users.length === 0) {
          // Fallback to any user if specific ID not found
          const fallbackUser = await this.executeQuery(
            'SELECT user_id FROM users LIMIT 1'
          );
          if (fallbackUser.length === 0) {
            throw new Error('No valid user found for stock log');
          }
          validUserId = fallbackUser[0].user_id;
        }
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

  // Updated findAllWithCategory method in ProductModel
  async findAllWithCategory(conditions = {}, sortOption = 'name_asc') {
    let query = 
      `SELECT p.*, pc.category_name 
      FROM products p 
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id`;
    
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

  //  Inventory Report Methods 
async getInventorySummary() {
  const query = `
    SELECT
      COUNT(*) as total_products,
      COALESCE(SUM(quantity * cost_price), 0) as total_inventory_value,
      SUM(CASE WHEN quantity <= reorder_level AND quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products
    WHERE status = 'Active'
  `;
  const result = await this.executeQuery(query);
  return result[0];
}

async getInventoryByCategory() {
  const query = `
    SELECT
      pc.category_name,
      COUNT(p.product_id) as product_count,
      COALESCE(SUM(p.quantity), 0) as total_stock
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.category_id
    WHERE p.status = 'Active'
    GROUP BY pc.category_id
  `;
  return this.executeQuery(query);
}

  getPrimaryKey() {
    return 'product_id';
  }
}

module.exports = new ProductModel();