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

/**
 * @swagger
 * /api/admin/backup/create:
 *   post:
 *     tags: [Admin]
 *     summary: Create a backup
 *     description: Create a new backup of the system data
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, incremental, data-only]
 *                 default: full
 *                 description: Type of backup to create
 *                 example: "full"
 *     responses:
 *       200:
 *         description: Backup created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid backup type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Backup creation failed
 */
router.post('/backup/create', BackupController.createBackup);

/**
 * @swagger
 * /api/admin/backup/list:
 *   get:
 *     tags: [Admin]
 *     summary: List all backups
 *     description: Retrieve a list of all available backups
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: Backup list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 backups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                         example: "backup_2023-12-24_12-30-45.json"
 *                       size:
 *                         type: integer
 *                         description: File size in bytes
 *                         example: 1024000
 *                       created:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Authentication required
 */
router.get('/backup/list', BackupController.listBackups);

/**
 * @swagger
 * /api/admin/backup/restore:
 *   post:
 *     tags: [Admin]
 *     summary: Restore from backup
 *     description: Restore system data from a backup file
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupPath
 *             properties:
 *               backupPath:
 *                 type: string
 *                 description: Path to the backup file
 *                 example: "backup_2023-12-24_12-30-45.json"
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Test the restore without making changes
 *               skipExisting:
 *                 type: boolean
 *                 default: true
 *                 description: Skip records that already exist
 *     responses:
 *       200:
 *         description: Restore completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request or backup path
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 */
router.post('/backup/restore', BackupController.restoreBackup);

/**
 * @swagger
 * /api/admin/backup/export-sql:
 *   post:
 *     tags: [Admin]
 *     summary: Export to SQL dump
 *     description: Export system data to SQL dump format
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: SQL export completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Export failed
 */
router.post('/backup/export-sql', BackupController.exportToSql);

/**
 * @swagger
 * /api/admin/cache/clear:
 *   post:
 *     tags: [Admin]
 *     summary: Clear cache
 *     description: Clear cache entries by type or business ID
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [responses, embeddings, searches]
 *                 description: Type of cache to clear
 *                 example: "responses"
 *               businessId:
 *                 type: string
 *                 description: Clear cache for specific business
 *                 example: "restaurant_1234"
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid cache type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 */
router.post('/cache/clear', CacheController.clearCache);

/**
 * @swagger
 * /api/admin/cache/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get cache statistics
 *     description: Retrieve cache usage statistics
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     responses:
 *                       type: object
 *                       properties:
 *                         size:
 *                           type: integer
 *                           example: 150
 *                         hitRate:
 *                           type: number
 *                           example: 0.85
 *                     embeddings:
 *                       type: object
 *                       properties:
 *                         size:
 *                           type: integer
 *                           example: 300
 *                     searches:
 *                       type: object
 *                       properties:
 *                         size:
 *                           type: integer
 *                           example: 75
 *       401:
 *         description: Authentication required
 */
router.get('/cache/stats', CacheController.getCacheStats);

/**
 * @swagger
 * /api/admin/cache/inspect:
 *   get:
 *     tags: [Admin]
 *     summary: Inspect cache contents
 *     description: Inspect cache entries for debugging
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [responses, embeddings, searches]
 *         description: Type of cache to inspect
 *     responses:
 *       200:
 *         description: Cache inspection completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 caches:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       size:
 *                         type: integer
 *                       entries:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             key:
 *                               type: string
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                             ttl:
 *                               type: integer
 *                             accessCount:
 *                               type: integer
 *       400:
 *         description: Invalid cache type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 */
router.get('/cache/inspect', CacheController.inspectCache);

module.exports = router;
