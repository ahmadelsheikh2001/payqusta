const mongoose = require('mongoose');
const InvoiceService = require('./src/services/InvoiceService');
const Product = require('./src/models/Product');
const Customer = require('./src/models/Customer');
const User = require('./src/models/User'); // Assuming we have a User model
require('dotenv').config();

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/payqusta');
    console.log('✅ Connected to DB');

    const tenantId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId(); // Mock user ID

    // 1. Create a Product
    const product = await Product.create({
      tenant: tenantId,
      name: 'Test Product',
      sku: 'TEST-INV-' + Date.now(),
      price: 200,
      stock: { quantity: 100, minQuantity: 10, stockStatus: 'in_stock' },
      isActive: true
    });
    console.log('📦 Created Product:', product.name);

    // 2. Create a Customer
    const customer = await Customer.create({
      tenant: tenantId,
      name: 'Test Customer',
      phone: '01000000000',
      financials: { creditLimit: 5000, outstandingBalance: 0 },
      isActive: true
    });
    console.log('👤 Created Customer:', customer.name);

    // 3. Test Invoice Creation (Cash)
    console.log('🔄 Creating Invoice (Cash)...');
    const invoiceData = {
      customerId: customer._id,
      items: [
        { productId: product._id, quantity: 2 }
      ],
      paymentMethod: 'cash',
      discount: 0,
      notes: 'Test Invoice'
    };

    const invoice = await InvoiceService.createInvoice(tenantId, userId, invoiceData);
    console.log('🧾 Invoice Created:', invoice.invoiceNumber);
    console.log('   Total Amount:', invoice.totalAmount);
    console.log('   Status:', invoice.status);

    // 4. Verification Assertions
    if (invoice.totalAmount === 400 && invoice.status === 'paid') {
      console.log('✅ Cash Invoice Verified: Total is 400 and Paid.');
    } else {
      console.log('❌ Cash Invoice Verification Failed.');
    }

    // 5. Verify Stock Deduction
    const updatedProduct = await Product.findById(product._id);
    if (updatedProduct.stock.quantity === 98) {
      console.log('✅ Stock Deduction Verified: 100 -> 98');
    } else {
      console.log(`❌ Stock Deduction Failed: Expected 98, got ${updatedProduct.stock.quantity}`);
    }

    // 6. Test Installment Invoice
    console.log('🔄 Creating Invoice (Installment)...');
    const installmentData = {
      customerId: customer._id,
      items: [
        { productId: product._id, quantity: 2 }
      ],
      paymentMethod: 'installment',
      discount: 0,
      downPayment: 100,
      numberOfInstallments: 3,
      frequency: 'monthly'
    };

    const invInstallment = await InvoiceService.createInvoice(tenantId, userId, installmentData);
    console.log('🧾 Installment Invoice Created:', invInstallment.invoiceNumber);
    
    if (invInstallment.status === 'partially_paid' && invInstallment.installments.length === 3) {
      console.log('✅ Installment Invoice Verified: Partially Paid & 3 Installments created.');
    } else {
      console.log('❌ Installment Invoice Verification Failed.');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    // Cleanup
    // await Product.deleteMany({ sku: { $regex: 'TEST-INV-' } });
    await mongoose.disconnect();
  }
}

runTest();
