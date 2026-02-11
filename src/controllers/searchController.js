const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Global Search Controller
 * Provides unified search across all entities
 */
class SearchController {
  /**
   * GET /api/v1/search?q=...
   * Global search across products, customers, invoices, suppliers
   */
  async globalSearch(req, res, next) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return ApiResponse.success(res, {
          products: [],
          customers: [],
          invoices: [],
          suppliers: [],
          total: 0,
        }, 'أدخل كلمة بحث (حرفين على الأقل)');
      }

      const searchTerm = q.trim();
      const filter = req.tenantFilter;

      // Create search regex (case-insensitive)
      const regex = new RegExp(searchTerm, 'i');

      // Search in parallel for better performance
      const [products, customers, invoices, suppliers] = await Promise.all([
        // Search Products
        Product.find({
          ...filter,
          isActive: true,
          $or: [
            { name: regex },
            { sku: regex },
            { barcode: regex },
            { category: regex },
            { tags: regex },
          ],
        })
          .limit(10)
          .select('name sku barcode category sellingPrice stock thumbnail')
          .lean(),

        // Search Customers
        Customer.find({
          ...filter,
          isActive: true,
          $or: [
            { name: regex },
            { phone: regex },
            { email: regex },
            { address: regex },
          ],
        })
          .limit(10)
          .select('name phone email totalSpent remainingBalance')
          .lean(),

        // Search Invoices
        Invoice.find({
          ...filter,
          $or: [
            { invoiceNumber: regex },
            { 'customer.name': regex }, // This won't work without populate, but we'll populate below
          ],
        })
          .limit(10)
          .populate('customer', 'name phone')
          .select('invoiceNumber totalAmount paidAmount remainingAmount status createdAt')
          .sort('-createdAt')
          .lean(),

        // Search Suppliers
        Supplier.find({
          ...filter,
          isActive: true,
          $or: [
            { name: regex },
            { phone: regex },
            { email: regex },
            { contactPerson: regex },
          ],
        })
          .limit(10)
          .select('name phone email contactPerson totalDebt')
          .lean(),
      ]);

      // Calculate total results
      const total = products.length + customers.length + invoices.length + suppliers.length;

      ApiResponse.success(res, {
        query: searchTerm,
        products: products.map(p => ({
          ...p,
          type: 'product',
          displayText: `${p.name} (${p.sku})`,
          link: `/products`,
        })),
        customers: customers.map(c => ({
          ...c,
          type: 'customer',
          displayText: `${c.name} - ${c.phone}`,
          link: `/customers`,
        })),
        invoices: invoices.map(i => ({
          ...i,
          type: 'invoice',
          displayText: `${i.invoiceNumber} - ${i.customer?.name || 'عميل محذوف'}`,
          link: `/invoices`,
        })),
        suppliers: suppliers.map(s => ({
          ...s,
          type: 'supplier',
          displayText: `${s.name} - ${s.phone}`,
          link: `/suppliers`,
        })),
        total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/search/suggestions?q=...
   * Quick search suggestions (autocomplete)
   */
  async getSearchSuggestions(req, res, next) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return ApiResponse.success(res, []);
      }

      const searchTerm = q.trim();
      const filter = req.tenantFilter;
      const regex = new RegExp(searchTerm, 'i');

      // Get top 5 from each category
      const [products, customers, invoices] = await Promise.all([
        Product.find({
          ...filter,
          isActive: true,
          $or: [{ name: regex }, { sku: regex }, { barcode: regex }],
        })
          .limit(5)
          .select('name sku')
          .lean(),

        Customer.find({
          ...filter,
          isActive: true,
          $or: [{ name: regex }, { phone: regex }],
        })
          .limit(5)
          .select('name phone')
          .lean(),

        Invoice.find({
          ...filter,
          invoiceNumber: regex,
        })
          .limit(5)
          .populate('customer', 'name')
          .select('invoiceNumber')
          .lean(),
      ]);

      // Format suggestions
      const suggestions = [
        ...products.map(p => ({
          id: p._id,
          text: `${p.name} (${p.sku})`,
          type: 'product',
          icon: '📦',
        })),
        ...customers.map(c => ({
          id: c._id,
          text: `${c.name} - ${c.phone}`,
          type: 'customer',
          icon: '👤',
        })),
        ...invoices.map(i => ({
          id: i._id,
          text: `${i.invoiceNumber} - ${i.customer?.name || 'عميل محذوف'}`,
          type: 'invoice',
          icon: '📄',
        })),
      ];

      ApiResponse.success(res, suggestions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/search/quick?barcode=...
   * Quick search by barcode (for POS/Quick Sale)
   */
  async quickSearchByBarcode(req, res, next) {
    try {
      const { barcode } = req.query;

      if (!barcode) {
        return ApiResponse.badRequest('الباركود مطلوب');
      }

      const product = await Product.findOne({
        ...req.tenantFilter,
        isActive: true,
        $or: [{ barcode }, { sku: barcode }],
      })
        .populate('supplier', 'name phone')
        .lean();

      if (!product) {
        return ApiResponse.notFound('المنتج غير موجود');
      }

      ApiResponse.success(res, product);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SearchController();
