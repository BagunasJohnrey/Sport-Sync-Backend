const BaseModel = require('./BaseModel');

class ProductModel extends BaseModel {
  constructor() {
    super('products');
  }

  async findAllWithCategory(conditions = {}) {
    let query = `
      SELECT p.*, pc.category_name 
      FROM products p 
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
    `;
    
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `p.${key} = ?`).join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
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
      // Pick any existing user from users table
      const users = await this.executeQuery(
        'SELECT user_id FROM users LIMIT 1'
      );
      if (users.length === 0) {
        throw new Error('No valid user found for stock log');
      }
      validUserId = users[0].user_id;
    } else {
      // Check if provided userId exists
      const users = await this.executeQuery(
        'SELECT user_id FROM users WHERE user_id = ?',
        [validUserId]
      );
      if (users.length === 0) {
        // Fallback to any user in database
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


  getPrimaryKey() {
    return 'product_id';
  }
}

module.exports = new ProductModel();