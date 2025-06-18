/**
 * WhatsApp Bot Module
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const aiService = require('../services/aiService');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('WhatsApp QR Code:');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('WhatsApp client is ready!');
        });

        this.client.on('message_create', async (message) => {
            if (message.fromMe) return;

            try {
                const contact = await message.getContact();
                const chat = await message.getChat();
                
                console.log(`Message from ${contact.name || contact.number}: ${message.body}`);

                if (message.body.toLowerCase().startsWith('!business')) {
                    const businessId = this.extractBusinessId(message.body);
                    if (businessId) {
                        await this.handleBusinessQuery(message, businessId);
                    } else {
                        await message.reply('Please provide a valid business ID. Format: !business [ID] [your question]');
                    }
                }
            } catch (error) {
                console.error('Error handling message:', error);
                await message.reply('Sorry, I encountered an error processing your message.');
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp client disconnected:', reason);
        });
    }

    extractBusinessId(messageBody) {
        const parts = messageBody.split(' ');
        if (parts.length >= 3) {
            return parts[1];
        }
        return null;
    }

    async handleBusinessQuery(message, businessId) {
        try {
            const query = message.body.split(' ').slice(2).join(' ');
            if (!query.trim()) {
                await message.reply('Please provide a question. Format: !business [ID] [your question]');
                return;
            }

            await message.reply('🤔 Let me search our knowledge base...');

            const response = await aiService.generateResponse(query, businessId);
            await message.reply(response);

        } catch (error) {
            console.error('Error handling business query:', error);
            await message.reply('Sorry, I couldn\'t find information about that. Please try rephrasing your question.');
        }
    }

    async initialize() {
        try {
            await this.client.initialize();
        } catch (error) {
            console.error('Failed to initialize WhatsApp client:', error);
        }
    }

    async sendMessage(number, message) {
        try {
            const chatId = number + '@c.us';
            await this.client.sendMessage(chatId, message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
}

const whatsappBot = new WhatsAppBot();

module.exports = {
    initialize: () => whatsappBot.initialize(),
    sendMessage: (number, message) => whatsappBot.sendMessage(number, message)
};