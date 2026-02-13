/**
 * Database Seeder — Populates initial data for testing
 * Run: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('../config/database');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');

const seed = async () => {
  await connectDB();

  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
    Customer.deleteMany({}),
    Supplier.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // Drop old indexes to avoid conflicts
  try {
    await Tenant.collection.dropIndexes();
    await User.collection.dropIndexes();
    await Product.collection.dropIndexes();
    await Customer.collection.dropIndexes();
    await Supplier.collection.dropIndexes();
    await Notification.collection.dropIndexes();
  } catch (e) {
    // Indexes might not exist yet, ignore
  }

  // Ensure indexes are rebuilt
  await Promise.all([
    Tenant.ensureIndexes(),
    User.ensureIndexes(),
    Product.ensureIndexes(),
    Customer.ensureIndexes(),
    Supplier.ensureIndexes(),
  ]);

  // 1. Create Tenant
  console.log('🏪 Creating tenant...');
  const tenant = await Tenant.create({
    name: 'إلكترونيات المعادي',
    slug: 'maadi-electronics',
    businessInfo: {
      phone: '01000000000',
      email: 'info@maadi-electronics.com',
      address: 'المعادي، القاهرة',
    },
    branding: {
      primaryColor: '#6366f1',
      secondaryColor: '#10b981',
    },
    settings: {
      currency: 'EGP',
      lowStockThreshold: 5,
      enableGamification: true,
    },
    subscription: {
      plan: 'professional',
      status: 'active',
      maxProducts: 500,
      maxCustomers: 1000,
      maxUsers: 10,
    },
  });

  // 2. Create Users
  console.log('👤 Creating users...');

  // Admin User (Super Admin - linked to tenant for data operations)
  const adminUser = await User.create({
    name: 'مدير النظام',
    email: 'admin@payqusta.com',
    phone: '01999999999',
    password: 'admin123456',
    role: 'admin',
    tenant: tenant._id,
  });

  const vendorUser = await User.create({
    name: 'محمد أحمد',
    email: 'vendor@payqusta.com',
    phone: '01000000000',
    password: '123456',
    role: 'vendor',
    tenant: tenant._id,
  });

  tenant.owner = vendorUser._id;
  await tenant.save();

  const coordinatorUser = await User.create({
    name: 'أحمد المنسق',
    email: 'coordinator@payqusta.com',
    phone: '01100000000',
    password: '123456',
    role: 'coordinator',
    tenant: tenant._id,
  });

  // 3. Create Suppliers
  console.log('🚛 Creating suppliers...');
  const suppliers = await Supplier.insertMany([
    {
      tenant: tenant._id,
      name: 'أبل مصر',
      contactPerson: 'محمد كمال',
      phone: '01001001001',
      email: 'apple@supplier.com',
      paymentTerms: 'deferred_30',
      financials: { totalPurchases: 500000, totalPaid: 250000, outstandingBalance: 250000 },
      isActive: true,
    },
    {
      tenant: tenant._id,
      name: 'سامسونج مصر',
      contactPerson: 'أحمد فتحي',
      phone: '01002002002',
      email: 'samsung@supplier.com',
      paymentTerms: 'deferred_45',
      financials: { totalPurchases: 300000, totalPaid: 180000, outstandingBalance: 120000 },
      isActive: true,
    },
    {
      tenant: tenant._id,
      name: 'إل جي مصر',
      contactPerson: 'علي حسن',
      phone: '01003003003',
      email: 'lg@supplier.com',
      paymentTerms: 'cash',
      financials: { totalPurchases: 100000, totalPaid: 100000, outstandingBalance: 0 },
      isActive: true,
    },
  ]);

  // 4. Create Products
  console.log('📦 Creating products...');
  await Product.insertMany([
    { tenant: tenant._id, name: 'آيفون 15 برو ماكس', sku: 'IPH-15PM', category: 'هواتف', price: 52000, cost: 45000, stock: { quantity: 24, minQuantity: 5 }, supplier: suppliers[0]._id, isActive: true },
    { tenant: tenant._id, name: 'سامسونج S24 ألترا', sku: 'SAM-S24U', category: 'هواتف', price: 48000, cost: 40000, stock: { quantity: 18, minQuantity: 5 }, supplier: suppliers[1]._id, isActive: true },
    { tenant: tenant._id, name: 'ماك بوك برو M3', sku: 'MAC-M3P', category: 'لابتوب', price: 95000, cost: 82000, stock: { quantity: 8, minQuantity: 3 }, supplier: suppliers[0]._id, isActive: true },
    { tenant: tenant._id, name: 'آيباد برو 12.9', sku: 'IPD-129', category: 'تابلت', price: 42000, cost: 36000, stock: { quantity: 2, minQuantity: 5 }, stockStatus: 'low_stock', supplier: suppliers[0]._id, isActive: true },
    { tenant: tenant._id, name: 'سماعة AirPods Max', sku: 'APM-001', category: 'إكسسوارات', price: 22000, cost: 18000, stock: { quantity: 30, minQuantity: 10 }, supplier: suppliers[0]._id, isActive: true },
    { tenant: tenant._id, name: 'شاشة LG 4K 27"', sku: 'LG-27-4K', category: 'شاشات', price: 15000, cost: 11000, stock: { quantity: 0, minQuantity: 3 }, stockStatus: 'out_of_stock', supplier: suppliers[2]._id, isActive: true },
    { tenant: tenant._id, name: 'كيبورد Logitech MX', sku: 'LOG-MXK', category: 'إكسسوارات', price: 4500, cost: 3200, stock: { quantity: 45, minQuantity: 15 }, isActive: true },
    { tenant: tenant._id, name: 'ماوس Razer DeathAdder', sku: 'RZR-DA', category: 'إكسسوارات', price: 2800, cost: 1800, stock: { quantity: 60, minQuantity: 20 }, isActive: true },
  ]);

  // 5. Create Customers
  console.log('👥 Creating customers...');
  await Customer.insertMany([
    { tenant: tenant._id, name: 'أحمد محمد علي', phone: '01012345678', email: 'ahmed@email.com', address: 'المعادي، القاهرة', tier: 'vip', financials: { totalPurchases: 185000, totalPaid: 161000, outstandingBalance: 24000 }, gamification: { points: 1850, totalEarnedPoints: 1850 } },
    { tenant: tenant._id, name: 'فاطمة حسن', phone: '01098765432', email: 'fatma@email.com', address: 'مدينة نصر، القاهرة', tier: 'premium', financials: { totalPurchases: 92000, totalPaid: 80000, outstandingBalance: 12000 }, gamification: { points: 920, totalEarnedPoints: 920 } },
    { tenant: tenant._id, name: 'محمود سعيد', phone: '01155566677', email: 'mahmoud@email.com', address: 'الدقي، الجيزة', tier: 'normal', financials: { totalPurchases: 45000, totalPaid: 45000, outstandingBalance: 0 }, gamification: { points: 450, totalEarnedPoints: 450 } },
    { tenant: tenant._id, name: 'نورا عبدالله', phone: '01234567890', email: 'noura@email.com', address: 'الزمالك، القاهرة', tier: 'vip', financials: { totalPurchases: 320000, totalPaid: 272000, outstandingBalance: 48000 }, gamification: { points: 3200, totalEarnedPoints: 3200 } },
    { tenant: tenant._id, name: 'كريم وليد', phone: '01111222333', email: 'karim@email.com', address: 'المهندسين، الجيزة', tier: 'normal', financials: { totalPurchases: 67000, totalPaid: 62000, outstandingBalance: 5000 }, gamification: { points: 670, totalEarnedPoints: 670 } },
    { tenant: tenant._id, name: 'سارة إبراهيم', phone: '01066677788', email: 'sara@email.com', address: 'حلوان، القاهرة', tier: 'normal', financials: { totalPurchases: 28000, totalPaid: 20000, outstandingBalance: 8000 }, gamification: { points: 280, totalEarnedPoints: 280 } },
  ]);

  // --- Seed Notifications ---
  console.log('🔔 Creating sample notifications...');
  await Notification.insertMany([
    { tenant: tenant._id, recipient: vendorUser._id, type: 'invoice_created', title: 'فاتورة جديدة', message: 'تم إنشاء فاتورة INV-20260201-AB12 للعميل أحمد محمد بمبلغ 35,000 ج.م', icon: 'file-text', color: 'primary', link: '/invoices' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'payment_received', title: 'تم استلام دفعة 💰', message: 'استلمت 15,000 ج.م من أحمد محمد — فاتورة INV-20260201-AB12. المتبقي: 20,000 ج.م', icon: 'credit-card', color: 'success', link: '/invoices' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'installment_due', title: 'قسط مستحق غداً ⏰', message: 'العميل نورا عبدالله عليها قسط 8,000 ج.م مستحق غداً', icon: 'clock', color: 'warning', link: '/invoices' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'installment_overdue', title: 'قسط متأخر! ⚠️', message: 'العميل كريم وليد متأخر عن قسط 5,000 ج.م — فاتورة INV-20260128-CD34', icon: 'alert-triangle', color: 'danger', link: '/invoices' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'low_stock', title: 'مخزون منخفض ⚠️', message: 'المنتج "iPhone 15 Pro Max" وصل 3 قطع فقط (الحد الأدنى: 5)', icon: 'alert-triangle', color: 'warning', link: '/products' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'out_of_stock', title: 'منتج نفذ من المخزون! 🚨', message: 'المنتج "AirPods Pro" نفذ تماماً من المخزون', icon: 'package-x', color: 'danger', link: '/products' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'supplier_payment_due', title: 'خلي بالك! عليك قسط مورد 🚛', message: 'عليك قسط 50,000 ج.م للمورد Apple مستحق خلال يومين', icon: 'truck', color: 'warning', link: '/suppliers' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'customer_vip', title: 'ترقية عميل ⭐', message: 'العميل "نورا عبدالله" ترقت لعميل VIP! النقاط تخطت 3200', icon: 'star', color: 'warning', link: '/customers' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'new_customer', title: 'عميل جديد 🎉', message: 'تم إضافة العميل "سارة إبراهيم" بنجاح', icon: 'user-plus', color: 'success', link: '/customers' },
    { tenant: tenant._id, recipient: vendorUser._id, type: 'system', title: 'مرحباً بك في PayQusta! 🚀', message: 'حسابك جاهز — ابدأ بإضافة المنتجات وإنشاء أول فاتورة', icon: 'bell', color: 'primary', link: '/', isRead: true, readAt: new Date() },
  ]);

  console.log(`
╔══════════════════════════════════════════════╗
║         ✅ Seed Completed Successfully        ║
║──────────────────────────────────────────────║
║  👑 ADMIN         : admin@payqusta.com       ║
║     Password     : admin123456               ║
║                                              ║
║  Tenant          : إلكترونيات المعادي        ║
║  📱 Vendor       : vendor@payqusta.com       ║
║     Password     : 123456                    ║
║  📋 Coordinator  : coordinator@payqusta.com  ║
║     Password     : 123456                    ║
║                                              ║
║  Products        : 8                         ║
║  Customers       : 6                         ║
║  Suppliers       : 3                         ║
║  Notifications   : 10                        ║
╚══════════════════════════════════════════════╝

💡 Pro Tip:
- Admin يشوف كل المتاجر (All Tenants)
- Vendor يشوف متجره فقط
- Coordinator صلاحيات محدودة
  `);

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
