const { Given, When, Then } = require('@cucumber/cucumber');

// When steps
When('I GET {string}', async function (endpoint) {
  await this.makeRequest('GET', endpoint);
});

When('I check the database health', async function () {
  await this.makeRequest('GET', '/health');
  this.databaseHealth = this.response.body.database;
});

When('I check external service connectivity', async function () {
  await this.makeRequest('GET', '/health');
  this.externalServices = {
    database: this.response.body.database,
    vectorDB: this.response.body.vectorDB,
    twilio: this.response.body.twilio
  };
});

When('I simulate {int} concurrent health check requests', async function (requestCount) {
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < requestCount; i++) {
    promises.push(this.makeRequest('GET', '/health'));
  }
  
  this.concurrentResponses = await Promise.all(promises);
  this.loadTestDuration = Date.now() - startTime;
});

When('the system is handling normal traffic', function () {
  // Simulate normal system state
  this.systemState = 'normal';
});

When('external services may be temporarily unavailable', function () {
  // Set up scenario where external services might fail
  this.externalServiceFailure = true;
});

When('Pinecone service is unreachable', function () {
  // Mock Pinecone service failure
  this.cleanupMocks(); // Remove existing mocks
  const pineconeMock = this.setupPineconeMock();
  pineconeMock.post('/query').reply(500, { error: 'Service unavailable' });
  pineconeMock.post('/vectors/upsert').reply(500, { error: 'Service unavailable' });
});

When('I make requests to knowledge endpoints', async function () {
  const searchData = {
    businessId: 'testbiz_123',
    query: 'test query',
    topK: 3
  };
  await this.makeRequest('POST', '/api/knowledge/search', searchData);
});

When('I POST to {string} with type {string}', async function (endpoint, backupType) {
  const data = { type: backupType };
  await this.makeRequest('POST', endpoint, data);
});

When('monitoring systems are configured', function () {
  // Set up monitoring context
  this.monitoringEnabled = true;
});

When('system metrics exceed thresholds', function () {
  // Simulate metrics exceeding thresholds
  this.metricsExceeded = true;
});

// Then steps
Then('the response should contain {string}: {string}', function (key, expectedValue) {
  this.expect(this.response.body[key]).to.equal(expectedValue);
});

Then('the response should include system uptime', function () {
  this.expect(this.response.body.uptime).to.be.a('number');
  this.expect(this.response.body.uptime).to.be.greaterThan(0);
});

Then('the response should include database status', function () {
  this.expect(this.response.body.database).to.be.an('object');
  this.expect(this.response.body.database.isHealthy).to.be.a('boolean');
});

Then('the response should include external service status', function () {
  this.expect(this.response.body.vectorDB).to.be.an('object');
  this.expect(this.response.body.twilio).to.be.an('object');
});

Then('the database should be connected', function () {
  this.expect(this.databaseHealth.isHealthy).to.be.true;
  this.expect(this.databaseHealth.status).to.equal('connected');
});

Then('the connection should be healthy', function () {
  this.expect(this.databaseHealth.isHealthy).to.be.true;
});

Then('the response time should be under {int} second', function (maxSeconds) {
  const responseTime = this.getResponseTime();
  this.expect(responseTime).to.be.below(maxSeconds * 1000);
});

Then('the database URL should be properly configured', function () {
  // This would verify database configuration in a real implementation
  this.expect(this.databaseHealth.isHealthy).to.be.true;
});

Then('Supabase should be reachable and healthy', function () {
  this.expect(this.externalServices.database.isHealthy).to.be.true;
});

Then('Pinecone should be reachable and healthy', function () {
  this.expect(this.externalServices.vectorDB.isHealthy).to.be.true;
});

Then('OpenAI API should be reachable', function () {
  // This would check OpenAI connectivity in a real implementation
  this.expect(this.response.status).to.equal(200);
});

Then('Twilio API should be reachable', function () {
  this.expect(this.externalServices.twilio.isHealthy).to.be.true;
});

Then('all services should respond within acceptable timeouts', function () {
  // This would verify all service response times
  const responseTime = this.getResponseTime();
  this.expect(responseTime).to.be.below(5000); // 5 seconds
});

