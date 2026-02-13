/**
 * Expense Controller — Business Expense Management
 * Track expenses for real profit calculation
 */

const Expense = require('../models/Expense');
const { EXPENSE_CATEGORIES, EXPENSE_FREQUENCIES } = require('../models/Expense');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

// Helper: Calculate next due date for recurring expenses
function calculateNextDue(date, frequency) {
  const d = new Date(date);
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

class ExpenseController {
  /**
   * GET /api/v1/expenses
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query, 15);
      const filter = { ...req.tenantFilter, isActive: true };

      if (req.query.category) filter.category = req.query.category;
      if (req.query.from || req.query.to) {
        filter.date = {};
        if (req.query.from) filter.date.$gte = new Date(req.query.from);
        if (req.query.to) filter.date.$lte = new Date(req.query.to);
      }
      if (req.query.isRecurring) filter.isRecurring = req.query.isRecurring === 'true';

      const [expenses, total] = await Promise.all([
        Expense.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        Expense.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, expenses, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/expenses/summary
   */
  async getSummary(req, res, next) {
    try {
      const { from, to } = req.query;
      const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = to ? new Date(to) : new Date();

      const summary = await Expense.getSummary(req.tenantId, startDate, endDate);

      ApiResponse.success(res, {
        ...summary,
        period: { from: startDate, to: endDate },
        categories: EXPENSE_CATEGORIES,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/expenses/categories
   */
  async getCategories(req, res, next) {
    try {
      const categoryLabels = {
        rent: 'إيجار',
        salaries: 'رواتب',
        utilities: 'كهرباء/ماء/غاز',
        supplies: 'مستلزمات',
        marketing: 'تسويق',
        transport: 'نقل/مواصلات',
        maintenance: 'صيانة',
        other: 'أخرى',
      };

      ApiResponse.success(res, {
        categories: Object.entries(EXPENSE_CATEGORIES).map(([key, value]) => ({
          key: value,
          label: categoryLabels[value] || value,
        })),
        frequencies: Object.entries(EXPENSE_FREQUENCIES).map(([key, value]) => ({
          key: value,
          label: { once: 'مرة واحدة', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي' }[value],
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/expenses
   */
  async create(req, res, next) {
    try {
      const { title, description, category, amount, date, frequency, isRecurring, paymentMethod, reference } = req.body;

      const expense = await Expense.create({
        tenant: req.tenantId,
        title,
        description,
        category: category || 'other',
        amount,
        date: date || new Date(),
        frequency: frequency || 'once',
        isRecurring: isRecurring || false,
        paymentMethod: paymentMethod || 'cash',
        reference,
        createdBy: req.user._id,
        nextDueDate: isRecurring ? calculateNextDue(date || new Date(), frequency) : undefined,
      });

      ApiResponse.created(res, expense, 'تم إضافة المصروف بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/expenses/:id
   */
  async update(req, res, next) {
    try {
      const expense = await Expense.findOneAndUpdate(
        { _id: req.params.id, ...req.tenantFilter },
        req.body,
        { new: true, runValidators: true }
      );

      if (!expense) return next(AppError.notFound('المصروف غير موجود'));
      ApiResponse.success(res, expense, 'تم تحديث المصروف');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/expenses/:id
   */
  async delete(req, res, next) {
    try {
      const expense = await Expense.findOneAndUpdate(
        { _id: req.params.id, ...req.tenantFilter },
        { isActive: false },
        { new: true }
      );

      if (!expense) return next(AppError.notFound('المصروف غير موجود'));
      ApiResponse.success(res, null, 'تم حذف المصروف');
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new ExpenseController();
