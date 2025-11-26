const { pool } = require('../db/connection');

class reportGenerator {
  
  // UR 3.2: Helper to calculate profit margin
  calculateProfitMargin(revenue, profit) {
    if (!revenue || revenue <= 0) return 0;
    return parseFloat(((profit / revenue) * 100).toFixed(2));
  }
}

module.exports = new reportGenerator();