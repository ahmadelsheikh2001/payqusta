/**
 * List all users in the database
 * Usage: node scripts/list-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const users = await User.find().select('name email role tenant isSuperAdmin isActive');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      process.exit(0);
    }

    console.log(`📋 Found ${users.length} user(s):\n`);
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Role: ${user.role}`);
      console.log(`   👑 Super Admin: ${user.isSuperAdmin ? 'Yes' : 'No'}`);
      console.log(`   ✅ Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();
