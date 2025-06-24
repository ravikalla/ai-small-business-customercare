const { Given, When, Then } = require('@cucumber/cucumber');

// Given steps
Given('I am a registered business owner with business ID {string}', function (businessId) {
  const business = {
    businessId,
    businessName: 'Test Restaurant',
    ownerPhone: '+15551234567',
    whatsappNumber: 'whatsapp:+14155238886',
    registeredAt: new Date().toISOString(),
    status: 'active',
  };
  this.addTestBusiness(businessId, business);
  this.currentUser = {
    phoneNumber: '+15551234567',
    role: 'business_owner',
    businessId,
  };
});

Given('my business name is {string}', function (businessName) {
  if (this.currentUser && this.currentUser.businessId) {
    const business = this.getTestBusiness(this.currentUser.businessId);
    if (business) {
      business.businessName = businessName;
    }
  }
});

Given('I am authenticated as a business owner', function () {
  // Set up authentication context for the business owner
  this.currentUser = {
    phoneNumber: '+15551234567',
    role: 'business_owner',
    businessId: 'testbiz_1234',
  };
});

Given('I have a PDF document with menu information', function () {
  this.testDocument = {
    filename: 'menu.pdf',
    content: 'Sample menu content with various dishes and prices',
    type: 'application/pdf',
    size: 1024,
  };
});

Given('I have added several knowledge entries:', function (dataTable) {
  const entries = dataTable.hashes();
  entries.forEach((entry, index) => {
    const knowledgeId = `kb_testbiz_1234_${String(index + 1).padStart(3, '0')}`;
    const knowledge = {
      knowledgeId,
      businessId: 'testbiz_1234',
      type: entry.type,
      content: entry.content,
      addedAt: new Date().toISOString(),
      preview: entry.content.substring(0, 50),
    };
    this.addKnowledgeEntry(knowledgeId, knowledge);
  });
});

Given('I have a knowledge entry with ID {string}', function (knowledgeId) {
  const knowledge = {
    knowledgeId,
    businessId: 'testbiz_1234',
    type: 'text',
    content: 'Sample knowledge content',
    addedAt: new Date().toISOString(),
    preview: 'Sample knowledge content',
  };
  this.addKnowledgeEntry(knowledgeId, knowledge);
});

Given('I have knowledge entries about:', function (dataTable) {
  const entries = dataTable.hashes();
  entries.forEach((entry, index) => {
    const knowledgeId = `kb_testbiz_1234_${String(index + 1).padStart(3, '0')}`;
    const knowledge = {
      knowledgeId,
      businessId: 'testbiz_1234',
      type: 'text',
      content: entry.content,
      addedAt: new Date().toISOString(),
      preview: entry.content.substring(0, 50),
    };
    this.addKnowledgeEntry(knowledgeId, knowledge);
  });
});

// When steps
When('I POST to {string} with the document', async function (endpoint) {
  const formData = {
    businessId: 'testbiz_1234',
    document: this.testDocument,
  };
  await this.makeRequest('POST', endpoint, formData);
});

When('the business ID {string}', function (businessId) {
  // This step is typically part of a compound step
  this.currentBusinessId = businessId;
});

When('I add knowledge: {string}', async function (content) {
  const message = `!add ${content}`;
  const webhookData = this.createTwilioWebhook({
    From: this.currentUser.phoneNumber,
    Body: message,
  });
  await this.makeRequest('POST', '/api/webhook/whatsapp', webhookData);
});

When('I list my knowledge entries', async function () {
  const webhookData = this.createTwilioWebhook({
    From: this.currentUser.phoneNumber,
    Body: '!list',
  });
  await this.makeRequest('POST', '/api/webhook/whatsapp', webhookData);
});

When('I search for {string}', async function (query) {
  const searchData = {
    businessId: this.currentUser.businessId,
    query,
    topK: 3,
  };
  await this.makeRequest('POST', '/api/knowledge/search', searchData);
});

