/**
 * Twilio Integration Test Script
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testTwilioIntegration() {
    console.log('🧪 Testing Twilio WhatsApp Integration\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        
        if (healthResponse.data.twilio?.isHealthy) {
            console.log('✅ Twilio service is healthy');
        } else {
            console.log('❌ Twilio service is not healthy');
        }

        // Test 2: Webhook Status
        console.log('\n2️⃣ Testing Webhook Status...');
        const webhookResponse = await axios.get(`${BASE_URL}/webhooks/status`);
        console.log('✅ Webhook endpoint is accessible');
        console.log(`   Registered businesses: ${webhookResponse.data.twilio?.registeredBusinesses || 0}`);

        // Test 3: Register Test Business
        console.log('\n3️⃣ Testing Business Registration...');
        const registerResponse = await axios.post(`${BASE_URL}/api/businesses/register`, {
            businessName: 'Test Pizza Palace',
            whatsappNumber: 'whatsapp:+14155238886',
            ownerPhone: '+1234567890'
        });

        if (registerResponse.data.success) {
            console.log('✅ Business registration successful');
            console.log(`   Business ID: ${registerResponse.data.businessId}`);
        } else {
            console.log('❌ Business registration failed');
            console.log(`   Error: ${registerResponse.data.error}`);
        }

        // Test 4: List Businesses
        console.log('\n4️⃣ Testing Business Listing...');
        const businessesResponse = await axios.get(`${BASE_URL}/api/businesses`);
        console.log(`✅ Found ${businessesResponse.data.businesses?.length || 0} registered businesses`);

        // Test 5: Test Webhook
        console.log('\n5️⃣ Testing Webhook Endpoint...');
        const webhookTestResponse = await axios.post(`${BASE_URL}/webhooks/test`, {
            test: 'Twilio integration test'
        });

        if (webhookTestResponse.data.status === 'ok') {
            console.log('✅ Webhook test successful');
        } else {
            console.log('❌ Webhook test failed');
        }

        // Test 6: Simulate Twilio Webhook
        console.log('\n6️⃣ Simulating Twilio Webhook...');
        const mockTwilioData = {
            MessageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            From: 'whatsapp:+1234567890',
            To: 'whatsapp:+14155238886',
            Body: '!help',
            ProfileName: 'Test User'
        };

        try {
            const mockWebhookResponse = await axios.post(`${BASE_URL}/webhooks/twilio/whatsapp`, mockTwilioData);
            console.log('✅ Mock webhook processed successfully');
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('⚠️ Mock webhook rejected (signature validation) - this is expected in production');
            } else {
                console.log('❌ Mock webhook processing failed');
                console.log(`   Error: ${error.message}`);
            }
        }

        console.log('\n🎉 Twilio Integration Test Complete!');
        console.log('\n📋 Next Steps:');
        console.log('1. Configure Twilio webhook URL in Twilio Console');
        console.log('2. Set up production WhatsApp Business API');
        console.log('3. Register real businesses using the API');
        console.log('4. Test with actual WhatsApp messages');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the server is running:');
            console.log('   npm start');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    testTwilioIntegration();
}

module.exports = { testTwilioIntegration };