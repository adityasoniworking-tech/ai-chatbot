const axios = require('axios');

async function testChat() {
    try {
        const response = await axios.post('http://localhost:5000/api/chat', {
            messages: [
                { role: 'user', content: 'hii' }
            ]
        });
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

testChat();
