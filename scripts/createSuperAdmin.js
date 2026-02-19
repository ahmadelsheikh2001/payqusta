/**
 * Create Super Admin User
 * Run: node scripts/createSuperAdmin.js
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/payqusta';

async function createSuperAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existing = await User.findOne({ email: 'super@payqusta.com' });
    if (existing) {
      console.log('❌ Super Admin already exists!');
      console.log('Email:', existing.email);
      console.log('Name:', existing.name);
      console.log('Is Super Admin:', existing.isSuperAdmin);
      
      // Update to make sure it's super admin
      existing.isSuperAdmin = true;
      existing.role = 'admin';
      await existing.save();
      console.log('✅ Updated existing user to Super Admin');
      
      process.exit(0);
    }

    // Create new super admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'super@payqusta.com',
      password: '123456', // Will be hashed automatically
      phone: '01000000000',
      role: 'admin',
      isSuperAdmin: true,
      tenant: null, // Super Admin has no tenant
    });

    console.log('✅ Super Admin created successfully!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password: 123456');
    console.log('👑 Super Admin:', superAdmin.isSuperAdmin);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
