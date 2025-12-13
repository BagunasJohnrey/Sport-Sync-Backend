const BaseModel = require('./BaseModel');

class AutomatedReportModel extends BaseModel {
  constructor() {
    super('automated_reports_schedule');
  }

  // Find reports that are active and due for execution
  async findDueReports() {
    return this.executeQuery(
      `SELECT * FROM automated_reports_schedule 
        WHERE is_active = 1 
        AND next_run <= NOW()`
    );
  }

  // Update timestamps after a run
  async updateSchedule(id, nextRunDate) {
    return this.executeQuery(
      `UPDATE automated_reports_schedule 
        SET last_generated = NOW(), next_run = ? 
        WHERE schedule_id = ?`,
      [nextRunDate, id]
    );
  }
}

module.exports = new AutomatedReportModel();