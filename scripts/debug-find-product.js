const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const { connectDB } = require('../src/config/db');

const runDebug = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const productId = '698e409a1112e0b3f075fe3a'; // from user error
    console.log(`Searching for product: ${productId}`);

    const product = await Product.findById(productId);
    if (!product) {
      console.log('❌ Product NOT FOUND by ID directly.');
    } else {
      console.log('✅ Product FOUND by ID:', product.name);
      console.log('Tenant:', product.tenant);
      console.log('Available Stock:', product.stock.quantity);
      console.log('Is Active:', product.isActive);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Debug failed:', error);
    process.exit(1);
  }
};

runDebug();
