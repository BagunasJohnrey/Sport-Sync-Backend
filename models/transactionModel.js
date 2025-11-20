const BaseModel = require('./BaseModel');

class TransactionModel extends BaseModel {
  constructor() {
    super('transactions');
  }

  async createTransaction(transactionData, items) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert transaction
      const [transactionResult] = await connection.execute(
        `INSERT INTO transactions 
         (user_id, transaction_date, payment_method, total_amount, amount_paid, change_due, status, remarks) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionData.user_id,
          new Date(),
          transactionData.payment_method,
          transactionData.total_amount,
          transactionData.amount_paid,
          transactionData.change_due,
          transactionData.status || 'Completed',
          transactionData.remarks || null
        ]
      );

      const transactionId = transactionResult.insertId;

      // Insert transaction items and update product quantities
      for (const item of items) {
        // Insert transaction item
        await connection.execute(
          `INSERT INTO transaction_items 
           (transaction_id, product_id, quantity, unit_price, total_price) 
           VALUES (?, ?, ?, ?, ?)`,
          [transactionId, item.product_id, item.quantity, item.unit_price, item.total_price]
        );

        // Update product quantity
        await connection.execute(
          'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );

        // Log stock change
        const productResult = await connection.execute(
          'SELECT quantity FROM products WHERE product_id = ?',
          [item.product_id]
        );

        const product = productResult[0][0];

        await connection.execute(
          `INSERT INTO stock_logs 
           (product_id, user_id, change_type, quantity_change, previous_quantity, new_quantity, timestamp) 
           VALUES (?, ?, 'Sale', ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            item.product_id,
            transactionData.user_id,
            -item.quantity,
            product.quantity + item.quantity, // Previous quantity
            product.quantity // New quantity
          ]
        );
      }

      await connection.commit();
      return transactionId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getTransactionWithItems(transactionId) {
    const transactions = await this.executeQuery(
      `SELECT t.*, u.full_name as cashier_name 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.user_id 
       WHERE t.transaction_id = ?`,
      [transactionId]
    );

    if (transactions.length === 0) {
      return null;
    }

    const items = await this.executeQuery(
      `SELECT ti.*, p.product_name, p.barcode 
       FROM transaction_items ti 
       LEFT JOIN products p ON ti.product_id = p.product_id 
       WHERE ti.transaction_id = ?`,
      [transactionId]
    );

    return {
      ...transactions[0],
      items
    };
  }

  async getTransactionsByDateRange(startDate, endDate) {
    const query = `
      SELECT t.*, u.full_name as cashier_name 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.user_id 
      WHERE t.transaction_date BETWEEN ? AND ? 
      ORDER BY t.transaction_date DESC
    `;
    return this.executeQuery(query, [startDate, endDate]);
  }

  getPrimaryKey() {
    return 'transaction_id';
  }
}

module.exports = new TransactionModel();