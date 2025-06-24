/**
 * Business Controller
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const businessService = require('../services/businessService');
const twilioWhatsAppService = require('../services/twilioWhatsAppService');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../errors/AppError');
const logger = require('../utils/logger');

class BusinessController {
  constructor() {
    this.createBusiness = catchAsync(this.createBusiness.bind(this));
    this.registerBusiness = catchAsync(this.registerBusiness.bind(this));
    this.getAllBusinesses = catchAsync(this.getAllBusinesses.bind(this));
    this.getTwilioStatus = catchAsync(this.getTwilioStatus.bind(this));
  }

  async createBusiness(req, res) {
    const { businessName, whatsappNumber, ownerPhone } = req.body;

    if (!businessName || !whatsappNumber || !ownerPhone) {
      throw new ValidationError(
        'Missing required fields: businessName, whatsappNumber, ownerPhone'
      );
    }

    // Register in business service
    const businessResult = await businessService.registerBusiness(ownerPhone, businessName);

    if (!businessResult.success) {
      throw new ValidationError(businessResult.error || 'Failed to register business');
    }

    // Register in Twilio service
    const twilioResult = await twilioWhatsAppService.registerBusiness(
      businessResult.businessId,
      businessName,
      whatsappNumber,
      ownerPhone
    );

    if (!twilioResult.success) {
      logger.error('[BUSINESS] Twilio registration failed:', twilioResult.error);
      throw new Error(`Business registered but Twilio registration failed: ${twilioResult.error}`);
    }

    res.json({
      success: true,
      message: 'Business registered successfully',
      businessId: businessResult.businessId,
      whatsappNumber: whatsappNumber,
    });
  }

  async registerBusiness(req, res) {
    // This is a duplicate endpoint with the same logic as createBusiness
    // Keeping it for backward compatibility
    await this.createBusiness(req, res);
  }

  async getAllBusinesses(req, res) {
    const businesses = twilioWhatsAppService.getAllBusinesses();
    res.json({
      success: true,
      businesses: businesses,
    });
  }

  async getTwilioStatus(req, res) {
    const stats = twilioWhatsAppService.getStats();
    res.json({
      success: true,
      ...stats,
    });
  }
}

module.exports = new BusinessController();
