const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const chai = require('chai');
const chaiHttp = require('chai-http');
const supertest = require('supertest');
const nock = require('nock');

chai.use(chaiHttp);

class TestWorld {
  constructor() {
    this.expect = chai.expect;
    this.app = null;
    this.response = null;
    this.error = null;
    this.testData = {
      businesses: new Map(),
      customers: new Map(),
      knowledgeEntries: new Map(),
      webhookRequests: []
    };
    this.mockServices = {
      openai: null,
      pinecone: null,
      twilio: null,
      supabase: null
    };
    this.startTime = null;
    this.endTime = null;
  }

  // Helper methods for test data management
  addTestBusiness(id, data) {
    this.testData.businesses.set(id, data);
  }

  getTestBusiness(id) {
    return this.testData.businesses.get(id);
  }

  addTestCustomer(phone, data) {
    this.testData.customers.set(phone, data);
  }

  getTestCustomer(phone) {
    return this.testData.customers.get(phone);
  }

  addKnowledgeEntry(id, data) {
    this.testData.knowledgeEntries.set(id, data);
  }

  getKnowledgeEntry(id) {
    return this.testData.knowledgeEntries.get(id);
  }

  // Helper methods for API testing
  async makeRequest(method, path, data = null) {
    const request = supertest(this.app);
    this.startTime = Date.now();
    
    try {
      switch (method.toLowerCase()) {
        case 'get':
          this.response = await request.get(path);
          break;
        case 'post':
          this.response = await request.post(path).send(data);
          break;
        case 'put':
          this.response = await request.put(path).send(data);
          break;
        case 'delete':
          this.response = await request.delete(path);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      this.error = error;
    } finally {
      this.endTime = Date.now();
    }
    
    return this.response;
  }

  getResponseTime() {
    return this.endTime - this.startTime;
  }

  // Mock service helpers
  setupOpenAIMock() {
    this.mockServices.openai = nock('https://api.openai.com')
      .persist()
      .defaultReplyHeaders({
        'content-type': 'application/json',
      });
    return this.mockServices.openai;
  }

  setupPineconeMock() {
    this.mockServices.pinecone = nock('https://sbc-businessdata-aped-4627-b74a.svc.aped-4627-b74a.pinecone.io')
      .persist()
      .defaultReplyHeaders({
        'content-type': 'application/json',
      });
    return this.mockServices.pinecone;
  }

  setupTwilioMock() {
    this.mockServices.twilio = nock('https://api.twilio.com')
      .persist()
      .defaultReplyHeaders({
        'content-type': 'application/json',
      });
    return this.mockServices.twilio;
  }

  setupSupabaseMock() {
    this.mockServices.supabase = nock('https://lelsrnqukkhrfplfkqop.supabase.co')
      .persist()
      .defaultReplyHeaders({
        'content-type': 'application/json',
      });
    return this.mockServices.supabase;
  }

  cleanupMocks() {
    nock.cleanAll();
    Object.keys(this.mockServices).forEach(service => {
      this.mockServices[service] = null;
    });
  }

  // Webhook simulation helpers
  createTwilioWebhook(data) {
    const defaultWebhook = {
      MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
      AccountSid: 'AC' + Math.random().toString(36).substr(2, 32),
      From: 'whatsapp:+15551234567',
      To: 'whatsapp:+14155238886',
      Body: 'Test message',
      NumMedia: '0',
      MessageType: 'text',
      ProfileName: 'Test User'
    };
    
    return { ...defaultWebhook, ...data };
  }

  // Database helpers for testing
  async cleanDatabase() {
    // This would clean test database tables
    this.testData.businesses.clear();
    this.testData.customers.clear();
    this.testData.knowledgeEntries.clear();
    this.testData.webhookRequests = [];
  }

  // Utility methods
  generateRandomBusinessId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'test_';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateRandomPhoneNumber() {
    return '+1555' + Math.floor(Math.random() * 9000000 + 1000000);
  }

  waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

setWorldConstructor(TestWorld);
setDefaultTimeout(30000); // 30 seconds timeout for tests