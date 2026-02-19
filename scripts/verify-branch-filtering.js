const mongoose = require('mongoose');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
const Branch = require('../src/models/Branch');
const Invoice = require('../src/models/Invoice');
const Product = require('../src/models/Product');
const DashboardController = require('../src/controllers/dashboardController');
const { connectDB } = require('../src/config/db');

// Mock Req/Res
const mockReq = (user, tenantId, query = {}) => ({
  user,
  tenantId,
  query,
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

const runVerification = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const owner = await User.findOne({ email: 'owner@makkah.com' });
    if (!owner) throw new Error('Owner not found');
    console.log('Owner found:', owner.email);

    const tenant = await Tenant.findById(owner.tenant);
    console.log('Tenant:', tenant.name);

    const branches = await Branch.find({ tenant: tenant._id });
    console.log(`Found ${branches.length} branches:`, branches.map(b => b.name));

    if (branches.length === 0) {
      console.log('No branches found to test filtering.');
      process.exit(0);
    }

    const branch1 = branches[0];
    
    // Test 1: Overview Global
    console.log('\n--- Testing Overview (Global) ---');
    const reqGlobal = mockReq(owner, tenant._id);
    const resGlobal = mockRes();
    const next = (err) => { if (err) console.error(err); };
    
    // We can't easily invoke controller directly if it uses `ApiResponse` helper which might use `res.status().json()`.
    // Let's assume dashboardController methods use `ApiResponse.success(res, data)`.
    // I need to check `dashboardController.js` to see if it imports `ApiResponse`. 
    // It likely requires `../utils/ApiResponse` or similar.
    // If I run this script in `scripts/`, paths might be wrong.
    // Let's rely on standard direct calls if possible or just inspect DB logic.
    
    // Actually, calling the static methods on Models is easier and tests the core logic.
    
    console.log('Fetching Sales Summary (Global)...');
    const salesGlobal = await Invoice.getSalesSummary(tenant._id, 30);
    console.log('Global Sales:', salesGlobal.totalSales);

    console.log(`Fetching Sales Summary (Branch: ${branch1.name})...`);
    const salesBranch = await Invoice.getSalesSummary(tenant._id, 30, branch1._id);
    console.log('Branch Sales:', salesBranch.totalSales);

    if (salesGlobal.totalSales >= salesBranch.totalSales) {
      console.log('✅ PASS: Global sales >= Branch sales');
    } else {
      console.error('❌ FAIL: Branch sales > Global sales (Impossible)');
    }

    // Test Stock Summary
    console.log('\n--- Testing Stock Summary ---');
    const stockGlobal = await Product.getStockSummary(tenant._id);
    console.log('Global Stock:', stockGlobal);
    
    const stockBranch = await Product.getStockSummary(tenant._id, branch1._id);
    console.log(`Branch Stock (${branch1.name}):`, stockBranch);

    // Note: Stock might be 0 if no inventory assigned to branch 1 yet.
    
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
};

runVerification();
