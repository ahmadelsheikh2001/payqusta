const mongoose = require('mongoose');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
const Branch = require('../src/models/Branch');
const { connectDB } = require('../src/config/db');

const runAnalysis = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const email = 'staff@harem.com';
    const user = await User.findOne({ email }).populate('tenant').populate('branch');

    if (!user) {
      console.log(`❌ User ${email} NOT FOUND.`);
      process.exit(0);
    }

    console.log('--- User Details ---');
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Tenant: ${user.tenant?.name}`);
    console.log(`Branch: ${user.branch?.name || 'None'}`);
    console.log(`Permissions:`, user.permissions || 'Default Role Permissions');
    
    process.exit(0);
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
};

runAnalysis();