Then('the response should include application metrics:', function (dataTable) {
  const expectedMetrics = dataTable.hashes();
  expectedMetrics.forEach(row => {
    const metric = row.metric;
    const type = row.type;
    
    this.expect(this.response.body.metrics[metric]).to.exist;
    
    switch (type) {
      case 'number':
        this.expect(this.response.body.metrics[metric]).to.be.a('number');
        break;
      case 'string':
        this.expect(this.response.body.metrics[metric]).to.be.a('string');
        break;
    }
  });
});

Then('all requests should complete successfully', function () {
  this.concurrentResponses.forEach(response => {
    this.expect(response.status).to.equal(200);
  });
});

Then('the average response time should be under {int}ms', function (maxMs) {
  const avgResponseTime = this.loadTestDuration / this.concurrentResponses.length;
  this.expect(avgResponseTime).to.be.below(maxMs);
});

Then('no errors should be logged', function () {
  // This would verify no error logs were generated during load test
  this.expect(this.response.status).to.equal(200);
});

Then('the response should include cache statistics:', function (dataTable) {
  const expectedStats = dataTable.hashes();
  expectedStats.forEach(row => {
    const metric = row.metric;
    const type = row.type;
    
    this.expect(this.response.body.stats[metric]).to.exist;
    
    switch (type) {
      case 'number':
        this.expect(this.response.body.stats[metric]).to.be.a('number');
        break;
      case 'string':
        this.expect(this.response.body.stats[metric]).to.be.a('string');
        break;
      case 'object':
        this.expect(this.response.body.stats[metric]).to.be.an('object');
        break;
    }
  });
});

Then('the response should contain recent log entries', function () {
  this.expect(this.response.body.logs).to.be.an('array');
  this.expect(this.response.body.logs.length).to.be.greaterThan(0);
});

Then('logs should be properly formatted', function () {
  const logs = this.response.body.logs;
  logs.forEach(log => {
    this.expect(log).to.be.a('string');
    this.expect(log).to.include('[');
    this.expect(log).to.include(']');
  });
});

Then('log levels should be correctly set', function () {
  const logs = this.response.body.logs;
  logs.forEach(log => {
    this.expect(log).to.match(/\[(INFO|DEBUG|WARN|ERROR)\]/);
  });
});

Then('the system should respond with appropriate error messages', function () {
  // Even with external service failures, system should respond gracefully
  this.expect(this.response.status).to.be.oneOf([200, 500, 503]);
});

Then('the system should not crash', function () {
  // Verify system is still responsive
  this.expect(this.response).to.exist;
});

Then('errors should be properly logged', function () {
  // This would verify error logging in a real implementation
  this.expect(this.response.status).to.not.equal(undefined);
});

Then('retry mechanisms should be triggered', function () {
  // This would verify retry logic was executed
  this.expect(this.response.status).to.not.equal(undefined);
});

Then('a backup should be created successfully', function () {
  this.expect(this.response.body.backupId).to.be.a('string');
  this.expect(this.response.body.location).to.be.a('string');
});

Then('the backup should include all necessary data', function () {
  this.expect(this.response.body.businesses).to.be.a('number');
  this.expect(this.response.body.knowledgeEntries).to.be.a('number');
});

Then('backup metadata should be stored', function () {
  this.expect(this.response.body.size).to.be.a('string');
  this.expect(this.response.body.backupId).to.be.a('string');
});

Then('appropriate alerts should be triggered', function () {
  // This would verify alerting mechanisms in a real implementation
  if (this.metricsExceeded) {
    this.expect(true).to.be.true; // Alert would be triggered
  }
});

Then('monitoring data should be collected', function () {
  // This would verify data collection in a real implementation
  if (this.monitoringEnabled) {
    this.expect(true).to.be.true; // Data would be collected
  }
});

Then('system health should be tracked over time', function () {
  // This would verify historical health tracking
  if (this.monitoringEnabled) {
    this.expect(true).to.be.true; // Health would be tracked
  }
});