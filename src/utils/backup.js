/**
 * Backup and Recovery System
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const database = require('../config/database');
const BusinessModel = require('../models/Business');
const KnowledgeModel = require('../models/Knowledge');

class BackupManager {
    constructor() {
        this.backupDir = path.join(__dirname, '../../backups');
        this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    }

    async createBackup(type = 'full') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup_${type}_${timestamp}.json`);
            
            logger.info(`[BACKUP] Starting ${type} backup...`);
            await fs.mkdir(this.backupDir, { recursive: true });

            const backupData = {
                metadata: {
                    type,
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    source: 'sbc-business-care'
                },
                data: {}
            };

            if (type === 'full' || type === 'businesses') {
                logger.debug('[BACKUP] Backing up business data...');
                backupData.data.businesses = await BusinessModel.getActiveBusinesses();
                logger.info(`[BACKUP] Backed up ${backupData.data.businesses.length} businesses`);
            }

            if (type === 'full' || type === 'knowledge') {
                logger.debug('[BACKUP] Backing up knowledge data...');
                const allBusinesses = await BusinessModel.getActiveBusinesses();
                backupData.data.knowledge = {};
                
                for (const business of allBusinesses) {
                    const businessKnowledge = await KnowledgeModel.findByBusinessId(business.businessId);
                    backupData.data.knowledge[business.businessId] = businessKnowledge;
                }
                
                const totalKnowledge = Object.values(backupData.data.knowledge).reduce((sum, entries) => sum + entries.length, 0);
                logger.info(`[BACKUP] Backed up ${totalKnowledge} knowledge entries`);
            }

            // Write backup file
            await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
            
            const stats = await fs.stat(backupPath);
            logger.success(`[BACKUP] Backup completed: ${backupPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Cleanup old backups
            await this.cleanupOldBackups();
            
            return {
                success: true,
                backupPath,
                size: stats.size,
                recordCount: {
                    businesses: backupData.data.businesses?.length || 0,
                    knowledge: Object.values(backupData.data.knowledge || {}).reduce((sum, entries) => sum + entries.length, 0)
                }
            };

        } catch (error) {
            logger.error('[BACKUP] Backup failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async restoreBackup(backupPath, options = {}) {
        try {
            const { dryRun = false, skipExisting = true } = options;
            
            logger.info(`[RESTORE] Starting restore from: ${backupPath}`);
            
            if (dryRun) {
                logger.info('[RESTORE] DRY RUN MODE - No changes will be made');
            }

            // Read backup file
            const backupContent = await fs.readFile(backupPath, 'utf8');
            const backupData = JSON.parse(backupContent);
            
            logger.info(`[RESTORE] Backup metadata:`, backupData.metadata);
            
            const results = {
                businesses: { created: 0, skipped: 0, errors: 0 },
                knowledge: { created: 0, skipped: 0, errors: 0 }
            };

            // Restore businesses
            if (backupData.data.businesses) {
                logger.info(`[RESTORE] Restoring ${backupData.data.businesses.length} businesses...`);
                
                for (const businessData of backupData.data.businesses) {
                    try {
                        if (!dryRun) {
                            // Check if business already exists
                            const existing = await BusinessModel.findByOwner(businessData.ownerPhone);
                            
                            if (existing && skipExisting) {
                                results.businesses.skipped++;
                                continue;
                            }
                            
                            await BusinessModel.create(businessData);
                        }
                        results.businesses.created++;
                        
                    } catch (error) {
                        logger.error(`[RESTORE] Error restoring business ${businessData.businessId}:`, error);
                        results.businesses.errors++;
                    }
                }
            }

            // Restore knowledge
            if (backupData.data.knowledge) {
                const totalKnowledge = Object.values(backupData.data.knowledge).reduce((sum, entries) => sum + entries.length, 0);
                logger.info(`[RESTORE] Restoring ${totalKnowledge} knowledge entries...`);
                
                for (const [businessId, knowledgeEntries] of Object.entries(backupData.data.knowledge)) {
                    for (const knowledgeData of knowledgeEntries) {
                        try {
                            if (!dryRun) {
                                // Check if knowledge already exists
                                const existing = await KnowledgeModel.findByKnowledgeId(knowledgeData.knowledgeId);
                                
                                if (existing && skipExisting) {
                                    results.knowledge.skipped++;
                                    continue;
                                }
                                
                                await KnowledgeModel.create(knowledgeData);
                            }
                            results.knowledge.created++;
                            
                        } catch (error) {
                            logger.error(`[RESTORE] Error restoring knowledge ${knowledgeData.knowledgeId}:`, error);
                            results.knowledge.errors++;
                        }
                    }
                }
            }

            logger.success(`[RESTORE] Restore completed:`, results);
            
            return {
                success: true,
                results,
                dryRun
            };

        } catch (error) {
            logger.error('[RESTORE] Restore failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async listBackups() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
            
            const backups = [];
            for (const file of backupFiles) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);
                
                // Try to read metadata
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    backups.push({
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        metadata: data.metadata,
                        recordCount: {
                            businesses: data.data.businesses?.length || 0,
                            knowledge: Object.values(data.data.knowledge || {}).reduce((sum, entries) => sum + entries.length, 0)
                        }
                    });
                } catch (error) {
                    // File might be corrupted or incomplete
                    backups.push({
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        status: 'corrupted',
                        error: error.message
                    });
                }
            }
            
            // Sort by creation date (newest first)
            backups.sort((a, b) => new Date(b.created) - new Date(a.created));
            
            return backups;

        } catch (error) {
            logger.error('[BACKUP] Error listing backups:', error);
            return [];
        }
    }

    async cleanupOldBackups() {
        try {
            const backups = await this.listBackups();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
            
            let deletedCount = 0;
            
            for (const backup of backups) {
                if (new Date(backup.created) < cutoffDate && backup.status !== 'corrupted') {
                    try {
                        await fs.unlink(backup.path);
                        deletedCount++;
                        logger.debug(`[BACKUP] Deleted old backup: ${backup.filename}`);
                    } catch (error) {
                        logger.warn(`[BACKUP] Failed to delete old backup ${backup.filename}:`, error);
                    }
                }
            }
            
            if (deletedCount > 0) {
                logger.info(`[BACKUP] Cleaned up ${deletedCount} old backup(s)`);
            }

        } catch (error) {
            logger.error('[BACKUP] Error during cleanup:', error);
        }
    }

    async scheduleBackups() {
        // Create automatic backup every 24 hours
        const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24;
        
        logger.info(`[BACKUP] Scheduling automatic backups every ${backupInterval} hours`);
        
        setInterval(async () => {
            logger.info('[BACKUP] Running scheduled backup...');
            const result = await this.createBackup('full');
            
            if (result.success) {
                logger.success(`[BACKUP] Scheduled backup completed: ${result.recordCount.businesses} businesses, ${result.recordCount.knowledge} knowledge entries`);
            } else {
                logger.error('[BACKUP] Scheduled backup failed:', result.error);
            }
        }, backupInterval * 60 * 60 * 1000); // Convert hours to milliseconds
        
        // Create initial backup
        setTimeout(async () => {
            logger.info('[BACKUP] Creating initial backup...');
            await this.createBackup('full');
        }, 5000); // Wait 5 seconds after startup
    }

    async exportToSupabaseDump() {
        try {
            logger.info('[BACKUP] Creating Supabase-compatible export...');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportPath = path.join(this.backupDir, `supabase_export_${timestamp}.sql`);
            
            // Get all data
            const businesses = await BusinessModel.getActiveBusinesses();
            const allKnowledge = {};
            
            for (const business of businesses) {
                allKnowledge[business.businessId] = await KnowledgeModel.findByBusinessId(business.businessId);
            }
            
            // Generate SQL statements
            let sqlContent = `-- Supabase Export for SBC Business Care System
-- Generated: ${new Date().toISOString()}
-- Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

-- Clear existing data (optional - remove if you want to preserve data)
-- DELETE FROM knowledge_entries;
-- DELETE FROM businesses;

-- Business data
`;

            for (const business of businesses) {
                const values = [
                    `'${business.businessId}'`,
                    `'${business.businessName.replace(/'/g, "''")}'`,
                    `'${business.ownerPhone}'`,
                    `'${business.registeredAt}'`,
                    business.knowledgeCount,
                    `'${business.status}'`,
                    `'${business.lastActivity}'`,
                    `'${JSON.stringify(business.metadata).replace(/'/g, "''")}'`
                ];
                
                sqlContent += `INSERT INTO businesses (business_id, business_name, owner_phone, registered_at, knowledge_count, status, last_activity, metadata) VALUES (${values.join(', ')});\n`;
            }
            
            sqlContent += '\n-- Knowledge data\n';
            
            for (const [businessId, knowledgeEntries] of Object.entries(allKnowledge)) {
                for (const knowledge of knowledgeEntries) {
                    const values = [
                        `'${knowledge.knowledgeId}'`,
                        `'${knowledge.businessId}'`,
                        `'${knowledge.businessName.replace(/'/g, "''")}'`,
                        `'${knowledge.type}'`,
                        knowledge.filename ? `'${knowledge.filename.replace(/'/g, "''")}'` : 'NULL',
                        knowledge.fileType ? `'${knowledge.fileType}'` : 'NULL',
                        knowledge.contentPreview ? `'${knowledge.contentPreview.replace(/'/g, "''")}'` : 'NULL',
                        `'${JSON.stringify(knowledge.metadata).replace(/'/g, "''")}'`
                    ];
                    
                    sqlContent += `INSERT INTO knowledge_entries (knowledge_id, business_id, business_name, type, filename, file_type, content_preview, metadata) VALUES (${values.join(', ')});\n`;
                }
            }
            
            await fs.writeFile(exportPath, sqlContent);
            
            const stats = await fs.stat(exportPath);
            logger.success(`[BACKUP] Supabase export created: ${exportPath} (${(stats.size / 1024).toFixed(2)} KB)`);
            
            return {
                success: true,
                exportPath,
                size: stats.size
            };

        } catch (error) {
            logger.error('[BACKUP] Supabase export failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new BackupManager();