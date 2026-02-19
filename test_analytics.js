const mongoose = require('mongoose');
const AnalyticsService = require('./src/services/AnalyticsService');
const Invoice = require('./src/models/Invoice');
const Product = require('./src/models/Product');
require('dotenv').config();

// MOCK DATA GENERATOR
async function seedMockData(tenantId) {
  console.log('🌱 Seeding mock data...');
  
  // 1. Create a "Fast Moving" product (Stock 50, sells 5/day -> Run out in 10 days)
  const productA = await Product.create({
    tenant: tenantId,
    name: 'Fast Mover Test',
    sku: 'TEST-FAST',
    price: 100,
    isActive: true,
    stock: { quantity: 50, minQuantity: 10, stockStatus: 'in_stock' }
  });

  // 2. Create sales for last 30 days (150 units total)
  const invoices = [];
  for (let i = 0; i < 30; i++) {
    invoices.push({
      tenant: tenantId,
      totalAmount: 500,
      status: 'paid',
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Past dates
      items: [{ product: productA._id, quantity: 5, unitPrice: 100, totalPrice: 500 }]
    });
  }
  await Invoice.insertMany(invoices);
  
  console.log('✅ Mock data seeded.');
  return productA._id;
}

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/payqusta');
    console.log('Connected to DB');

    // Use a temp tenant ID for safety (or an existing one if needed for context)
    const tenantId = new mongoose.Types.ObjectId(); 

    // Seed
    const productId = await seedMockData(tenantId);

    // Run Forecast
    console.log('🔮 Running Forecast...');
    const forecast = await AnalyticsService.getStockForecast(tenantId);
    
    // Validate
    const item = forecast.find(f => f.productId.toString() === productId.toString());
    
    if (item) {
      console.log('📊 Forecast Result:', item);
      console.log(`- Name: ${item.name}`);
      console.log(`- Current Stock: ${item.currentStock}`);
      console.log(`- ADS (Avg Daily Sales): ${item.ads} (Expected: ~5.0)`);
      console.log(`- Days Until Stockout: ${item.daysUntilStockout} (Expected: ~10)`);
      console.log(`- Risk Status: ${item.status} (Expected: medium)`); // 10 days is <= 14 : medium/high? Logic says <=14 is medium.
      
      if (Math.abs(item.daysUntilStockout - 10) <= 1) {
         console.log('✅ TEST PASSED: Prediction is accurate.');
      } else {
         console.log('❌ TEST FAILED: Prediction mismatch.');
      }
    } else {
      console.log('❌ Item not found in forecast.');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    // Cleanup? Maybe keep for manual inspection if needed, or drop
    // await Product.deleteMany({ sku: 'TEST-FAST' });
    await mongoose.disconnect();
  }
}

runTest();
