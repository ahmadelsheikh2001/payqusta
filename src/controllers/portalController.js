/**
 * Customer Portal Controller
 * Handles authentication, dashboard, and shopping for customers
 */

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');

// Helper to generate token for customer
const generateToken = (id) => {
  return jwt.sign({ id, role: 'customer' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

class PortalController {
  /**
   * POST /api/v1/portal/login
   * Login with phone and password
   */
  login = catchAsync(async (req, res, next) => {
    const { phone, password, tenantSlug } = req.body;

    if (!phone || !password) {
      return next(AppError.badRequest('رقم الهاتف وكلمة المرور مطلوبين'));
    }

    // Resolve tenant from slug or header (optional if domain mapping used later)
    // For now, let's assume phone is unique per tenant, but since phone isn't unique globally,
    // we need the tenant context.
    // If tenantSlug is not provided, we might fail or search across all (risky).
    // Let's require tenantId in header 'X-Tenant-ID' or derive from slug if passed.
    
    let tenantId = req.headers['x-tenant-id'];
    if (!tenantId && tenantSlug) {
      const tenant = await Tenant.findOne({ slug: tenantSlug });
      if (tenant) tenantId = tenant._id;
    }

    const query = { phone };
    if (tenantId) query.tenant = tenantId;

    // Find customer (select password)
    const customer = await Customer.findOne(query).select('+password').populate('tenant', 'name slug branding');

    console.log(`[Portal Login Debug] Phone: ${phone}, TenantId: ${tenantId || 'N/A'}`);
    console.log(`[Portal Login Debug] Customer Found: ${customer ? 'Yes' : 'No'}`);
    
    if (customer) {
        const isMatch = await customer.matchPassword(password);
        console.log(`[Portal Login Debug] Password Match: ${isMatch}`);
    }

    if (!customer || !(await customer.matchPassword(password))) {
      return next(AppError.unauthorized('بيانات الدخول غير صحيحة'));
    }

    if (!customer.isActive) {
      return next(AppError.unauthorized('تم تعطيل هذا الحساب'));
    }
    
    if (customer.salesBlocked) {
        // We might still allow login to see debt, but maybe warn
    }

    const token = generateToken(customer._id);

    // Update last login
    customer.lastLogin = new Date();
    await customer.save({ validateBeforeSave: false });

    // Hide confidential fields
    customer.password = undefined;

    ApiResponse.success(res, {
      token,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
        balance: customer.financials.creditLimit - customer.financials.outstandingBalance,
        creditLimit: customer.financials.creditLimit,
        outstanding: customer.financials.outstandingBalance,
        points: customer.gamification.points
      },
      tenant: customer.tenant
    }, 'تم تسجيل الدخول بنجاح');
  });

  /**
   * GET /api/v1/portal/dashboard
   * Get balance, upcoming installments, and recent activity
   */
  getDashboard = catchAsync(async (req, res, next) => {
    const customerId = req.user.id; // From auth middleware

    const customer = await Customer.findById(customerId).populate('tenant', 'name branding settings');
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    // Get upcoming installments
    const invoices = await Invoice.find({
      customer: customerId,
      status: { $in: ['pending', 'partially_paid', 'overdue'] }
    }).sort('installments.dueDate');

    const upcomingInstallments = [];
    invoices.forEach(inv => {
      inv.installments.forEach(inst => {
        if (inst.status !== 'paid') {
          upcomingInstallments.push({
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            amount: inst.amount - (inst.paidAmount || 0),
            dueDate: inst.dueDate,
            installmentNumber: inst.installmentNumber,
            status: inst.status
          });
        }
      });
    });

    // Sort by due date
    upcomingInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Get recent orders
    const recentOrders = await Invoice.find({ customer: customerId })
      .sort('-createdAt')
      .limit(5)
      .select('invoiceNumber totalAmount status createdAt items');

    ApiResponse.success(res, {
      profile: {
        name: customer.name,
        tier: customer.tier,
        points: customer.gamification.points,
      },
      wallet: {
        creditLimit: customer.financials.creditLimit,
        usedCredit: customer.financials.outstandingBalance,
        availableCredit: Math.max(0, customer.financials.creditLimit - customer.financials.outstandingBalance),
        currency: customer.tenant.settings.currency || 'EGP'
      },
      upcomingInstallments: upcomingInstallments.slice(0, 5),
      recentOrders
    });
  });

  /**
   * GET /api/v1/portal/products
   * List available products for purchase
   */
  getProducts = catchAsync(async (req, res, next) => {
    const customer = await Customer.findById(req.user.id);
    const { page = 1, limit = 20, search, category } = req.query;

    const filter = {
      tenant: customer.tenant,
      isActive: true,
      stockStatus: { $ne: 'out_of_stock' } // Only show available
    };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (category) {
      filter.category = category;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('name description price images thumbnail category stockStatus stock.quantity')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort('-createdAt'),
      Product.countDocuments(filter)
    ]);

    ApiResponse.paginated(res, products, { page, limit, total });
  });

  /**
   * POST /api/v1/portal/cart/checkout
   * Place an order using credit limit
   */
  checkout = catchAsync(async (req, res, next) => {
    const { items } = req.body; // [{ productId, quantity }]
    const customer = await Customer.findById(req.user.id);

    if (customer.salesBlocked) {
      return next(AppError.forbidden(`عذراً، الشراء موقوف حالياً: ${customer.salesBlockedReason || 'يرجى مراجعة الإدارة'}`));
    }

    if (!items || items.length === 0) {
      return next(AppError.badRequest('السلة فارغة'));
    }

    // Validate products and calculate total
    let totalAmount = 0;
    const invoiceItems = [];
    const productUpdates = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, tenant: customer.tenant, isActive: true });
      if (!product) return next(AppError.badRequest(`المنتج غير متوفر (ID: ${item.productId})`));
      
      const qty = Number(item.quantity) || 1;
      if (product.stock.quantity < qty) {
        return next(AppError.badRequest(`الكمية المطلوبة من "${product.name}" غير متوفرة`));
      }

      totalAmount += product.price * qty;
      invoiceItems.push({
        product: product._id,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: product.price * qty,
        cost: product.cost // Internal use
      });

      productUpdates.push({ product, qty });
    }

    // Check Credit Limit
    const availableCredit = customer.financials.creditLimit - customer.financials.outstandingBalance;
    if (totalAmount > availableCredit) {
      return next(AppError.badRequest(`عذراً، الرصيد المتاح (${availableCredit}) لا يكفي لإتمام الطلب (${totalAmount})`));
    }

    // Create Invoice (Order)
    const InvoiceController = require('./invoiceController'); // Reusing logic? Or create directly.
    // Let's create directly to avoid req/res parsing complexity of reusing controller
    
    // Dynamic Installment Plan
    // Check if tenant allows installments and what the default/max months are
    // For now, let's look for a setting or default to 1 month (cash/immediate) if not configured
    // or 6 months as per previous logic but safer.
    
    const installmentSettings = customer.tenant.settings?.installments || {};
    const months = installmentSettings.defaultMonths || 6; 
    
    // Future: Allow user to select months from frontend (req.body.months) if within range
    // const months = req.body.months || installmentSettings.defaultMonths || 1;

    const installments = [];
    const monthlyAmount = Math.ceil(totalAmount / months);
    const today = new Date();

    for (let i = 1; i <= months; i++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() + i);
        installments.push({
            installmentNumber: i,
            dueDate: date,
            amount: i === months ? totalAmount - (monthlyAmount * (months - 1)) : monthlyAmount,
            status: 'pending'
        });
    }

    // Save Order
    const invoice = await Invoice.create({
      tenant: customer.tenant,
      branch: customer.branch, // Assign to customer's branch
      customer: customer._id,
      items: invoiceItems,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'pending', // Pending approval or active? Let's say 'pending' review by admin for now, or 'active' if auto-approved
      paymentMethod: 'installment',
      installments,
      createdBy: null, // Self-service
      notes: 'طلب من خلال تطبيق العملاء (Portal)'
    });

    // Update Stock
    for (const update of productUpdates) {
      await Product.findByIdAndUpdate(update.product._id, { $inc: { 'stock.quantity': -update.qty } });
    }

    // Update Customer Balance
    customer.recordPurchase(totalAmount);
    await customer.save();

    // Notify Admin
    const Notification = require('../models/Notification');
    // Notify all admins and vendors of this tenant
    // Ideally use a helper, but direct create is fine for now
    await Notification.create({
        tenant: customer.tenant,
        type: 'order',
        title: 'طلب جديد من البوابة',
        message: `طلب جديد رقم #${invoice.invoiceNumber} بقيمة ${totalAmount} من العميل ${customer.name}`,
        data: { 
            invoiceId: invoice._id, 
            customerId: customer._id,
            actionUrl: `/invoices/${invoice._id}` 
        }
    });

    ApiResponse.created(res, { orderId: invoice._id, totalAmount }, 'تم استلام طلبك بنجاح');
  });
}

module.exports = new PortalController();
