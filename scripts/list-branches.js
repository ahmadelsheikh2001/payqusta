const mongoose = require('mongoose');
const Branch = require('../src/models/Branch');
const { connectDB } = require('../src/config/db');

const listBranches = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const branches = await Branch.find({});
    if (branches.length === 0) {
      console.log('No branches found.');
    } else {
      console.log('--- Branches ---');
      branches.forEach(b => {
        console.log(`ID: ${b._id}, Name: ${b.name}, Tenant: ${b.tenant}`);
      });
    }
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

listBranches();
