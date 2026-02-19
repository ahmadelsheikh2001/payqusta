const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Customer = require('../src/models/Customer');
const Product = require('../src/models/Product');
const Tenant = require('../src/models/Tenant'); // Assuming Tenant model exists
const bcrypt = require('bcryptjs');

dotenv.config({ path: './.env' });

const seedPortal = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB...');

    // 1. Get Default Tenant (Owner)
    const tenant = await Tenant.findOne();
    if (!tenant) {
      console.error('❌ No tenant found! Please run the app setup first.');
      process.exit(1);
    }
    console.log(`ℹ️ Using Tenant: ${tenant.name}`);

    // 2. Create/Update Test Customer
    const testPhone = '01000000001';
    const testPass = '123456';
    
    // We need to manually hash because findOneAndUpdate bypasses pre-save hooks usually, 
    // but here we will use find and save.
    let customer = await Customer.findOne({ phone: testPhone, tenant: tenant._id });

    if (!customer) {
        customer = new Customer({
            name: 'عميل تجريبي',
            phone: testPhone,
            tenant: tenant._id,
            password: testPass, // Will be hashed by pre-save
            isActive: true,
            financials: {
                creditLimit: 50000,
                outstandingBalance: 0,
                totalPurchases: 0
            }
        });
        await customer.save();
        console.log(`✅ Created Test Customer: ${testPhone} / ${testPass}`);
    } else {
        // Reset balance and password
        customer.password = testPass; // pre-save will hash
        customer.financials.creditLimit = 50000;
        customer.financials.outstandingBalance = 0;
        await customer.save();
        console.log(`✅ Reset Test Customer: ${testPhone} / ${testPass}`);
    }

    // 3. Ensure a Test Product Exists
    let product = await Product.findOne({ name: 'منتج تجريبي', tenant: tenant._id });
    if (!product) {
        product = await Product.create({
            name: 'منتج تجريبي',
            description: 'هذا منتج مخصص لتجربة الشراء من البوابة',
            price: 500,
            cost: 300,
            stock: { quantity: 100 },
            tenant: tenant._id,
            isActive: true,
            category: 'تجربة'
        });
        console.log('✅ Created Test Product');
    } else {
        console.log('ℹ️ Test Product already exists');
    }

    console.log('\n🎉 Setup Complete!');
    console.log('===========================================');
    console.log(`Login URL: http://localhost:5173/portal/login`);
    console.log(`Phone:     ${testPhone}`);
    console.log(`Password:  ${testPass}`);
    console.log('===========================================');

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedPortal();
