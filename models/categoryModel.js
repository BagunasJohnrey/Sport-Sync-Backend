const BaseModel = require('./BaseModel');

class CategoryModel extends BaseModel {
  constructor() {
    super('product_categories');
  }

  async getCategoriesWithProductCount() {
    const query = `
      SELECT pc.*, COUNT(p.product_id) as product_count 
      FROM product_categories pc 
      LEFT JOIN products p ON pc.category_id = p.category_id 
      GROUP BY pc.category_id
    `;
    return this.executeQuery(query);
  }

  getPrimaryKey() {
    return 'category_id';
  }
}

module.exports = new CategoryModel();