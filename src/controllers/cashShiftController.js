/**
 * Cash Shift Controller
 */

const CashShift = require('../models/CashShift');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

class CashShiftController {
  
  // Get current active shift for the logged-in user
  async getCurrent(req, res, next) {
    try {
      const shift = await CashShift.findOne({
        user: req.user._id,
        status: 'open',
        ...req.tenantFilter
      });

      if (!shift) {
        return ApiResponse.success(res, null, 'لا توجد وردية مفتوحة');
      }

      // Calculate current sales in real-time for display
      const sales = await Invoice.aggregate([
        {
          $match: {
            tenant: shift.tenant, // ensure tenant scope
            createdBy: req.user._id,
            paymentMethod: 'cash',
            createdAt: { $gte: shift.startTime }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' } // Or paidAmount if strictly cash paid? Invoice usually has paidAmount. Let's use totalAmount for simplicity if fully paid, or we should check paidAmount.
            // Better to match status: 'paid' or sum only paid parts?
            // Simplified: Sum 'totalAmount' for 'cash' invoices.
          }
        }
      ]);
      
      const currentSales = sales[0]?.total || 0;
      
      const response = shift.toObject();
      response.currentSales = currentSales;
      response.expectedNow = shift.openingBalance + currentSales;

      ApiResponse.success(res, response);
    } catch (error) {
      next(error);
    }
  }

  async openShift(req, res, next) {
    try {
      // Check if already open
      const existing = await CashShift.findOne({
        user: req.user._id,
        status: 'open',
        ...req.tenantFilter
      });
      
      if (existing) {
        return next(AppError.badRequest('لديك وردية مفتوحة بالفعل'));
      }

      const { openingBalance } = req.body;
      
      const shift = await CashShift.create({
        tenant: req.tenantId,
        user: req.user._id,
        openingBalance: openingBalance || 0,
        status: 'open',
        startTime: new Date()
      });

      ApiResponse.created(res, shift, 'تم فتح الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  async closeShift(req, res, next) {
    try {
      const { actualCash, notes } = req.body;
      
      const shift = await CashShift.findOne({
        user: req.user._id,
        status: 'open',
        ...req.tenantFilter
      });

      if (!shift) return next(AppError.badRequest('لا توجد وردية مفتوحة لإغلاقها'));

      // Calculate Cash Sales during this shift
      // We look for invoices created by this user, method=cash, since startTime
      const salesAgg = await Invoice.aggregate([
        {
          $match: {
            tenant: shift.tenant,
            createdBy: req.user._id,
            paymentMethod: 'cash',
            createdAt: { $gte: shift.startTime }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' } 
          }
        }
      ]);

      const totalCashSales = salesAgg[0]?.total || 0;
      const expectedCash = shift.openingBalance + totalCashSales;
      const variance = (actualCash || 0) - expectedCash;

      shift.status = 'closed';
      shift.endTime = new Date();
      shift.totalCashSales = totalCashSales;
      shift.expectedCash = expectedCash;
      shift.actualCash = actualCash || 0;
      shift.variance = variance;
      shift.notes = notes;
      shift.closedBy = req.user._id;

      await shift.save();

      ApiResponse.success(res, shift, 'تم إغلاق الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
      const filter = { ...req.tenantFilter };
      
      // Optionally filter by user if not admin?
      // Admin sees all, user sees own?
      // For now let's show all for simplicity or add query param
      if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
         filter.user = req.user._id;
      }

      const [shifts, total] = await Promise.all([
        CashShift.find(filter)
          .sort(sort || '-createdAt')
          .skip(skip)
          .limit(limit)
          .populate('user', 'name')
          .lean(),
        CashShift.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, shifts, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CashShiftController();
