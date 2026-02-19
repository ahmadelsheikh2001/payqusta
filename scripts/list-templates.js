require('dotenv').config();
const axios = require('axios');

async function listTemplates() {
  const wabaId = '2276981936154434';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiUrl = 'https://graph.facebook.com/v21.0';

  console.log('🔍 Fetching templates from WABA:', wabaId);
  console.log('');

  try {
    const response = await axios.get(
      `${apiUrl}/${wabaId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 },
      }
    );

    const templates = response.data?.data || [];
    
    console.log(`✅ Found ${templates.length} templates:\n`);
    
    templates.forEach((t, i) => {
      console.log(`${i + 1}. Name: "${t.name}"`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Language: ${t.language}`);
      console.log(`   Category: ${t.category}`);
      console.log(`   ID: ${t.id}`);
      console.log('');
    });

    console.log('\n📋 Approved templates only:');
    const approved = templates.filter(t => t.status === 'APPROVED');
    approved.forEach(t => {
      console.log(`   ✅ ${t.name} (${t.language})`);
    });

    if (approved.length === 0) {
      console.log('   ⚠️  No approved templates found!');
      console.log('   You need to create and get approval for templates first.');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
  }
}

listTemplates();
