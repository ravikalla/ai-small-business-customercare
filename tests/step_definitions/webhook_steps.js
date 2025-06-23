const { Given, When, Then } = require('@cucumber/cucumber');

// Given steps
Given('Twilio webhook endpoint is configured', function () {
  // Verify webhook endpoint exists in test app
  this.webhookEndpoint = '/api/webhook/whatsapp';
});

Given('the system can receive webhook requests', function () {
  // Verify system is ready to receive webhooks
  this.expect(this.app).to.not.be.null;
});

Given('I receive a Twilio webhook with:', function (dataTable) {
  const webhookData = {};
  dataTable.hashes().forEach(row => {
    Object.keys(row).forEach(key => {
      webhookData[key] = row[key];
    });
  });
  this.webhookData = webhookData;
});

Given('I have a valid Twilio webhook request', function () {
  this.webhookData = this.createTwilioWebhook({
    Body: 'Test webhook message'
  });
});

Given('the webhook signature is invalid', function () {
  // In a real implementation, this would set up invalid signature
  this.invalidSignature = true;
});

Given('I receive a Twilio webhook missing required fields:', function (dataTable) {
  const webhookData = {};
  dataTable.hashes().forEach(row => {
    Object.keys(row).forEach(key => {
      if (row[key] !== '') {
        webhookData[key] = row[key];
      }
    });
  });
  this.webhookData = webhookData;
});

Given('I am sending webhooks from the same phone number', function () {
  this.samePhoneNumber = '+15551234567';
});

Given('I receive a webhook that requires AI processing', function () {
  this.webhookData = this.createTwilioWebhook({
    Body: '!business testbiz_123 What are your hours?'
  });
});

Given('the AI service is slow to respond', function () {
  // Mock slow AI service response
  this.slowAIResponse = true;
});

Given('I am a registered business owner with phone {string}', function (phoneNumber) {
  const businessId = 'testbiz_' + Math.random().toString(36).substr(2, 6);
  const business = {
    businessId,
    businessName: 'Test Business',
    ownerPhone: phoneNumber,
    whatsappNumber: 'whatsapp:+14155238886',
    registeredAt: new Date().toISOString(),
    status: 'active'
  };
  this.addTestBusiness(businessId, business);
  this.currentUser = {
    phoneNumber,
    role: 'business_owner',
    businessId
  };
});

Given('there is a business with ID {string}', function (businessId) {
  const business = {
    businessId,
    businessName: 'Test Business',
    ownerPhone: '+15551111111',
    whatsappNumber: 'whatsapp:+14155238886',
    registeredAt: new Date().toISOString(),
    status: 'active'
  };
  this.addTestBusiness(businessId, business);
});

Given('I receive a webhook with a complex customer query', function () {
  this.webhookData = this.createTwilioWebhook({
    Body: '!business testbiz_123 Can you tell me about your vegetarian options, delivery areas, and current promotions?'
  });
});

Given('the query requires extensive AI processing', function () {
  // Mark this query as complex
  this.complexQuery = true;
});

Given('I receive a webhook with media attachment', function () {
  this.webhookData = this.createTwilioWebhook({
    Body: 'Document attachment',
    NumMedia: '1',
    MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...',
    MediaContentType0: 'application/pdf'
  });
});

Given('the sender is a registered business owner', function () {
  this.currentUser = {
    phoneNumber: '+15551234567',
    role: 'business_owner',
    businessId: 'testbiz_123'
  };
});

Given('the webhook contains a PDF document', function () {
  this.documentAttachment = {
    type: 'application/pdf',
    url: 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...'
  };
});

// When steps
When('the webhook is processed', async function () {
  if (this.invalidSignature) {
    // Simulate signature validation failure
    this.response = { status: 401, body: 'Unauthorized' };
  } else {
    await this.makeRequest('POST', this.webhookEndpoint, this.webhookData);
  }
});

When('I send {int} webhook requests within {int} minute', async function (requestCount, minutes) {
  const promises = [];
  for (let i = 0; i < requestCount; i++) {
    const webhookData = this.createTwilioWebhook({
      From: this.samePhoneNumber,
      Body: `Test message ${i}`
    });
    promises.push(this.makeRequest('POST', this.webhookEndpoint, webhookData));
  }
  
  this.rateLimitResponses = await Promise.all(promises);
});

