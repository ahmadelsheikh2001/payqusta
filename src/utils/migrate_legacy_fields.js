/**
 * Database Migration Script
 * Handles renaming legacy field names in documents to match the new unified schema:
 * - Product: sellingPrice -> price
 * - Product: costPrice -> cost
 * - Invoice: amountPaid -> paidAmount
 * 
 * Run with: node src/utils/migrate_legacy_fields.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');

// We use native MongoDB Node.js driver collections to bypass mongoose schemas and avoid validation errors on old data
const migrateFields = async () => {
    try {
        await connectDB();
        console.log('🔗 Connected to DB for Migration');

        const db = mongoose.connection.db;

        // 1. Products: Rename sellingPrice -> price, costPrice -> cost
        console.log('📦 Migrating Products collection...');

        const productsMatch = { $or: [{ sellingPrice: { $exists: true } }, { costPrice: { $exists: true } }] };
        const productsUpdate = {
            $rename: {
                "sellingPrice": "price",
                "costPrice": "cost"
            }
        };
        const productsResult = await db.collection('products').updateMany(productsMatch, productsUpdate);
        console.log(`✅ Products matched: ${productsResult.matchedCount}, modified: ${productsResult.modifiedCount}`);

        // 2. Invoices: Rename amountPaid -> paidAmount
        console.log('🧾 Migrating Invoices collection...');

        const invoicesMatch = { amountPaid: { $exists: true } };
        const invoicesUpdate = {
            $rename: {
                "amountPaid": "paidAmount"
            }
        };
        const invoicesResult = await db.collection('invoices').updateMany(invoicesMatch, invoicesUpdate);
        console.log(`✅ Invoices matched: ${invoicesResult.matchedCount}, modified: ${invoicesResult.modifiedCount}`);

        console.log('🎉 Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrateFields();
