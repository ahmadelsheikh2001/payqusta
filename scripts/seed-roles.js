/**
 * Seed Roles Script
 * Creates Super Admin, Tenant Admin, and Branch User for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
const Branch = require('../src/models/Branch');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // 1. Create Tenant (Store)
    let tenant = await Tenant.findOne({ email: 'owner@makkah.com' }); // Search by unique owner email or similar if name isn't unique enough, but name is fine for seed
    // Better to check by name if we are sure
    tenant = await Tenant.findOne({ name: 'محل أعلاف مكة' });
    
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'محل أعلاف مكة',
        businessInfo: {
          phone: '01000000001',
          address: 'القاهرة، مصر',
          category: 'أعلاف'
        },
        subscription: {
           plan: 'professional',
           status: 'active'
        }
      });
      console.log('✅ Created Tenant: محل أعلاف مكة');
    }

    // 2. Create Branch
    let branch = await Branch.findOne({ name: 'فرع الهرم', tenant: tenant._id });
    if (!branch) {
      branch = await Branch.create({
        name: 'فرع الهرم',
        tenant: tenant._id,
        address: 'شارع الهرم، الجيزة',
        phone: '01000000002',
        isMain: true
      });
      console.log('✅ Created Branch: فرع الهرم');
    }

    // 3. Create Super Admin (Full Control - System Owner)
    // IMPORTANT: Super Admin should NOT belong to a specific tenant in the same way, or can have a dummy one.
    // In our schema, tenant is required for non-superadmins. 
    // Let's check User model: tenant is required if role != ADMIN and !isSuperAdmin.
    // So SuperAdmin can have null tenant.
    
    let superAdmin = await User.findOne({ email: 'super@payqusta.com' });
    if (superAdmin) await User.deleteOne({ _id: superAdmin._id });
    
    superAdmin = await User.create({
      name: 'أحمد صاحب السستم',
      email: 'super@payqusta.com',
      password: 'password123',
      phone: '01000000003',
      isSuperAdmin: true,
      role: 'admin', // Role can be admin, but isSuperAdmin flag gives the power
      isActive: true
    });
    console.log('✅ Created Super Admin: super@payqusta.com');

    // 4. Create Tenant Admin (Store Owner)
    let tenantAdmin = await User.findOne({ email: 'owner@makkah.com' });
    if (tenantAdmin) await User.deleteOne({ _id: tenantAdmin._id });
    
    tenantAdmin = await User.create({
      name: 'مدير محلات مكة',
      email: 'owner@makkah.com',
      password: 'password123',
      phone: '01000000004',
      role: 'admin', // Admin role for the Tenant
      tenant: tenant._id,
      branch: branch._id, // Assign the main branch
      isActive: true
    });
    console.log('✅ Created Tenant Admin: owner@makkah.com');

    // Update tenant owner field
    tenant.owner = tenantAdmin._id;
    await tenant.save();
    console.log('✅ Linked Tenant Owner to Admin User');

    // 5. Create Branch User (Staff - Vendor/Cashier)
    let branchUser = await User.findOne({ email: 'staff@harem.com' });
    if (branchUser) await User.deleteOne({ _id: branchUser._id });
    
    branchUser = await User.create({
      name: 'كاشير فرع الهرم',
      email: 'staff@harem.com',
      password: 'password123',
      phone: '01000000005',
      role: 'vendor', // Vendor role for limited access
      tenant: tenant._id,
      branch: branch._id,
      isActive: true
    });
    console.log('✅ Created Branch User: staff@harem.com');

    console.log('\n🚀 Login Credentials:');
    console.log('------------------------');
    console.log('1. Super Admin (صاحب السستم):  super@payqusta.com / password123');
    console.log('2. Tenant Admin (صاحب المحل): owner@makkah.com / password123');
    console.log('3. Branch User (موظف الفرع):  staff@harem.com / password123');
    console.log('------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seed();
