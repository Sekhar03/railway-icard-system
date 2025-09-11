async function testSpecificData() {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = 'http://localhost:3000';
    
    console.log('Testing with your specific data...\n');
    
    // Test with the _id from your database
    try {
        const response = await fetch(`${baseUrl}/api/status/gazetted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicationNo: '685af2eecc7126103156d85a', // Your _id
                dob: '2025-06-16' // Your dob
            })
        });
        
        const data = await response.json();
        console.log('✅ Test with _id successful');
        console.log('   Response:', data.success ? 'Found application' : data.message);
        if (data.success && data.data) {
            console.log('   Name:', data.data.name);
            console.log('   RUID:', data.data.ruid);
            console.log('   Status:', data.data.status);
        }
    } catch (error) {
        console.log('❌ Test with _id failed:', error.message);
    }
    
    // Test with RUID
    try {
        const response = await fetch(`${baseUrl}/api/status/gazetted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ruid: 'dvxb', // Your RUID
                dob: '2025-06-16' // Your dob
            })
        });
        
        const data = await response.json();
        console.log('\n✅ Test with RUID successful');
        console.log('   Response:', data.success ? 'Found application' : data.message);
        if (data.success && data.data) {
            console.log('   Name:', data.data.name);
            console.log('   RUID:', data.data.ruid);
            console.log('   Status:', data.data.status);
        }
    } catch (error) {
        console.log('❌ Test with RUID failed:', error.message);
    }
    
    console.log('\nTest completed!');
}

testSpecificData().catch(console.error); 