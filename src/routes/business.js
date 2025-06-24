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

/**
 * @swagger
 * /api/businesses:
 *   post:
 *     tags: [Business]
 *     summary: Register a new business
 *     description: Create a new business with WhatsApp integration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - whatsappNumber
 *               - ownerPhone
 *             properties:
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *                 example: "Pizza Palace"
 *               whatsappNumber:
 *                 type: string
 *                 description: WhatsApp business number
 *                 example: "whatsapp:+15551234567"
 *               ownerPhone:
 *                 type: string
 *                 description: Owner's phone number
 *                 example: "+15551234567"
 *     responses:
 *       200:
 *         description: Business registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Business registered successfully"
 *                 businessId:
 *                   type: string
 *                   example: "pizza_1234"
 *                 whatsappNumber:
 *                   type: string
 *                   example: "whatsapp:+15551234567"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Registration failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  validateRequiredFields(['businessName', 'whatsappNumber', 'ownerPhone']),
  validateBusinessName,
  validateWhatsAppNumber,
  validatePhoneNumber,
  BusinessController.createBusiness
);

/**
 * @swagger
 * /api/businesses/register:
 *   post:
 *     tags: [Business]
 *     summary: Register a new business (deprecated)
 *     description: Create a new business with WhatsApp integration (use POST /api/businesses instead)
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - whatsappNumber
 *               - ownerPhone
 *             properties:
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *                 example: "Pizza Palace"
 *               whatsappNumber:
 *                 type: string
 *                 description: WhatsApp business number
 *                 example: "whatsapp:+15551234567"
 *               ownerPhone:
 *                 type: string
 *                 description: Owner's phone number
 *                 example: "+15551234567"
 *     responses:
 *       200:
 *         description: Business registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/register',
  validateRequiredFields(['businessName', 'whatsappNumber', 'ownerPhone']),
  validateBusinessName,
  validateWhatsAppNumber,
  validatePhoneNumber,
  BusinessController.registerBusiness
);

/**
 * @swagger
 * /api/businesses:
 *   get:
 *     tags: [Business]
 *     summary: Get all businesses
 *     description: Retrieve a list of all registered businesses
 *     responses:
 *       200:
 *         description: List of businesses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 businesses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Business'
 *       500:
 *         description: Failed to retrieve businesses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', BusinessController.getAllBusinesses);

module.exports = router;
