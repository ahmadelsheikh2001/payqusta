require('dotenv').config();
const mongoose = require('mongoose');

async function updateTemplateMapping() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Tenant = require('../src/models/Tenant');
    const tenant = await Tenant.findOne({});

    if (!tenant) {
      console.log('❌ No tenant found');
      process.exit(1);
    }

    console.log(`📝 Updating tenant: ${tenant.name}\n`);

    // Set WABA ID and template mappings
    tenant.whatsapp = tenant.whatsapp || {};
    tenant.whatsapp.wabaId = '841398878900170';
    tenant.whatsapp.templateNames = {
      invoice: 'payqusta_invoice',
      statement: 'payqusta_statement',
      reminder: 'payqusta_reminder',
      payment: 'payqusta_payment',
      restock: 'payqusta_restock',
    };
    tenant.whatsapp.templateLanguages = {
      invoice: 'ar_EG',
      statement: 'ar_EG',
      reminder: 'ar_EG',
      payment: 'ar_EG',
      restock: 'en',
    };

    await tenant.save();

    console.log('✅ Template mapping updated successfully!\n');
    console.log('Mapped templates:');
    console.log('  - invoice: payqusta_invoice (ar_EG)');
    console.log('  - statement: payqusta_statement (ar_EG)');
    console.log('  - reminder: payqusta_reminder (ar_EG)');
    console.log('  - payment: payqusta_payment (ar_EG)');
    console.log('  - restock: payqusta_restock (en)');
    console.log('\n✅ Done! Try sending a restock request again.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateTemplateMapping();
