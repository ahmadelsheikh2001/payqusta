require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppService = require('../src/services/WhatsAppService');
const logger = require('../src/utils/logger');

async function verifyWhatsApp() {
  console.log('🔍 Starting WhatsApp Verification...');

  // 1. Check Configuration
  console.log('\n1. Checking Configuration...');
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WABA_ID;

  if (!phoneId || !token) {
    console.error('❌ Missing WhatsApp credentials in .env');
    console.log(`   WHATSAPP_PHONE_NUMBER_ID: ${phoneId ? '✅' : '❌'}`);
    console.log(`   WHATSAPP_ACCESS_TOKEN: ${token ? '✅' : '❌'}`);
    return;
  }
  console.log('✅ Credentials found in .env');

  // 2. Check Service Configuration
  if (!WhatsAppService.isConfigured()) {
    console.error('❌ WhatsAppService reports not configured.');
    return;
  }
  console.log('✅ WhatsAppService is configured.');

  // 3. Test Template Fetching (connects to Meta)
  console.log('\n2. Testing Connectivity (Fetching Templates)...');
  try {
    const templates = await WhatsAppService.getTemplates(wabaId);
    if (templates.success) {
      console.log(`✅ Connection successful! Found ${templates.totalOnAccount} templates.`);
      console.log('   Required Templates Status:');
      templates.requiredTemplates.forEach(t => {
        console.log(`   - ${t.purpose}: ${t.exists ? '✅' : '❌'} (${t.status})`);
      });
    } else {
      console.error('❌ Failed to fetch templates:', templates.error);
      if (templates.reason === 'not_configured') {
        console.error('   Reason: Service not configured correctly.');
      }
    }
  } catch (error) {
    console.error('❌ Exception during template fetch:', error.message);
  }

  // 4. Usage Points Analysis
  console.log('\n3. Integration Points Analysis:');
  console.log('   - Invoices: sendInvoiceNotification (Template/Message)');
  console.log('   - Payments: sendPaymentReceivedTemplate (Template)');
  console.log('   - Reminders: sendPaymentReminderTemplate (Template)');
  console.log('   - Customers: sendStatementTemplate (Template)');
  console.log('   - Suppliers: sendRestockTemplate (Template)');
  console.log('   - Suppliers: sendDocument (PDF)');
  
  console.log('\n✅ Verification Logic Complete.');
  console.log('ℹ️  To test actual sending, use the "Test Connection" button in Settings > Notifications.');
}

verifyWhatsApp();
