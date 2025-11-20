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

  async updateStock(productId, newQuantity, userId, changeType = 'Adjustment') {
    const product = await this.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    const quantityChange = newQuantity - product.quantity;
    
    // Update product quantity
    await this.executeQuery(
      'UPDATE products SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
      [newQuantity, productId]
    );

    // Log stock change
    await this.executeQuery(
      `INSERT INTO stock_logs 
       (product_id, user_id, change_type, quantity_change, previous_quantity, new_quantity, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [productId, userId, changeType, quantityChange, product.quantity, newQuantity]
    );

    return { previousQuantity: product.quantity, newQuantity, quantityChange };
  }

  getPrimaryKey() {
    return 'product_id';
  }
}

module.exports = new ProductModel();