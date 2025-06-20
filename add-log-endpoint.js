// Add this to your src/index.js file for web-based log viewing
// Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

// Add after your existing routes, before app.listen()

const fs = require('fs');
const path = require('path');

// Web-based log viewer endpoint
app.get('/api/logs', async (req, res) => {
    try {
        const { lines = 100, filter = '', level = 'all' } = req.query;
        
        // Get PM2 logs via command execution
        const { exec } = require('child_process');
        
        exec(`pm2 logs sbc-system --lines ${lines} --raw`, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to fetch logs' });
            }
            
            let logs = stdout.split('\n');
            
            // Filter by log level
            if (level !== 'all') {
                logs = logs.filter(log => log.includes(level.toUpperCase()));
            }
            
            // Filter by search term
            if (filter) {
                logs = logs.filter(log => log.toLowerCase().includes(filter.toLowerCase()));
            }
            
            res.json({
                success: true,
                logs: logs.slice(-lines),
                total: logs.length,
                filtered: filter ? true : false
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Real-time log streaming endpoint
app.get('/api/logs/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    const { spawn } = require('child_process');
    const pm2Logs = spawn('pm2', ['logs', 'sbc-system', '--timestamp', '--raw']);
    
    pm2Logs.stdout.on('data', (data) => {
        res.write(`data: ${data.toString()}\n\n`);
    });
    
    pm2Logs.stderr.on('data', (data) => {
        res.write(`data: ERROR: ${data.toString()}\n\n`);
    });
    
    req.on('close', () => {
        pm2Logs.kill();
    });
});

// Application metrics endpoint
app.get('/api/metrics', async (req, res) => {
    try {
        const { exec } = require('child_process');
        
        exec('pm2 jlist', (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to fetch metrics' });
            }
            
            const processes = JSON.parse(stdout);
            const sbcProcess = processes.find(p => p.name === 'sbc-system');
            
            if (sbcProcess) {
                res.json({
                    success: true,
                    metrics: {
                        status: sbcProcess.pm2_env.status,
                        uptime: sbcProcess.pm2_env.pm_uptime,
                        restarts: sbcProcess.pm2_env.restart_time,
                        memory: sbcProcess.monit.memory,
                        cpu: sbcProcess.monit.cpu,
                        pid: sbcProcess.pid
                    }
                });
            } else {
                res.status(404).json({ error: 'Process not found' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});