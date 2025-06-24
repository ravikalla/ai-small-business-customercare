/**
 * Swagger/OpenAPI Configuration
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const packageJson = require('../../package.json');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Small Business Chatbot API',
      version: packageJson.version,
      description: 'WhatsApp AI Business Assistant API for managing businesses, knowledge bases, and customer interactions',
      contact: {
        name: 'Ravi Kalla',
        email: 'ravi2523096+sbc@gmail.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://your-production-domain.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Business: {
          type: 'object',
          required: ['businessId', 'businessName', 'ownerPhone'],
          properties: {
            businessId: {
              type: 'string',
              description: 'Unique business identifier',
              example: 'restaurant_1234',
            },
            businessName: {
              type: 'string',
              description: 'Name of the business',
              example: 'Pizza Palace',
            },
            ownerPhone: {
              type: 'string',
              description: 'Owner phone number',
              example: '+15551234567',
            },
            whatsappNumber: {
              type: 'string',
              description: 'WhatsApp business number',
              example: 'whatsapp:+15551234567',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Business status',
              example: 'active',
            },
            knowledgeCount: {
              type: 'integer',
              description: 'Number of knowledge entries',
              example: 5,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Knowledge: {
          type: 'object',
          required: ['knowledgeId', 'businessId', 'type'],
          properties: {
            knowledgeId: {
              type: 'string',
              description: 'Unique knowledge entry identifier',
              example: 'kb_restaurant_1234_1234567890_abc',
            },
            businessId: {
              type: 'string',
              description: 'Associated business ID',
              example: 'restaurant_1234',
            },
            type: {
              type: 'string',
              enum: ['text', 'document', 'image'],
              description: 'Type of knowledge entry',
              example: 'text',
            },
            filename: {
              type: 'string',
              description: 'Filename for document/image types',
              example: 'menu.pdf',
            },
            contentPreview: {
              type: 'string',
              description: 'Preview of the content',
              example: 'Our business hours are Monday-Friday 9AM-6PM...',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'Validation failed',
                },
                type: {
                  type: 'string',
                  description: 'Error type',
                  example: 'validation_error',
                },
                statusCode: {
                  type: 'integer',
                  description: 'HTTP status code',
                  example: 400,
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Error timestamp',
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Operation completed successfully',
            },
          },
        },
      },
      securitySchemes: {
        BasicAuth: {
          type: 'http',
          scheme: 'basic',
          description: 'Basic authentication for admin endpoints',
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and system status endpoints',
      },
      {
        name: 'Business',
        description: 'Business management operations',
      },
      {
        name: 'Knowledge',
        description: 'Knowledge base management',
      },
      {
        name: 'Webhooks',
        description: 'WhatsApp webhook handlers',
      },
      {
        name: 'Admin',
        description: 'Administrative functions (backup, cache management)',
      },
      {
        name: 'Twilio',
        description: 'Twilio service integration',
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/modules/*.js',
  ],
};

const specs = swaggerJSDoc(options);

const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
  },
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions,
};