/**
 * Quick Script to Create Admin User
 * Run: node create-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payqusta');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@payqusta.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'مدير النظام',
      email: 'admin@payqusta.com',
      phone: '01999999999',
      password: 'admin123456',
      role: 'admin',
      tenant: null,
    });

    console.log(`
╔══════════════════════════════════════════════╗
║         ✅ Admin Created Successfully!        ║
║──────────────────────────────────────────────║
║  Email    : admin@payqusta.com               ║
║  Password : admin123456                      ║
║  Role     : admin                            ║
║  Tenant   : null (all tenants)               ║
╚══════════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
