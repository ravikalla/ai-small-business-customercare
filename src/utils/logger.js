/**
 * Production Logger Utility with CloudWatch Support
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

class Logger {
    static formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        return `${timestamp} [${level}] ${message}${formattedArgs}`;
    }

    static writeToFile(logMessage) {
        if (isProduction) {
            try {
                fs.appendFileSync(logFile, logMessage + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }

    static info(message, ...args) {
        const logMessage = this.formatMessage('INFO', message, ...args);
        console.log(logMessage);
        this.writeToFile(logMessage);
    }

    static error(message, ...args) {
        const logMessage = this.formatMessage('ERROR', message, ...args);
        console.error(logMessage);
        this.writeToFile(logMessage);
    }

    static warn(message, ...args) {
        const logMessage = this.formatMessage('WARN', message, ...args);
        console.warn(logMessage);
        this.writeToFile(logMessage);
    }

    static debug(message, ...args) {
        if (!isProduction) {
            const logMessage = this.formatMessage('DEBUG', message, ...args);
            console.log(logMessage);
        }
    }

    static success(message, ...args) {
        const logMessage = this.formatMessage('SUCCESS', message, ...args);
        console.log(logMessage);
        this.writeToFile(logMessage);
    }

    static webhook(message, ...args) {
        const logMessage = this.formatMessage('WEBHOOK', message, ...args);
        console.log(logMessage);
        this.writeToFile(logMessage);
    }

    static ai(message, ...args) {
        const logMessage = this.formatMessage('AI', message, ...args);
        console.log(logMessage);
        this.writeToFile(logMessage);
    }

    static twilio(message, ...args) {
        const logMessage = this.formatMessage('TWILIO', message, ...args);
        console.log(logMessage);
        this.writeToFile(logMessage);
    }
}

module.exports = Logger;