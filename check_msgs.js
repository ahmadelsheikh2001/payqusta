const mongoose = require('mongoose');
const SupportMessage = require('./src/models/SupportMessage');
require('./src/models/Customer');
require('./src/models/Tenant');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const msgs = await SupportMessage.find({}).populate('customer').lean();
    console.log(JSON.stringify(msgs, null, 2));
    process.exit(0);
}

check().catch(console.error);
