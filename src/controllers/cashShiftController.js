/**
 * Cash Shift Controller
 */

const CashShift = require('../models/CashShift');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

class CashShiftController {
  
  /**
   * Helper: Calculate cash stats for a specific user/shift timeframe
   */
  async _calculateShiftStats(tenantId, userId, startTime, endTime = new Date()) {
    // 1. Direct Cash Sales (Invoices created as 'CASH')
    // These usually don't have a 'payment' record array item in this system design (based on create method)
    const cashInvoices = await Invoice.aggregate([
      {
        $match: {
          tenant: tenantId,
          createdBy: userId,
          paymentMethod: 'cash',
          createdAt: { $gte: startTime, $lte: endTime }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Cash Payments on Invoices (Installments, Deferred, Partial)
    // These are stored in the 'payments' array
    const cashPayments = await Invoice.aggregate([
      {
        $match: {
          tenant: tenantId,
          'payments.recordedBy': userId,
          'payments.date': { $gte: startTime, $lte: endTime },
          'payments.method': 'cash'
        }
      },
      { $unwind: '$payments' },
      {
        $match: {
          'payments.recordedBy': userId,
          'payments.date': { $gte: startTime, $lte: endTime },
          'payments.method': 'cash'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalInvoices = cashInvoices[0]?.total || 0;
    const countInvoices = cashInvoices[0]?.count || 0;
    
    const totalPayments = cashPayments[0]?.total || 0;
    const countPayments = cashPayments[0]?.count || 0;

    return {
      totalCashSales: totalInvoices + totalPayments,
      breakdown: {
        directSales: totalInvoices,
        directCount: countInvoices,
        collections: totalPayments,
        collectionsCount: countPayments,
        totalTransactions: countInvoices + countPayments
      }
    };
  }

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

      // Calculate current sales in real-time
      const stats = await this._calculateShiftStats(
        shift.tenant, 
        req.user._id, 
        shift.startTime
      );
      
      const response = shift.toObject();
      response.currentSales = stats.totalCashSales;
      response.expectedNow = shift.openingBalance + stats.totalCashSales;
      response.breakdown = stats.breakdown;

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

      // Calculate final stats
      const endTime = new Date();
      const stats = await this._calculateShiftStats(
        shift.tenant,
        req.user._id,
        shift.startTime,
        endTime
      );

      const expectedCash = shift.openingBalance + stats.totalCashSales;
      const variance = (actualCash || 0) - expectedCash;

      shift.status = 'closed';
      shift.endTime = endTime;
      shift.totalCashSales = stats.totalCashSales;
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
      // Admin sees all, others see only their own
      if (req.user.role !== 'admin' && !req.user.isSuperAdmin) {
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
