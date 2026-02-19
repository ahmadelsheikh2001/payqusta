/**
 * Set User as Super Admin
 * Run this script to grant Super Admin privileges to a user
 * 
 * Usage: node scripts/set-super-admin.js <email>
 * Example: node scripts/set-super-admin.js admin@payqusta.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function setSuperAdmin(email) {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ User not found with email:', email);
      process.exit(1);
    }

    // Set as Super Admin
    user.isSuperAdmin = true;
    await user.save();

    console.log('✅ User set as Super Admin successfully!');
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.name);
    console.log('👑 Super Admin:', user.isSuperAdmin);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/set-super-admin.js <email>');
  process.exit(1);
}

setSuperAdmin(email);
