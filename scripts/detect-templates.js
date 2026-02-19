require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppService = require('../src/services/WhatsAppService');

async function detectTemplates() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const wabaId = '2276981936154434';
    
    console.log(`🔍 Detecting templates from WABA: ${wabaId}...`);
    const result = await WhatsAppService.autoDetectTemplates(wabaId);

    if (!result.success) {
      console.error('❌ Failed to detect templates:', result.error || result.message);
      process.exit(1);
    }

    console.log(`✅ Found ${result.totalTemplates} templates (${result.approvedCount} approved)\n`);
    
    console.log('📋 Auto-detected template mapping:');
    if (Object.keys(result.detectedMap).length === 0) {
      console.log('⚠️  No templates auto-detected. Available templates:');
      result.allTemplates.forEach(t => {
        console.log(`   - ${t.name} (${t.status}) [${t.language}]`);
      });
      console.log('\nℹ️  Make sure template names contain keywords like: invoice, statement, reminder, payment, restock');
    } else {
      for (const [purpose, templateName] of Object.entries(result.detectedMap)) {
        const lang = result.detectedLanguages[purpose];
        console.log(`   ✅ ${purpose}: ${templateName} [${lang}]`);
      }
    }

    if (result.unmapped && result.unmapped.length > 0) {
      console.log(`\n⚠️  Unmapped purposes: ${result.unmapped.join(', ')}`);
    }

    // Update Tenant with detected templates
    console.log('\n💾 Updating tenant configuration...');
    const Tenant = require('../src/models/Tenant');
    const tenant = await Tenant.findOne({}); // Get first tenant (or you can specify one)
    
    if (tenant) {
      if (!tenant.whatsapp) tenant.whatsapp = {};
      tenant.whatsapp.wabaId = wabaId;
      tenant.whatsapp.templateNames = result.detectedMap;
      tenant.whatsapp.templateLanguages = result.detectedLanguages;
      await tenant.save();
      console.log(`✅ Updated tenant "${tenant.name}" with detected templates`);
    } else {
      console.log('⚠️  No tenant found to update');
    }

    console.log('\n✅ Done! Templates are now mapped and ready to use.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

detectTemplates();
