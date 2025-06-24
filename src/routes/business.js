/**
 * Business Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const BusinessController = require('../controllers/BusinessController');
const {
  validateRequiredFields,
  validateBusinessName,
  validateWhatsAppNumber,
  validatePhoneNumber,
} = require('../middleware/validation');

// Create business (POST /api/businesses)
router.post(
  '/',
  validateRequiredFields(['businessName', 'whatsappNumber', 'ownerPhone']),
  validateBusinessName,
  validateWhatsAppNumber,
  validatePhoneNumber,
  BusinessController.createBusiness
);

// Register business (POST /api/businesses/register) - for backward compatibility
router.post(
  '/register',
  validateRequiredFields(['businessName', 'whatsappNumber', 'ownerPhone']),
  validateBusinessName,
  validateWhatsAppNumber,
  validatePhoneNumber,
  BusinessController.registerBusiness
);

// Get all businesses (GET /api/businesses)
router.get('/', BusinessController.getAllBusinesses);

module.exports = router;
