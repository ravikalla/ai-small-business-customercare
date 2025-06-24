/**
 * Admin Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const BackupController = require('../controllers/BackupController');
const CacheController = require('../controllers/CacheController');
const { basicAuth } = require('../middleware/security');

// Apply basic auth to all admin routes
router.use(basicAuth);

// Backup management routes
router.post('/backup/create', BackupController.createBackup);
router.get('/backup/list', BackupController.listBackups);
router.post('/backup/restore', BackupController.restoreBackup);
router.post('/backup/export-sql', BackupController.exportToSql);

// Cache management routes
router.post('/cache/clear', CacheController.clearCache);
router.get('/cache/stats', CacheController.getCacheStats);
router.get('/cache/inspect', CacheController.inspectCache);

module.exports = router;