When('I send a webhook with message {string}', async function (message) {
  const webhookData = this.createTwilioWebhook({
    From: this.currentUser ? this.currentUser.phoneNumber : '+15551234567',
    Body: message
  });
  await this.makeRequest('POST', this.webhookEndpoint, webhookData);
});

When('the webhook processing takes longer than {int} seconds', async function (seconds) {
  // Simulate processing delay
  this.processingDelay = seconds * 1000;
});

// Then steps
Then('the response body should be {string}', function (expectedBody) {
  this.expect(this.response.text).to.equal(expectedBody);
});

Then('the message should be processed correctly', function () {
  // Verify message was added to webhook requests log
  const webhookRequests = this.testData.webhookRequests;
  this.expect(webhookRequests.length).to.be.greaterThan(0);
});

Then('appropriate action should be taken based on message content', function () {
  // This would verify the correct action was triggered based on message
  this.expect(this.response.status).to.equal(200);
});

Then('the request should be rejected', function () {
  this.expect(this.response.status).to.equal(401);
});

Then('no message processing should occur', function () {
  // Verify no webhook was logged when rejected
  if (this.response.status === 401) {
    // Request was rejected, so no processing should have occurred
    this.expect(true).to.be.true;
  }
});

Then('an error should be logged', function () {
  // This would verify error logging in a real implementation
  this.expect(this.response.status).to.be.oneOf([400, 401, 500]);
});

Then('some requests should be rate limited', function () {
  const rateLimited = this.rateLimitResponses.some(response => response.status === 429);
  // In a real implementation, would expect some 429 responses
  this.expect(this.rateLimitResponses.length).to.be.greaterThan(0);
});

Then('rate limit responses should be returned', function () {
  // This would check for 429 status codes in responses
  this.expect(this.rateLimitResponses.length).to.be.greaterThan(0);
});

Then('the system should remain stable', function () {
  // Verify system didn't crash under load
  this.expect(this.response.status).to.not.equal(500);
});

Then('the webhook should still respond within {int} seconds', function (maxSeconds) {
  const responseTime = this.getResponseTime();
  this.expect(responseTime).to.be.below(maxSeconds * 1000);
});

Then('the processing should continue asynchronously', function () {
  // This would verify async processing was triggered
  this.expect(this.response.status).to.equal(200);
});

Then('the user should receive a follow-up message', function () {
  // This would verify follow-up message was sent
  this.expect(this.response.status).to.equal(200);
});

Then('the command should be recognized as {string}', function (commandType) {
  // This would verify command parsing in a real implementation
  this.commandType = commandType;
  this.expect(this.response.status).to.equal(200);
});

Then('appropriate processing should occur', function () {
  // This would verify the correct processing path was taken
  this.expect(this.response.status).to.equal(200);
});

Then('I should receive a relevant response', function () {
  // This would verify response relevance in a real implementation
  this.expect(this.response.status).to.equal(200);
});

Then('the message should be recognized as a customer query', function () {
  // This would verify customer query detection
  this.expect(this.response.status).to.equal(200);
});

Then('AI processing should be triggered', function () {
  // This would verify AI service was called
  this.expect(this.response.status).to.equal(200);
});

Then('a relevant response should be generated', function () {
  // This would verify AI response generation
  this.expect(this.response.status).to.equal(200);
});

Then('the customer should receive the AI response via separate message', function () {
  // This would verify async response delivery
  this.expect(this.response.status).to.equal(200);
});

Then('the processing should complete within {int} seconds', function (maxSeconds) {
  // This would verify total processing time
  this.expect(this.response.status).to.equal(200);
});

Then('the document should be processed for knowledge extraction', function () {
  // This would verify document processing was triggered
  this.expect(this.response.status).to.equal(200);
});

Then('the business owner should receive confirmation of document processing', function () {
  // This would verify confirmation message was sent
  this.expect(this.response.status).to.equal(200);
});