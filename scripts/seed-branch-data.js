const mongoose = require('mongoose');
const Branch = require('../src/models/Branch');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Invoice = require('../src/models/Invoice');
const { connectDB } = require('../src/config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    // 1. Get Branches
    const branches = await Branch.find({});
    if (branches.length === 0) {
      console.log('No branches found. Attempting to create one...');
      // Implementation skipped for now as we assume user will create via UI now that it's fixed
      // or we can create dummy one
    }

    console.log(`Found ${branches.length} branches.`);

    for (const branch of branches) {
      console.log(`Seeding data for branch: ${branch.name}`);
      
      // Update Branch inventory for some products
      const products = await Product.find({ tenant: branch.tenant });
      for (const product of products) {
        // Check if branch in inventory
        const exists = product.inventory.find(inv => inv.branch.toString() === branch._id.toString());
        if (!exists) {
          product.inventory.push({
             branch: branch._id,
             quantity: Math.floor(Math.random() * 100) + 10,
             minQuantity: 5,
             location: 'Main Shelf'
          });
          await product.save();
        }
      }
      // 2. Create Mock Invoices (Sales)
      const customer = await mongoose.model('Customer').findOne({ tenant: branch.tenant });
      
      if (customer && products.length > 0) {
        console.log('Generating mock sales...');
        const numInvoices = Math.floor(Math.random() * 20) + 10; // 10-30 invoices
        
        for (let i = 0; i < numInvoices; i++) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const qty = Math.floor(Math.random() * 5) + 1;
            const total = randomProduct.price * qty;
            
            // Random date in last 30 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

            await Invoice.create({
                tenant: branch.tenant,
                branch: branch._id, // Ensure your Invoice model supports branch field!
                invoiceNumber: `INV-${branch.name.substring(0,2).toUpperCase()}-${Date.now()}-${i}`,
                customer: customer._id,
                items: [{
                    product: randomProduct._id,
                    productName: randomProduct.name,
                    quantity: qty,
                    unitPrice: randomProduct.price,
                    totalPrice: total
                }],
                subtotal: total,
                totalAmount: total,
                paidAmount: total,
                remainingAmount: 0,
                paymentMethod: 'cash',
                status: 'paid',
                createdAt: date
            });
        }
        console.log(`Created ${numInvoices} mock invoices.`);
      } else {
          console.log('Skipping sales generation (No customer or products found).');
      }
    }

    console.log('Data injection (Inventory & Sales) complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
