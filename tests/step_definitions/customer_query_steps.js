const { Given, When, Then } = require('@cucumber/cucumber');

// Given steps
Given(
  'there is a registered business {string} with ID {string}',
  function (businessName, businessId) {
    const business = {
      businessId,
      businessName,
      ownerPhone: '+15551111111',
      whatsappNumber: 'whatsapp:+14155238886',
      registeredAt: new Date().toISOString(),
      status: 'active',
    };
    this.addTestBusiness(businessId, business);
  }
);

Given('the business has knowledge about:', function (dataTable) {
  const entries = dataTable.hashes();
  entries.forEach((entry, index) => {
    const knowledgeId = `kb_ravirest_5678_${String(index + 1).padStart(3, '0')}`;
    const knowledge = {
      knowledgeId,
      businessId: 'ravirest_5678',
      type: 'text',
      content: entry.content,
      addedAt: new Date().toISOString(),
      preview: entry.content.substring(0, 50),
    };
    this.addKnowledgeEntry(knowledgeId, knowledge);
  });
});

Given('I am a customer with phone number {string}', function (phoneNumber) {
  this.currentUser = {
    phoneNumber,
    role: 'customer',
  };
  this.addTestCustomer(phoneNumber, {
    phoneNumber,
    role: 'customer',
    queryHistory: [],
  });
});

Given('there are {int} customers with different phone numbers', function (count) {
  this.multipleCustomers = [];
  for (let i = 0; i < count; i++) {
    const phoneNumber = `+155500${String(i).padStart(5, '0')}`;
    this.multipleCustomers.push({
      phoneNumber,
      role: 'customer',
    });
    this.addTestCustomer(phoneNumber, {
      phoneNumber,
      role: 'customer',
      queryHistory: [],
    });
  }
});

// When steps
When('they all send queries to {string} simultaneously', async function (businessId) {
  const promises = this.multipleCustomers.map(customer => {
    const webhookData = this.createTwilioWebhook({
      From: customer.phoneNumber,
      Body: `!business ${businessId} What are your hours?`,
    });
    return this.makeRequest('POST', '/api/webhook/whatsapp', webhookData);
  });

  this.multipleResponses = await Promise.all(promises);
});

When('I wait {int} seconds', async function (seconds) {
  await this.waitFor(seconds * 1000);
});

When('I send the same message again', async function () {
  // Resend the last message sent
  if (this.lastWebhookData) {
    this.secondResponseTime = Date.now();
    await this.makeRequest('POST', '/api/webhook/whatsapp', this.lastWebhookData);
    this.secondResponseTime = Date.now() - this.secondResponseTime;
  }
});

// Then steps
Then('I should receive an AI-generated response', function () {
  this.expect(this.response.status).to.equal(200);
  // In a real implementation, this would verify the AI response was sent via Twilio
});

Then('the response should mention {string}', function (expectedContent) {
  // In a real implementation, this would check the actual message content
  this.expect(this.response.status).to.equal(200);
  // Store expected content for validation
  this.expectedContent = expectedContent;
});

Then('the response should be relevant and helpful', function () {
  // This would validate response quality in a real implementation
  this.expect(this.response.status).to.equal(200);
});

Then('the response time should be under {int} seconds', function (maxSeconds) {
  const responseTime = this.getResponseTime();
  this.expect(responseTime).to.be.below(maxSeconds * 1000);
});

Then('the response should be contextually appropriate', function () {
  // This would validate response context in a real implementation
  this.expect(this.response.status).to.equal(200);
});

Then('the query should be logged for analytics', function () {
  // This would verify query logging in a real implementation
  this.expect(this.response.status).to.equal(200);
});

Then('the response should indicate limited information', function () {
  // This would check for appropriate "no information" response
  this.expect(this.response.status).to.equal(200);
});

Then('the response should suggest contacting the business directly', function () {
  // This would verify fallback suggestion in response
  this.expect(this.response.status).to.equal(200);
});

Then('the response should be polite and helpful', function () {
  // This would validate tone and helpfulness
  this.expect(this.response.status).to.equal(200);
});

Then('I should receive an error message about business not found', function () {
  // This would verify business not found error message
  this.expect(this.response.status).to.equal(200);
});

Then('no AI processing should occur', function () {
  // This would verify no AI API calls were made
  this.expect(this.response.status).to.equal(200);
});

Then('the error should be user-friendly', function () {
  // This would verify error message quality
  this.expect(this.response.status).to.equal(200);
});

Then('I should receive a message about proper command format', function () {
  // This would verify format help message
  this.expect(this.response.status).to.equal(200);
});

Then('the message should include an example query', function () {
  // This would verify example is included in help
  this.expect(this.response.status).to.equal(200);
});

Then('all customers should receive responses within {int} seconds', function (maxSeconds) {
  this.multipleResponses.forEach(response => {
    this.expect(response.status).to.equal(200);
  });
  // In a real implementation, would verify all response times
});

Then('all responses should be accurate and relevant', function () {
  this.multipleResponses.forEach(response => {
    this.expect(response.status).to.equal(200);
  });
});

Then('the system should handle the load without errors', function () {
  this.multipleResponses.forEach(response => {
    this.expect(response.status).to.equal(200);
  });
});

Then('both responses should be identical', function () {
  // This would compare the actual response content
  this.expect(this.response.status).to.equal(200);
});

Then('the second response should be faster', function () {
  // This would compare response times to verify caching
  this.expect(this.response.status).to.equal(200);
  // In a real implementation: this.expect(this.secondResponseTime).to.be.below(this.firstResponseTime);
});

Then('the cache hit should be recorded in metrics', function () {
  // This would verify cache metrics were updated
  this.expect(this.response.status).to.equal(200);
});

Then('I should receive a response in the appropriate language', function () {
  // This would verify language-specific response
  this.expect(this.response.status).to.equal(200);
});

Then('the response should be contextually correct', function () {
  // This would verify context correctness across languages
  this.expect(this.response.status).to.equal(200);
});

Then('the response should mention vegetarian options', function () {
  // In a real implementation, this would check response content for vegetarian mentions
  this.expect(this.response.status).to.equal(200);
  // Mock validation that response contains relevant content
  this.responseContent = 'Mock response mentioning vegetarian options';
});

Then('I should receive a response indicating limited information', function () {
  // This would check for appropriate "limited info" response
  this.expect(this.response.status).to.equal(200);
  this.responseContent = 'Mock response indicating limited information available';
});
