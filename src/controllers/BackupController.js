/**
 * Backup Controller
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const backupManager = require('../utils/backup');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../errors/AppError');

class BackupController {
  constructor() {
    this.createBackup = catchAsync(this.createBackup.bind(this));
    this.listBackups = catchAsync(this.listBackups.bind(this));
    this.restoreBackup = catchAsync(this.restoreBackup.bind(this));
    this.exportToSql = catchAsync(this.exportToSql.bind(this));
  }

  async createBackup(req, res) {
    const { type = 'full' } = req.body;

    if (!['full', 'incremental', 'data-only'].includes(type)) {
      throw new ValidationError(
        'Invalid backup type. Must be: full, incremental, or data-only',
        'type',
        type
      );
    }

    const result = await backupManager.createBackup(type);
    res.json(result);
  }

  async listBackups(req, res) {
    const backups = await backupManager.listBackups();
    res.json({ success: true, backups });
  }

  async restoreBackup(req, res) {
    const { backupPath, dryRun = false, skipExisting = true } = req.body;

    if (!backupPath) {
      throw new ValidationError('Backup path is required', 'backupPath');
    }

    const result = await backupManager.restoreBackup(backupPath, { dryRun, skipExisting });
    res.json(result);
  }

  async exportToSql(req, res) {
    const result = await backupManager.exportToSupabaseDump();
    res.json(result);
  }
}

module.exports = new BackupController();
