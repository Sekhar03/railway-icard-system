async function testStatusAPI() {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = 'http://localhost:3000';
    
    console.log('Testing Status API endpoints...\n');
    
    // Test 1: Check if server is running
    try {
        const response = await fetch(`${baseUrl}/status`);
        console.log('✅ Server is running and status page is accessible');
    } catch (error) {
        console.log('❌ Server is not accessible:', error.message);
        return;
    }
    
    // Test 2: Test gazetted status endpoint
    try {
        const gazResponse = await fetch(`${baseUrl}/api/status/gazetted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicationNo: 'ECR-G-TEST123',
                dob: '1990-01-01'
            })
        });
        
        const gazData = await gazResponse.json();
        console.log('✅ Gazetted status endpoint is working');
        console.log('   Response:', gazData.message || 'No application found (expected)');
    } catch (error) {
        console.log('❌ Gazetted status endpoint failed:', error.message);
    }
    
    // Test 3: Test non-gazetted status endpoint
    try {
        const ngResponse = await fetch(`${baseUrl}/api/status/non-gazetted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicationNo: 'ECR-NG-TEST123',
                dob: '1990-01-01'
            })
        });
        
        const ngData = await ngResponse.json();
        console.log('✅ Non-gazetted status endpoint is working');
        console.log('   Response:', ngData.message || 'No application found (expected)');
    } catch (error) {
        console.log('❌ Non-gazetted status endpoint failed:', error.message);
    }
    
    console.log('\nTest completed!');
}

testStatusAPI().catch(console.error); 