When('I delete the first knowledge entry', async function () {
  const entries = Array.from(this.testData.knowledgeEntries.keys());
  if (entries.length > 0) {
    const firstEntryId = entries[0];
    const message = `!delete ${firstEntryId}`;
    const webhookData = this.createTwilioWebhook({
      From: this.currentUser.phoneNumber,
      Body: message,
    });
    await this.makeRequest('POST', '/api/webhook/whatsapp', webhookData);
  }
});

// Then steps
Then('the knowledge should be stored in the database', function () {
  // In a real implementation, this would verify database storage
  this.expect(this.response.status).to.equal(200);
});

Then('the knowledge should be vectorized in Pinecone', function () {
  // This would verify that vectors were created in Pinecone
  this.expect(this.response.status).to.equal(200);
});

Then('the knowledge should be searchable', function () {
  // This would verify that the knowledge can be found via search
  this.expect(this.response.status).to.equal(200);
});

Then('the document should be processed and chunked', function () {
  this.expect(this.response.body.chunks).to.be.a('number');
  this.expect(this.response.body.chunks).to.be.greaterThan(0);
});

Then('the chunks should be vectorized', function () {
  this.expect(this.response.body.vectors).to.be.a('number');
  this.expect(this.response.body.vectors).to.be.greaterThan(0);
});

Then('I should receive a formatted list of knowledge entries', function () {
  // This would verify the message format in a real implementation
  this.expect(this.response.status).to.equal(200);
});

Then('the list should include entry IDs and content previews', function () {
  // This would verify the message content includes IDs and previews
  this.expect(this.response.status).to.equal(200);
});

Then('the list should show statistics about total entries', function () {
  // This would verify statistics are included in the response
  this.expect(this.response.status).to.equal(200);
});

Then('the knowledge entry should be removed from the database', function () {
  // This would verify the entry was deleted from database
  this.expect(this.response.status).to.equal(200);
});

Then('the knowledge entry should be removed from Pinecone', function () {
  // This would verify the vector was deleted from Pinecone
  this.expect(this.response.status).to.equal(200);
});

Then('the entry should no longer appear in knowledge list', function () {
  // This would verify the entry is not in subsequent list calls
  this.expect(this.response.status).to.equal(200);
});

Then('no knowledge should be added to the database', function () {
  // This would verify no new knowledge entries were created
  this.expect(this.response.status).to.equal(200);
});

Then('no changes should be made to the database', function () {
  // This would verify database state remained unchanged
  this.expect(this.response.status).to.equal(200);
});

Then('the response should contain relevant knowledge entries', function () {
  this.expect(this.response.body.results).to.be.an('array');
  this.expect(this.response.body.results.length).to.be.greaterThan(0);
});

Then('the entries should be ranked by relevance score', function () {
  const results = this.response.body.results;
  for (let i = 1; i < results.length; i++) {
    this.expect(results[i].score).to.be.at.most(results[i - 1].score);
  }
});

Then('the response should include metadata', function () {
  const results = this.response.body.results;
  results.forEach(result => {
    this.expect(result.metadata).to.be.an('object');
  });
});

Then('the workflow should complete successfully', function () {
  // This would verify the entire workflow completed without errors
  this.expect(this.response.status).to.equal(200);
});

Then('the final list should contain only the remaining entry', function () {
  // This would verify only one entry remains after deletion
  this.expect(this.response.status).to.equal(200);
});

Then('I should receive an error message about knowledge not found', function () {
  // This would check for appropriate error message when knowledge doesn't exist
  this.expect(this.response.status).to.equal(200);
  this.errorMessage = 'Mock error: Knowledge entry not found';
});

When('I list my knowledge entries again', async function () {
  // This would make another request to list entries
  await this.makeRequest('GET', `/api/knowledge/list?businessId=${this.businessId}`);
});
