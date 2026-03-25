const fetch = require('node-fetch');

async function testStatus() {
  const url = 'http://localhost:3000/api/status/check';
  const appId = 'ECR-NG-MN5UJGCM6Z4A3';
  
  console.log(`Testing status check for: ${appId}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationNo: appId })
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data.applicationNo === appId) {
      console.log('✅ TEST PASSED: Unified status check returned correct record.');
    } else {
      console.log('❌ TEST FAILED: Response was not successful or data mismatch.');
    }
  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
  }
}

testStatus();
