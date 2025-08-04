#!/usr/bin/env node

/**
 * Simple test script to verify Aurora MCP integration
 */

const PORT = process.env.TRANSACTIONAL_SQLSERVER_FOOBAR_PORT || 8082;
const BASE_URL = `http://localhost:${PORT}`;

async function testAuroraMCP() {
  console.log('🧪 Testing Aurora MCP integration for SQL Server service...');
  console.log(`📍 Testing server at: ${BASE_URL}`);

  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);

    // Test 2: API info
    console.log('\n2️⃣ Testing API info endpoint...');
    const infoResponse = await fetch(`${BASE_URL}/`);
    const infoData = await infoResponse.json();
    console.log('✅ API info:', infoData);

    // Test 3: Chat status (Aurora MCP availability)
    console.log('\n3️⃣ Testing chat status (Aurora MCP availability)...');
    const statusResponse = await fetch(`${BASE_URL}/api/chat/status`);
    const statusData = await statusResponse.json();
    console.log('✅ Chat status:', statusData);

    if (statusData.anthropicKeyAvailable) {
      console.log('🔑 Anthropic API key is available');
    } else {
      console.log('⚠️  Anthropic API key is missing - chat functionality will be limited');
    }

    // Test 4: Simple chat test (if API key is available)
    if (statusData.anthropicKeyAvailable) {
      console.log('\n4️⃣ Testing simple chat interaction...');
      
      const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              id: 'test-1',
              role: 'user',
              content: 'Hello! Can you tell me about the Aurora MCP tools available?'
            }
          ]
        })
      });

      if (chatResponse.ok) {
        // For streaming responses, we'll just check if the response starts properly
        const reader = chatResponse.body.getReader();
        const { value } = await reader.read();
        const chunk = new TextDecoder().decode(value);
        console.log('✅ Chat response started successfully');
        console.log('📝 First chunk:', chunk.substring(0, 100) + '...');
        reader.releaseLock();
      } else {
        const errorData = await chatResponse.json();
        console.log('❌ Chat test failed:', errorData);
      }
    } else {
      console.log('⏭️  Skipping chat test - API key not available');
    }

    console.log('\n🎉 Aurora MCP integration test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Server is running and responsive');
    console.log('   - Chat endpoints are accessible');
    console.log(`   - Anthropic API key: ${statusData.anthropicKeyAvailable ? '✅ Available' : '❌ Missing'}`);
    console.log('   - Aurora MCP tools should be available when API key is set');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAuroraMCP();