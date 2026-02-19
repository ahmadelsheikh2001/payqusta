require('dotenv').config();
const axios = require('axios');

async function diagnose() {
  const phoneId = '2276981936154434'; // From your env or settings
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const to = '201024285083'; // Your number

  console.log('🔍 Starting WhatsApp Diagnosis...');
  console.log(`📱 Sending to: ${to}`);
  console.log(`🔑 Phone ID: ${phoneId}`);

  // 1. Send Text Message (Hello World)
  console.log('\n1️⃣  Attempting Text Message (Hello World)...');
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: '🔍 PayQusta Diagnostic Test: Text Message' }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Text Message Sent!', res.data);
  } catch (error) {
    console.error('❌ Text Message Failed:', error.response?.data || error.message);
  }

  // 2. Send Template (payqusta_restock)
  console.log('\n2️⃣  Attempting Template (payqusta_restock)...');
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: 'payqusta_restock',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'PayQusta Store' },
                { type: 'text', text: 'iPhone 15' },
                { type: 'text', text: '50 units' },
                { type: 'text', text: '5 units' }
              ]
            }
          ]
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Template Sent!', res.data);
  } catch (error) {
    console.error('❌ Template Failed:', error.response?.data || error.message);
  }
}

diagnose();
