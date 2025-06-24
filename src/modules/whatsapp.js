/**
 * WhatsApp Bot Module
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rateLimiter');
const validator = require('../utils/validator');
const aiService = require('../services/aiService');
const businessService = require('../services/businessService');
const knowledgeService = require('../services/knowledgeService');

class WhatsAppBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('qr', qr => {
      logger.info('WhatsApp QR Code generated');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      logger.success('WhatsApp client is ready!');
      logger.info('Bot is listening for messages...');
    });

    this.client.on('message_create', async message => {
      logger.debug(
        `[FLOW] Message received: "${message.body?.substring(0, 50)}..." fromMe: ${message.fromMe}`


      // For testing purposes, allow messages from self if they start with !
      if (message.fromMe && !message.body.startsWith('!')) {
        logger.debug('[FLOW] Ignoring message from self (not a command)');
        return;
      }

      try {
        const contact = await message.getContact();
        const phoneNumber = contact.number;
        logger.info(
          `[FLOW] Processing message from ${contact.name || phoneNumber}: "${message.body}"`
        );

        // Global rate limiting check
        if (!rateLimiter.checkGlobal()) {
          logger.warn('[FLOW] Global rate limit exceeded');
          await message.reply(
            '⚠️ System is experiencing high load. Please try again in a few minutes.'
          );
          return;
        }

        // Handle business owner commands
        logger.debug('[FLOW] Checking for business owner commands...');
        if (await this.handleOwnerCommands(message, phoneNumber)) {
          logger.debug('[FLOW] Message handled as business owner command');
          return;
        }

        // Handle customer queries
        logger.debug('[FLOW] Checking for customer queries...');
        const parsedCommand = this.parseCommand(message.body);
        if (parsedCommand && parsedCommand.command === 'business') {
          logger.info('[FLOW] Customer query detected');

          // Customer rate limiting
          if (!rateLimiter.checkCustomer(phoneNumber)) {
            const remaining = rateLimiter.getRemainingRequests('customer', phoneNumber);
            const resetTime = new Date(rateLimiter.getResetTime('customer', phoneNumber));
            await message.reply(
              `⚠️ Rate limit exceeded. You can make ${remaining} more queries. Limit resets at ${resetTime.toLocaleTimeString()}.`
            );
            return;
          }

          const businessId = this.extractBusinessId(parsedCommand.normalized);
          if (businessId) {
            logger.info(`[FLOW] Processing customer query for business: ${businessId}`);
            await this.handleBusinessQuery(message, businessId, parsedCommand);
          } else {
            logger.warn('[FLOW] Invalid business query format');
            await message.reply(
              'Please provide a valid business ID. Format: !business [ID] [your question]'
            );
          }
        } else {
          logger.debug('[FLOW] Message not recognized as command or query');
        }
      } catch (error) {
        logger.error('[FLOW] Error handling message:', error);
        await message.reply('Sorry, I encountered an error processing your message.');
      }
    });

    this.client.on('disconnected', reason => {
      logger.warn('WhatsApp client disconnected:', reason);
    });
  }

  extractBusinessId(messageBody) {
    const parts = messageBody.split(' ');
    if (parts.length >= 3) {
      return parts[1];
    }
    return null;
  }

  normalizeMessageBody(messageBody) {
    if (!messageBody) {return '';}

    // Handle multi-line messages by normalizing whitespace
    // WhatsApp sometimes breaks long messages into multiple lines
    return messageBody
      .replace(/\r\n/g, ' ') // Replace Windows line endings
      .replace(/\n/g, ' ') // Replace Unix line endings
      .replace(/\r/g, ' ') // Replace Mac line endings
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing whitespace
  }

  parseCommand(messageBody) {
    const normalized = this.normalizeMessageBody(messageBody);

    // Log multi-line normalization if original differs significantly from normalized
    if (
      messageBody &&
      messageBody !== normalized &&
      (messageBody.includes('\n') || messageBody.includes('\r'))
    ) {
      logger.debug(
        `[PARSER] Normalized multi-line message: "${messageBody.substring(0, 50)}..." → "${normalized.substring(0, 50)}..."`
      );

    // Extract command and arguments from normalized message
    const commandMatch = normalized.match(/^!(\w+)(?:\s+(.*))?$/i);
    if (!commandMatch) {
      return null;
    }

    const parsed = {
      command: commandMatch[1].toLowerCase(),
      args: commandMatch[2] || '',
      fullCommand: commandMatch[0],
      normalized: normalized,
    };

    logger.debug(
      `[PARSER] Parsed command: '${parsed.command}' with args: '${parsed.args.substring(0, 50)}${parsed.args.length > 50 ? '...' : ''}'`
    );
    return parsed;
  }

  async handleOwnerCommands(message, phoneNumber) {
    logger.debug(`[OWNER] Checking owner commands for ${phoneNumber}`);

    // Parse command from message body (handles multi-line messages)
    const parsedCommand = this.parseCommand(message.body);

    // Check for owner registration (no rate limiting for registration)
    if (parsedCommand && parsedCommand.command === 'register') {
      logger.info(`[OWNER] Registration command detected from ${phoneNumber}`);
      return await this.handleRegistration(message, phoneNumber, parsedCommand);
    }

    // Check if user is registered business owner
    const business = await businessService.getBusinessByOwner(phoneNumber);
    if (!business) {
      logger.debug(`[OWNER] ${phoneNumber} is not a registered business owner`);
      return false; // Not a business owner, let other handlers process
    }

    logger.debug(
      `[OWNER] Recognized business owner: ${business.businessName} (${business.businessId})`
    );

    // Handle document/media uploads with specific rate limiting
    if (message.hasMedia) {
      if (!rateLimiter.checkBusinessOwner(phoneNumber, 'upload')) {
        const remaining = rateLimiter.getRemainingRequests('businessOwner', phoneNumber, 'upload');
        const resetTime = new Date(rateLimiter.getResetTime('businessOwner', phoneNumber));
        await message.reply(
          `⚠️ Upload rate limit exceeded. You can upload ${remaining} more documents. Limit resets at ${resetTime.toLocaleTimeString()}.`
        );
        return true;
      }
      logger.info(`[OWNER] Media upload detected from ${business.businessName}`);
      return await this.handleMediaUpload(message, business);
    }

    // If no valid command parsed, return false
    if (!parsedCommand) {
      logger.debug(`[OWNER] No valid command parsed from ${business.businessName}`);
      return false;
    }

    // General business owner rate limiting for other commands
    if (!rateLimiter.checkBusinessOwner(phoneNumber)) {
      const remaining = rateLimiter.getRemainingRequests('businessOwner', phoneNumber);
      const resetTime = new Date(rateLimiter.getResetTime('businessOwner', phoneNumber));
      await message.reply(
        `⚠️ Rate limit exceeded. You can make ${remaining} more requests. Limit resets at ${resetTime.toLocaleTimeString()}.`
      );
      return true;
    }

    // Handle commands using parsed command object
    switch (parsedCommand.command) {
      case 'add':
        logger.info(`[OWNER] Text knowledge addition from ${business.businessName}`);
        return await this.handleTextKnowledge(message, business, parsedCommand);

      case 'list':
        logger.info(`[OWNER] Knowledge list request from ${business.businessName}`);
        return await this.handleListKnowledge(message, business);

      case 'delete':
        logger.info(`[OWNER] Knowledge deletion request from ${business.businessName}`);
        return await this.handleDeleteKnowledge(message, business, parsedCommand);

      case 'help':
        logger.info(`[OWNER] Help request from ${business.businessName}`);
        return await this.handleHelp(message, business);

      case 'clearcache':
        logger.info(`[OWNER] Cache clear request from ${business.businessName}`);
        return await this.handleClearCache(message, business);

      case 'inspect':
        logger.info(`[OWNER] Cache inspect request from ${business.businessName}`);
        return await this.handleInspectCache(message, business);

      default:
        logger.debug(
          `[OWNER] Unrecognized command '${parsedCommand.command}' from ${business.businessName}`
        );
        return false; // Not a recognized owner command
    }
  }

  async handleRegistration(message, phoneNumber, parsedCommand) {
    logger.info(`[REGISTRATION] Starting registration process for ${phoneNumber}`);

    // Validate phone number
    const phoneValidation = validator.validateAndSanitize('phoneNumber', phoneNumber);
    if (!phoneValidation.valid) {
      logger.warn(`[REGISTRATION] Invalid phone number: ${phoneValidation.error}`);
      await message.reply('❌ Invalid phone number format.');
      return true;
    }

    if (!parsedCommand || !parsedCommand.args.trim()) {
      await message.reply('Please provide a business name. Format: !register [Business Name]');
      return true;
    }

    const businessNameInput = parsedCommand.args.trim();

    // Validate and sanitize business name
    const nameValidation = validator.validateAndSanitize('businessName', businessNameInput);
    if (!nameValidation.valid) {
      logger.warn(
        `[REGISTRATION] Invalid business name from ${phoneNumber}: ${nameValidation.error}`
      );
      await message.reply(`❌ ${nameValidation.error}`);
      return true;
    }

    const businessName = nameValidation.sanitized;

    // Check for suspicious content
    if (validator.detectSuspiciousContent(businessName)) {
      logger.warn(`[REGISTRATION] Suspicious business name detected from ${phoneNumber}`);
      await message.reply(
        '❌ Business name contains invalid content. Please use a different name.'
      );
      return true;
    }

    logger.info(
      `[REGISTRATION] Attempting to register business "${businessName}" for ${phoneNumber}`
    );
    const result = await businessService.registerBusiness(phoneValidation.sanitized, businessName);

    if (result.success) {
      logger.success(
        `[REGISTRATION] Successfully registered business: ${businessName} (ID: ${result.businessId}) for ${phoneNumber}`
      );
      await message.reply(
        `🎉 ${result.message}\n\nAvailable commands:\n• !add [text] - Add text knowledge\n• Send documents - Upload files\n• !list - View your knowledge base\n• !delete [id] - Remove knowledge\n• !help - Show all commands`
      );
    } else {
      logger.error(
        `[REGISTRATION] Failed to register business for ${phoneNumber}: ${result.message}`
      );
      await message.reply(`❌ ${result.message}`);
    }

    return true;
  }

  async handleMediaUpload(message, business) {
    try {
      logger.info(
        `[MEDIA] Starting media upload for ${business.businessName} (${business.businessId})`
      );
      await message.reply('📄 Processing your document...');

      const media = await message.downloadMedia();
      if (!media) {
        logger.error(`[MEDIA] Failed to download media for ${business.businessName}`);
        await message.reply('❌ Failed to download media file');
        return true;
      }

      logger.info(
        `[MEDIA] Downloaded media: ${media.filename || 'unnamed'}, size: ${media.data.length} bytes`
      );
      logger.debug(`[MEDIA] Media mimetype: ${media.mimetype}`);

      // Validate filename
      const originalFilename = media.filename || 'document';
      const filenameValidation = validator.validateAndSanitize('fileName', originalFilename);
      if (!filenameValidation.valid) {
        logger.warn(
          `[MEDIA] Invalid filename from ${business.businessName}: ${filenameValidation.error}`
        );
        await message.reply(`❌ ${filenameValidation.error}`);
        return true;
      }

      // Validate file type
      const fileTypeValidation = validator.validateAndSanitize(
        'fileType',
        filenameValidation.sanitized
      );
      if (!fileTypeValidation.valid) {
        logger.warn(
          `[MEDIA] Invalid file type from ${business.businessName}: ${fileTypeValidation.error}`
        );
        await message.reply(`❌ ${fileTypeValidation.error}`);
        return true;
      }

      // Validate file size
      const fileSizeValidation = validator.validateAndSanitize('fileSize', media.data.length);
      if (!fileSizeValidation.valid) {
        logger.warn(
          `[MEDIA] Invalid file size from ${business.businessName}: ${fileSizeValidation.error}`
        );
        await message.reply(`❌ ${fileSizeValidation.error}`);
        return true;
      }

      const tempDir = path.join(__dirname, '../../temp');
      const filename = `${Date.now()}_${filenameValidation.sanitized}`;
      const tempPath = path.join(tempDir, filename);

      // Save file temporarily
      logger.debug(`[MEDIA] Saving file to: ${tempPath}`);
      await fs.writeFileSync(tempPath, media.data, 'base64');

      let content = '';
      const fileExt = fileTypeValidation.extension;
      logger.info(`[MEDIA] Processing file type: ${fileExt}`);

      if (fileExt === '.pdf') {
        logger.info(`[MEDIA] Extracting text from PDF: ${filename}`);
        const dataBuffer = fs.readFileSync(tempPath);
        const pdfData = await pdfParse(dataBuffer);
        content = pdfData.text;
        logger.info(`[MEDIA] Extracted ${content.length} characters from PDF`);
      } else if (fileExt === '.txt') {
        logger.info(`[MEDIA] Reading text file: ${filename}`);
        content = fs.readFileSync(tempPath, 'utf8');
        logger.info(`[MEDIA] Read ${content.length} characters from text file`);
      } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
        logger.info(`[MEDIA] Image file detected: ${filename}`);
        await message.reply(
          '🖼️ Image received! Please add a description by replying with: !add [description]'
        );
        // TODO: Store image temporarily and wait for description
        fs.unlinkSync(tempPath);
        return true;
      } else {
        logger.warn(`[MEDIA] Unsupported file type: ${fileExt} for ${business.businessName}`);
        await message.reply('❌ Unsupported file type. Please send PDF, TXT, or image files.');
        fs.unlinkSync(tempPath);
        return true;
      }

      if (!content.trim()) {
        logger.warn(
          `[MEDIA] Empty content extracted from ${filename} for ${business.businessName}`
        );
        await message.reply('❌ Could not extract text from the document');
        fs.unlinkSync(tempPath);
        return true;
      }

      // Validate extracted content
      const contentValidation = validator.validateAndSanitize('knowledgeContent', content);
      if (!contentValidation.valid) {
        logger.warn(
          `[MEDIA] Invalid extracted content from ${business.businessName}: ${contentValidation.error}`
        );
        await message.reply(`❌ Document content validation failed: ${contentValidation.error}`);
        fs.unlinkSync(tempPath);
        return true;
      }

      // Check for suspicious content
      if (validator.detectSuspiciousContent(contentValidation.sanitized)) {
        logger.warn(
          `[MEDIA] Suspicious content detected in document from ${business.businessName}`
        );
        await message.reply('❌ Document contains suspicious content and cannot be processed.');
        fs.unlinkSync(tempPath);
        return true;
      }

      logger.info(`[MEDIA] Storing document knowledge for ${business.businessName}`);
      const result = await knowledgeService.addDocumentKnowledge(
        business.businessId,
        business.businessName,
        originalFilename,
        contentValidation.sanitized,
        fileExt,
        { originalSize: media.data.length }
      );

      // Clean up temp file
      logger.debug(`[MEDIA] Cleaning up temp file: ${tempPath}`);
      fs.unlinkSync(tempPath);

      if (result.success) {
        logger.success(
          `[MEDIA] Document successfully stored: ${result.knowledgeId} for ${business.businessName}`
        );
        await businessService.updateKnowledgeCount(business.ownerPhone);
        await message.reply(`✅ ${result.message}`);
      } else {
        logger.error(
          `[MEDIA] Failed to store document for ${business.businessName}: ${result.message}`
        );
        await message.reply(`❌ ${result.message}`);
      }
    } catch (error) {
      logger.error(`[MEDIA] Error handling media upload for ${business.businessName}:`, error);
      await message.reply('❌ Failed to process document. Please try again.');
    }

    return true;
  }

  async handleTextKnowledge(message, business, parsedCommand) {
    logger.info(`[TEXT] Processing text knowledge addition for ${business.businessName}`);

    if (!parsedCommand || !parsedCommand.args.trim()) {
      await message.reply('Please provide content. Format: !add [your knowledge text]');
      return true;
    }

    const contentInput = parsedCommand.args.trim();

    // Validate and sanitize content
    const contentValidation = validator.validateAndSanitize('knowledgeContent', contentInput);
    if (!contentValidation.valid) {
      logger.warn(
        `[TEXT] Invalid content from ${business.businessName}: ${contentValidation.error}`
      );
      await message.reply(`❌ ${contentValidation.error}`);
      return true;
    }

    const content = contentValidation.sanitized;

    // Check for suspicious content
    if (validator.detectSuspiciousContent(content)) {
      logger.warn(`[TEXT] Suspicious content detected from ${business.businessName}`);
      await message.reply('❌ Content contains suspicious elements and cannot be processed.');
      return true;
    }

    logger.info(
      `[TEXT] Adding ${content.length} characters of text knowledge for ${business.businessName}`
    );
    const result = await knowledgeService.addTextKnowledge(
      business.businessId,
      business.businessName,
      content
    );

    if (result.success) {
      logger.success(
        `[TEXT] Text knowledge added: ${result.knowledgeId} for ${business.businessName}`
      );
      await businessService.updateKnowledgeCount(business.ownerPhone);
      await message.reply(
        `✅ ${result.message}\n"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`
      );
    } else {
      logger.error(
        `[TEXT] Failed to add text knowledge for ${business.businessName}: ${result.message}`
      );
      await message.reply(`❌ ${result.message}`);
    }

    return true;
  }

  async handleListKnowledge(message, business) {
    logger.info(`[LIST] Retrieving knowledge list for ${business.businessName}`);

    const entries = await knowledgeService.getBusinessKnowledge(business.businessId);
    const stats = await knowledgeService.getKnowledgeStats(business.businessId);

    logger.info(`[LIST] Found ${entries.length} knowledge entries for ${business.businessName}`);

    if (entries.length === 0) {
      logger.debug(`[LIST] No knowledge entries found for ${business.businessName}`);
      await message.reply(
        `📚 Your Knowledge Base (${business.businessName}):\n\nNo entries yet. Use !add [text] or send documents to get started!`
      );
      return true;
    }

    let response = `📚 Your Knowledge Base (${business.businessName}):\n\n`;
    entries.slice(0, 10).forEach(entry => {
      const date = new Date(entry.addedAt).toLocaleDateString();
      response += `${entry.id}: ${entry.preview} (${entry.type}) - ${date}\n`;
    });

    if (entries.length > 10) {
      response += `\n... and ${entries.length - 10} more entries`;
    }

    response += `\n📊 Total: ${stats.total} entries (${stats.text} text, ${stats.documents} documents)`;

    logger.debug(`[LIST] Sending knowledge list response for ${business.businessName}`);
    await message.reply(response);
    return true;
  }

  async handleDeleteKnowledge(message, business, parsedCommand) {
    if (!parsedCommand || !parsedCommand.args.trim()) {
      await message.reply('Please provide a knowledge ID. Format: !delete [knowledge-id]');
      return true;
    }

    const knowledgeIdInput = parsedCommand.args.trim();

    // Validate knowledge ID
    const idValidation = validator.validateAndSanitize('knowledgeId', knowledgeIdInput);
    if (!idValidation.valid) {
      logger.warn(
        `[DELETE] Invalid knowledge ID from ${business.businessName}: ${idValidation.error}`
      );
      await message.reply(`❌ ${idValidation.error}`);
      return true;
    }

    const knowledgeId = idValidation.sanitized;
    logger.info(
      `[DELETE] Attempting to delete knowledge ${knowledgeId} for ${business.businessName}`
    );

    const result = await knowledgeService.deleteKnowledge(business.businessId, knowledgeId);

    if (result.success) {
      logger.success(
        `[DELETE] Successfully deleted knowledge ${knowledgeId} for ${business.businessName}`
      );
      await businessService.updateKnowledgeCount(business.ownerPhone, -1);
      await message.reply(`✅ ${result.message}`);
    } else {
      logger.warn(
        `[DELETE] Failed to delete knowledge ${knowledgeId} for ${business.businessName}: ${result.message}`
      );
      await message.reply(`❌ ${result.message}`);
    }

    return true;
  }

  async handleHelp(message, business) {
    const help = `🔧 Available Commands for ${business.businessName}:

📝 *Knowledge Management:*
• !add [text] - Add text knowledge
• Send PDF/TXT files - Upload documents
• Send images - Upload with description
• !list - View your knowledge base
• !delete [id] - Remove knowledge entry

📊 *Information:*
• !help - Show this help message
• !clearcache - Clear cached responses (for testing)
• !inspect - View cache status and contents

💡 *Tips:*
- Customers can query your business using: !business ${business.businessId} [question]
- All uploaded content is processed and made searchable
- Use descriptive text for better customer responses`;

    await message.reply(help);
    return true;
  }

  async handleClearCache(message, business) {
    try {
      logger.info(`[CACHE] Clearing cache for business ${business.businessId}`);
      const cache = require('../utils/cache');
      const clearedCount = cache.clearBusinessCaches(business.businessId);

      await message.reply(
        `🗑️ Cleared ${clearedCount} cached responses for ${business.businessName}. Fresh queries will now search updated knowledge base.`
      );
      return true;
    } catch (error) {
      logger.error(`[CACHE] Error clearing cache for ${business.businessName}:`, error);
      await message.reply('❌ Error clearing cache. Please try again.');
      return true;
    }
  }

  async handleInspectCache(message, business) {
    try {
      logger.info(`[CACHE] Inspecting cache for business ${business.businessId}`);
      const cache = require('../utils/cache');
      const stats = cache.getStats();

      let response = `🔍 Cache Status (${business.businessName}):\n\n`;
      response += `📊 Stats:\n`;
      response += `• Hit Rate: ${stats.hitRate}\n`;
      response += `• Hits: ${stats.hits}, Misses: ${stats.misses}\n`;
      response += `• Total Saves: ${stats.saves}\n\n`;

      response += `💾 Cache Sizes:\n`;
      response += `• Responses: ${stats.cacheSize.responses}\n`;
      response += `• Searches: ${stats.cacheSize.searches}\n`;
      response += `• Embeddings: ${stats.cacheSize.embeddings}\n\n`;

      // Show recent cache keys (first few)
      response += `🔑 Recent Keys:\n`;
      let keyCount = 0;
      for (const [key, entry] of cache.caches.responses.entries()) {
        if (keyCount >= 3) {break;}
        const age = Math.floor((Date.now() - entry.timestamp) / 1000);
        response += `• ${key.substring(0, 30)}... (${age}s ago)\n`;
        keyCount++;
      }

      if (keyCount === 0) {
        response += `• No cached responses\n`;
      }

      await message.reply(response);
      return true;
    } catch (error) {
      logger.error(`[CACHE] Error inspecting cache for ${business.businessName}:`, error);
      await message.reply('❌ Error inspecting cache. Please try again.');
      return true;
    }
  }

  async handleBusinessQuery(message, businessId, parsedCommand) {
    try {
      // Extract query from normalized command arguments, skipping business ID
      const argsParts = parsedCommand.args.split(' ');
      const query = argsParts.slice(1).join(' ').trim(); // Skip business ID, get the rest

      logger.info(`[QUERY] Customer query for business ${businessId}: "${query}"`);

      if (!query.trim()) {
        logger.warn(`[QUERY] Empty query provided for business ${businessId}`);
        await message.reply('Please provide a question. Format: !business [ID] [your question]');
        return;
      }

      // Record the query in business stats
      await businessService.recordQuery(businessId);

      logger.debug(`[QUERY] Sending search notification for business ${businessId}`);
      await message.reply('🤔 Let me search our knowledge base...');

      logger.info(`[QUERY] Generating AI response for business ${businessId}`);
      const response = await aiService.generateResponse(query, businessId);

      logger.info(
        `[QUERY] Sending response for business ${businessId} (${response.length} characters)`
      );
      await message.reply(response);
    } catch (error) {
      logger.error(`[QUERY] Error handling business query for ${businessId}:`, error);
      await message.reply(
        "Sorry, I couldn't find information about that. Please try rephrasing your question."
      );
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
  sendMessage: (number, message) => whatsappBot.sendMessage(number, message),
};
