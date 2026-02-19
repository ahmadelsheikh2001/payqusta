const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
    process.exit(1);
  }
};

const syncPermissions = async () => {
  await connectDB();

  try {
    console.log('🔄 Starting Tenant Permission Sync...');
    
    // 1. Get reference tenant (owner@makkah.com)
    // Actually, user wants ALL tenants to have "same privileges as owner@makkah.com"
    // I will enforce 'enterprise' plan and 'admin' role for all tenant owners.

    const tenants = await Tenant.find({ isActive: true });
    console.log(`📊 Found ${tenants.length} active tenants.`);

    for (const tenant of tenants) {
        console.log(`🔹 Processing Tenant: ${tenant.name} (${tenant.slug})`);

        // Update Subscription to Enterprise
        if (tenant.subscription?.plan !== 'enterprise') {
            tenant.subscription = {
                ...tenant.subscription,
                plan: 'enterprise',
                status: 'active',
                maxProducts: 10000,
                maxCustomers: 10000,
                maxUsers: 50
            };
            await tenant.save();
            console.log(`   ✅ Updated subscription to Enterprise`);
        } else {
            console.log(`   Detailed: Subscription already Enterprise`);
        }

        // Update Owner Role
        if (tenant.owner) {
            const owner = await User.findById(tenant.owner);
            if (owner) {
                let updated = false;
                if (owner.role !== 'admin') {
                    owner.role = 'admin';
                    updated = true;
                    console.log(`   ✅ Updated owner role to 'admin'`);
                }
                
                // Ensure owner has access to all features (if controlled by other flags)
                // For now, role='admin' + enterprise plan covers it.
                
                if (updated) await owner.save();
            } else {
                console.log(`   ⚠️ Owner user not found for tenant`);
            }
        } else {
            console.log(`   ⚠️ No owner assigned to tenant`);
        }
    }

    console.log('✅ Sync Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Script Error:', err);
    process.exit(1);
  }
};

syncPermissions();
