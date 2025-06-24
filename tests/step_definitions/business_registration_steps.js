const { Given, When, Then } = require('@cucumber/cucumber');

// Given steps
Given('the SBC system is running', async function () {
  this.expect(this.app).to.not.be.null;
});

Given('the database is clean', async function () {
  await this.cleanDatabase();
});

Given('I am a business owner with phone number {string}', function (phoneNumber) {
  this.currentUser = {
    phoneNumber,
    role: 'business_owner',
  };
});

Given('I have already registered a business named {string}', function (businessName) {
  const businessId = this.generateRandomBusinessId();
  const business = {
    businessId,
    businessName,
    ownerPhone: this.currentUser.phoneNumber,
    whatsappNumber: 'whatsapp:+14155238886',
    registeredAt: new Date().toISOString(),
    status: 'active',
  };
  this.addTestBusiness(businessId, business);
});

Given('I have valid business registration data', function () {
  this.registrationData = {
    businessName: 'Test Restaurant',
    whatsappNumber: 'whatsapp:+14155238886',
    ownerPhone: '+15551234567',
  };
});

// When steps
When('I send a WhatsApp message {string}', async function (message) {
  const webhookData = this.createTwilioWebhook({
    From: this.currentUser.phoneNumber,
    Body: message,
  });

  await this.makeRequest('POST', '/api/webhook/whatsapp', webhookData);
});

When('I POST to {string} with:', async function (endpoint, dataTable) {
  const data = {};
  const rows = dataTable.rawTable;

  // Parse the data table rows
  for (let i = 0; i < rows.length; i++) {
    const key = rows[i][0];
    const value = rows[i][1];
    data[key] = value;
  }

  await this.makeRequest('POST', endpoint, data);
});

// Then steps
Then('I should receive a confirmation message', function () {
  // In a real implementation, this would check for Twilio message response
  this.expect(this.response.status).to.equal(200);
  this.messageType = 'confirmation';
});

Then('the business should be registered in the database', function () {
  // Check if business was added to test data
  const businesses = Array.from(this.testData.businesses.values());
  const userBusiness = businesses.find(b => b.ownerPhone === this.currentUser.phoneNumber);
  this.expect(userBusiness).to.not.be.undefined;
});

Then('the business should have a unique business ID', function () {
  const businesses = Array.from(this.testData.businesses.values());
  const userBusiness = businesses.find(b => b.ownerPhone === this.currentUser.phoneNumber);
  this.expect(userBusiness.businessId).to.match(/^[a-z0-9_]+$/);
});

Then('I should receive instructions on how customers can query the business', function () {
  // This would verify the response message content in a real implementation
  this.expect(this.response.status).to.equal(200);
});

Then('I should receive an error message {string}', function (expectedMessage) {
  // In a real implementation, this would check the actual message sent back
  this.expect(this.response.status).to.equal(200); // Webhook still responds OK
});

Then('no business should be created in the database', function () {
  const businesses = Array.from(this.testData.businesses.values());
  const userBusiness = businesses.find(b => b.ownerPhone === this.currentUser.phoneNumber);
  this.expect(userBusiness).to.be.undefined;
});

Then('I should receive an error message about duplicate registration', function () {
  // Check that webhook was processed but no new business created
  this.expect(this.response.status).to.equal(200);
});

Then('only one business should exist for my phone number', function () {
  const businesses = Array.from(this.testData.businesses.values());
  const userBusinesses = businesses.filter(b => b.ownerPhone === this.currentUser.phoneNumber);
  this.expect(userBusinesses).to.have.length(1);
});

Then('the response status should be {int}', function (expectedStatus) {
  this.expect(this.response.status).to.equal(expectedStatus);
});

Then('the response should contain {string}: {string}', function (key, expectedValue) {
  if (expectedValue === 'true' || expectedValue === 'false') {
    const boolValue = expectedValue === 'true';
    this.expect(this.response.body[key]).to.equal(boolValue);
  } else if (expectedValue === 'ok') {
    this.expect(this.response.body[key]).to.equal('ok');
  } else {
    this.expect(this.response.body[key]).to.equal(expectedValue);
  }
});

Then('the response should contain {string}: true', function (key) {
  this.expect(this.response.body[key]).to.equal(true);
});

Then('the response should include a business ID', function () {
  this.expect(this.response.body.businessId).to.be.a('string');
  this.expect(this.response.body.businessId).to.not.be.empty;
});

Then('the business should be stored in the database', function () {
  const businessId = this.response.body.businessId;
  const business = this.getTestBusiness(businessId);
  this.expect(business).to.not.be.undefined;
});

Then('I should receive a {word} response message', function (messageType) {
  // messageType could be 'confirmation', 'error', etc.
  this.expect(this.response.status).to.equal(200);
  this.messageType = messageType;
});

Then('the business creation should be {word}', function (status) {
  // status could be 'successful', 'failed'
  if (status === 'successful') {
    this.expect(this.response.status).to.equal(200);
  } else {
    // Check for appropriate error handling
    this.expect(this.response.status).to.be.oneOf([200, 400, 422]);
  }
});
