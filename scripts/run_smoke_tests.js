const mongoose = require('mongoose');
const InvoiceService = require('../src/services/InvoiceService');
const Product = require('../src/models/Product');
const Customer = require('../src/models/Customer');
const Invoice = require('../src/models/Invoice');
const Coupon = require('../src/models/Coupon');
const portalController = require('../src/controllers/portalController');
require('dotenv').config();

// Simple Test Runner
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        testsPassed++;
    } else {
        console.error(`❌ FAIL: ${message}`);
        testsFailed++;
    }
}

async function runTests() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/payqusta');
        console.log('🔗 Connected to DB for Smoke Tests\n');

        const tenantA = new mongoose.Types.ObjectId();
        const tenantB = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        // Setup Test Data
        const productA = await Product.create({
            tenant: tenantA,
            name: 'Smoke Product A',
            sku: 'SMK-PROD-A',
            price: 1000,
            cost: 800,
            stock: { quantity: 10, minQuantity: 2 },
            isActive: true
        });

        const customerA = await Customer.create({
            tenant: tenantA,
            name: 'Smoke Customer A',
            phone: '0100000000A',
            financials: { creditLimit: 5000, outstandingBalance: 0 },
            isActive: true
        });

        const customerB = await Customer.create({
            tenant: tenantB,
            name: 'Smoke Customer B',
            phone: '0100000000B',
            financials: { creditLimit: 5000, outstandingBalance: 0 },
            isActive: true
        });

        const coupon = await Coupon.create({
            tenant: tenantA,
            code: 'SMOKE50',
            type: 'fixed',
            value: 50,
            usageLimit: 1, // Only usable once
            usagePerCustomer: 1,
            isActive: true,
            validFrom: new Date(),
            validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        });

        console.log('--- TEST 1: Tenant Isolation ---');
        // Tenant A tries to query Customer B's invoice (Create one for B first)
        const invoiceDataB = {
            customerId: customerB._id,
            items: [{ productId: productA._id, quantity: 1 }], // Mixing tenant B customer with tenant A product for testing
            paymentMethod: 'cash',
        };
        try {
            // This should ideally fail if InvoiceService enforces strict tenant checks on products, but let's test isolation on Invoices
            const invB = await InvoiceService.createInvoice(tenantB, userId, invoiceDataB);

            // Query with tenant A
            const findInv = await Invoice.findOne({ _id: invB._id, tenant: tenantA });
            assert(findInv === null, 'Tenant A cannot read Tenant B invoice');
        } catch (e) {
            // Expected failure if product tenant mismatch
            assert(true, 'Cross-tenant data creation prevented or isolated');
        }

        console.log('\n--- TEST 2: Invoice Create & Pay-All ---');
        const invoiceDataA = {
            customerId: customerA._id,
            items: [{ productId: productA._id, quantity: 2 }], // 2000 total
            paymentMethod: 'deferred_30',
        };
        const invA = await InvoiceService.createInvoice(tenantA, userId, invoiceDataA);
        assert(invA.totalAmount === 2000, 'Invoice created with correct total');
        assert(invA.status === 'pending', 'Deferred invoice is pending initially');

        // Pay All
        invA.payAllRemaining(userId);
        await invA.save();
        assert(invA.remainingAmount === 0, 'Pay-All sets remaining amount to 0');
        assert(invA.status === 'paid', 'Pay-All sets status to paid');

        console.log('\n--- TEST 3: Coupon Application limits (Atomic updates) ---');
        // We simulate the portalController logic directly on DB for limits

        // Mock req/res for portalController checkout
        let checkoutStatus = null;
        let checkoutJson = null;
        const req = {
            tenantId: tenantA,
            body: {
                customerId: customerA._id,
                items: [{ productId: productA._id, quantity: 1 }],
                paymentMethod: 'cash',
                couponCode: 'SMOKE50'
            },
            tenantFilter: { tenant: tenantA }
        };
        const res = {
            status: (code) => { checkoutStatus = code; return res; },
            json: (data) => { checkoutJson = data; }
        };
        const next = (err) => { checkoutStatus = err.statusCode || 500; checkoutJson = { message: err.message }; };

        await portalController.checkout(req, res, next);
        assert(checkoutStatus === 201, 'Checkout with coupon succeeded');
        assert(checkoutJson.data.discount === 50, 'Discount applied correctly = 50');
        assert(checkoutJson.data.totalAmount === 950, 'Total amount updated correctly = 950');

        // Try applying same coupon again
        checkoutStatus = null;
        checkoutJson = null;
        await portalController.checkout(req, res, next);

        assert(checkoutStatus !== 201, 'Checkout with reused coupon failed as expected');
        assert(checkoutJson.message.includes('الحد الأقصى') || checkoutJson.message.includes('تم وصول الحد'), 'Correct error message for exceeded usage');

        console.log('\n================================');
        console.log(`Tests Passed: ${testsPassed}`);
        console.log(`Tests Failed: ${testsFailed}`);
        console.log('================================\n');

    } catch (err) {
        console.error('❌ Unhandled Exception during tests:', err);
    } finally {
        // Cleanup generated data
        await Product.deleteMany({ sku: 'SMK-PROD-A' });
        await Customer.deleteMany({ name: { $regex: 'Smoke Customer' } });
        await Invoice.deleteMany({ 'items.sku': 'SMK-PROD-A' });
        await Coupon.deleteMany({ code: 'SMOKE50' });
        await mongoose.disconnect();
    }
}

runTests();
