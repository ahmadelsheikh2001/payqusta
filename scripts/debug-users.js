const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
    process.exit(1);
  }
};

const checkUsers = async () => {
  await connectDB();

  try {
    const email1 = 'owner@makkah.com';
    const email2 = 'elsheikh@payqusta.com';

    const users = await User.find({ email: { $in: [email1, email2] } }).populate('tenant');
    
    console.log('--- User Details ---');
    users.forEach(u => {
      console.log(`\nEmail: ${u.email}`);
      console.log(`Role: ${u.role}`);
      console.log(`Tenant ID: ${u.tenant?._id}`);
      console.log(`Tenant Name: ${u.tenant?.name}`);
      console.log(`Branch: ${u.branch}`);
      console.log(`Is Super Admin: ${u.isSuperAdmin}`);
      
      if (u.tenant && u.tenant.owner) {
          console.log(`Is Tenant Owner? ${u.tenant.owner.toString() === u._id.toString()}`);
          console.log(`Actual Tenant Owner ID: ${u.tenant.owner}`);
      }
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

checkUsers();
