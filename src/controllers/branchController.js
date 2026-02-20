/**
 * Branch Controller — Multi-Branch Management
 */

const Branch = require('../models/Branch');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');

class BranchController {
  /**
   * GET /api/v1/branches
   * List all branches for current tenant
   */
  async getBranches(req, res, next) {
    try {
      const filter = { ...req.tenantFilter };
      
      // For Super Admin, allow seeing all branches across tenants
      if (req.user?.isSuperAdmin && !req.tenantFilter) {
        delete filter.tenant;
      }

      const branches = await Branch.find(filter)
        .populate('manager', 'name email phone role')
        .populate('tenant', 'name email phone')
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        data: { branches }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/branches
   * Create new branch (Tenant Admin or Super Admin only)
   * Also creates a Branch Manager user
   */
  async createBranch(req, res, next) {
    try {
      const { name, address, phone, managerName, managerEmail, managerPassword, managerPhone, cameras, tenantId } = req.body;

      if (!name) return next(AppError.badRequest('اسم الفرع مطلوب'));

      // Determine which tenant to use
      let targetTenantId;
      if (req.user.isSuperAdmin && tenantId) {
        // Super Admin can create branch for any tenant
        targetTenantId = tenantId;
      } else {
        // Regular admin uses their own tenant
        targetTenantId = req.tenantId;
      }

      if (!targetTenantId) {
        return next(AppError.badRequest('لم يتم تحديد المتجر'));
      }

      // 1. Validate Manager Details if provided
      if (managerEmail || managerPassword || managerName) {
        if (!managerEmail || !managerPassword || !managerName || !managerPhone) {
          return next(AppError.badRequest('يرجى إدخال جميع بيانات مدير الفرع (الاسم، البريد، الهاتف، الرمز السري)'));
        }
        // Check if email exists
        const User = require('../models/User');
        const existingUser = await User.findOne({ email: managerEmail });
        if (existingUser) {
          return next(AppError.badRequest('البريد الإلكتروني للمدير مستخدم بالفعل'));
        }
      }

      // 2. Create Branch
      const branch = await Branch.create({
        name,
        address,
        phone,
        cameras,
        tenant: targetTenantId,
      });

      // 3. Create Manager User if details provided
      let managerUser = null;
      if (managerEmail) {
        const User = require('../models/User');
        const { ROLES } = require('../config/constants');
        
        managerUser = await User.create({
          name: managerName,
          email: managerEmail,
          password: managerPassword,
          phone: managerPhone,
          role: ROLES.COORDINATOR, // Branch Manager Role
          tenant: targetTenantId,
          branch: branch._id,
        });

        // Link manager to branch
        branch.manager = managerUser._id;
        await branch.save();
      }

      ApiResponse.success(res, { branch, manager: managerUser }, 'تم إنشاء الفرع وحساب المدير بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/branches/:id
   * Update branch
   */
  async updateBranch(req, res, next) {
    try {
      const { name, address, phone, manager, cameras, isActive } = req.body;

      const branch = await Branch.findById(req.params.id);
      if (!branch) return next(AppError.notFound('الفرع غير موجود'));

      // Check ownership (unless super admin)
      // Check ownership (unless super admin)
      // If user is 'admin' (Tenant Admin/Owner), they should be able to edit branches of their tenant
      if (!req.user.isSuperAdmin) {
        // If branch belongs to user's tenant, allow edit
        if (branch.tenant.toString() !== req.tenantId) {
           return next(AppError.forbidden('ليس لديك صلاحية لتعديل هذا الفرع'));
        }
      }

      if (name) branch.name = name;
      if (address !== undefined) branch.address = address;
      if (phone !== undefined) branch.phone = phone;
      if (cameras !== undefined) branch.cameras = cameras;
      if (isActive !== undefined) branch.isActive = isActive;

      await branch.save();

      // Update Manager Details
      const { managerName, managerEmail, managerPassword, managerPhone } = req.body;
      if (managerName || managerEmail || managerPhone || managerPassword) {
        const User = require('../models/User');
        const { ROLES } = require('../config/constants');

        if (branch.manager) {
          // Update existing manager
          const managerUser = await User.findById(branch.manager);
          if (managerUser) {
            if (managerName) managerUser.name = managerName;
            if (managerEmail) managerUser.email = managerEmail;
            if (managerPhone) managerUser.phone = managerPhone;
            if (managerPassword) managerUser.password = managerPassword; // Will be hashed by pre-save hook
            await managerUser.save();
          }
        } else {
          // Create new manager if none exists (rare case but good to handle)
          if (managerEmail && managerPassword && managerName && managerPhone) {
             const managerUser = await User.create({
              name: managerName,
              email: managerEmail,
              password: managerPassword,
              phone: managerPhone,
              role: ROLES.COORDINATOR,
              tenant: req.tenantId,
              branch: branch._id,
            });
            branch.manager = managerUser._id;
            await branch.save();
          }
        }
      }

      ApiResponse.success(res, { branch }, 'تم تحديث الفرع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/branches/:id
   * Delete branch (soft delete - set isActive = false)
   */
  async deleteBranch(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) return next(AppError.notFound('الفرع غير موجود'));

      // Check ownership
      if (!req.user.isSuperAdmin && branch.tenant.toString() !== req.tenantId) {
        return next(AppError.forbidden('ليس لديك صلاحية لحذف هذا الفرع'));
      }

      branch.isActive = false;
      await branch.save();

      ApiResponse.success(res, null, 'تم حذف الفرع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/branches/:id/stats
   * Get branch statistics (real-time data)
   */
  async getBranchStats(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) return next(AppError.notFound('الفرع غير موجود'));

      // Check ownership
      if (!req.user.isSuperAdmin && branch.tenant.toString() !== req.tenantId) {
        return next(AppError.forbidden('ليس لديك صلاحية لعرض إحصائيات هذا الفرع'));
      }

      const Invoice = require('../models/Invoice');
      const Expense = require('../models/Expense');
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Today's sales (invoices)
      const todayInvoices = await Invoice.find({
        tenant: branch.tenant,
        branch: branch._id,
        createdAt: { $gte: todayStart, $lt: todayEnd }
      });

      const todaySales = todayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const todayPaid = todayInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
      const todayCount = todayInvoices.length;

      // Today's expenses
      const todayExpenses = await Expense.find({
        tenant: branch.tenant,
        branch: branch._id,
        date: { $gte: todayStart, $lt: todayEnd }
      });

      const todayExpensesTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      // Current shift data (if exists)
      let currentShift = null;
      if (branch.currentShift && branch.currentShift.startTime) {
        const shiftInvoices = await Invoice.find({
          tenant: branch.tenant,
          branch: branch._id,
          createdAt: { $gte: branch.currentShift.startTime }
        });
        const shiftExpenses = await Expense.find({
          tenant: branch.tenant,
          branch: branch._id,
          date: { $gte: branch.currentShift.startTime }
        });

        currentShift = {
          ...branch.currentShift.toObject(),
          sales: shiftInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
          paid: shiftInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0),
          invoicesCount: shiftInvoices.length,
          expenses: shiftExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
          profit: shiftInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) - shiftExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
        };
      }

      // Recent invoices (last 10)
      const recentInvoices = await Invoice.find({
        tenant: branch.tenant,
        branch: branch._id
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customer', 'name phone')
        .lean();

      // Gamification (for coordinators)
      let gamification = null;
      if (req.user.role === 'coordinator' && req.user.gamification) {
        const dailyTarget = req.user.gamification.dailyTarget || 10000;
        const progress = Math.min(100, Math.round((todayPaid / dailyTarget) * 100));
        gamification = {
          dailyTarget,
          currentSales: todayPaid,
          progress,
          points: req.user.gamification.points || 0,
          level: req.user.gamification.level || 1,
          badges: req.user.gamification.badges || []
        };
      }

      res.json({
        success: true,
        data: {
          today: {
            sales: todaySales,
            paid: todayPaid,
            invoicesCount: todayCount,
            expenses: todayExpensesTotal,
            profit: todaySales - todayExpensesTotal
          },
          currentShift,
          recentInvoices,
          gamification
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/branches/:id/shift/start
   * Start a new shift
   */
  async startShift(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) return next(AppError.notFound('الفرع غير موجود'));

      // Check ownership
      if (!req.user.isSuperAdmin && branch.tenant.toString() !== req.tenantId) {
        return next(AppError.forbidden('ليس لديك صلاحية لبدء وردية في هذا الفرع'));
      }

      // Check if there's already an active shift
      if (branch.currentShift && branch.currentShift.startTime && !branch.currentShift.endTime) {
        return next(AppError.badRequest('هناك وردية نشطة بالفعل'));
      }

      const { openingBalance, notes } = req.body;

      branch.currentShift = {
        startTime: new Date(),
        openingBalance: openingBalance || 0,
        startedBy: req.user._id,
        notes: notes || ''
      };

      await branch.save();

      ApiResponse.success(res, { shift: branch.currentShift }, 'تم بدء الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/branches/:id/shift/end
   * End current shift
   */
  async endShift(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) return next(AppError.notFound('الفرع غير موجود'));

      // Check ownership
      if (!req.user.isSuperAdmin && branch.tenant.toString() !== req.tenantId) {
        return next(AppError.forbidden('ليس لديك صلاحية لإنهاء وردية في هذا الفرع'));
      }

      // Check if there's an active shift
      if (!branch.currentShift || !branch.currentShift.startTime || branch.currentShift.endTime) {
        return next(AppError.badRequest('لا توجد وردية نشطة'));
      }

      const { closingBalance, notes } = req.body;

      branch.currentShift.endTime = new Date();
      branch.currentShift.closingBalance = closingBalance || 0;
      branch.currentShift.endedBy = req.user._id;
      if (notes) branch.currentShift.notes += `\n[إنهاء]: ${notes}`;

      await branch.save();

      ApiResponse.success(res, { shift: branch.currentShift }, 'تم إنهاء الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/branches/:id/settlement
   * Settle branch (end-of-day settlement)
   */
  async settleBranch(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) return next(AppError.notFound('الفرع غير موجود'));

      // Check ownership
      if (!req.user.isSuperAdmin && branch.tenant.toString() !== req.tenantId) {
        return next(AppError.forbidden('ليس لديك صلاحية لتسوية هذا الفرع'));
      }

      const { date, notes, cashInHand, expectedCash, variance } = req.body;
      const settlementDate = date ? new Date(date) : new Date();

      const Invoice = require('../models/Invoice');
      const Expense = require('../models/Expense');

      const startOfDay = new Date(settlementDate.getFullYear(), settlementDate.getMonth(), settlementDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get all invoices for this day
      const invoices = await Invoice.find({
        tenant: branch.tenant,
        branch: branch._id,
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      });

      // Get all expenses for this day
      const expenses = await Expense.find({
        tenant: branch.tenant,
        branch: branch._id,
        date: { $gte: startOfDay, $lt: endOfDay }
      });

      const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const cashSales = invoices.filter(inv => inv.paymentMethod === 'cash').reduce((sum, inv) => sum + (inv.paid || 0), 0);
      const cardSales = invoices.filter(inv => inv.paymentMethod === 'card').reduce((sum, inv) => sum + (inv.paid || 0), 0);
      const creditSales = invoices.filter(inv => inv.paymentMethod === 'credit' || inv.paymentMethod === 'installments').reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const netCash = cashSales - totalExpenses;

      // Create settlement record
      const settlement = {
        date: settlementDate,
        totalSales,
        cashSales,
        cardSales,
        creditSales,
        totalExpenses,
        netCash,
        cashInHand: cashInHand || netCash,
        expectedCash: expectedCash || netCash,
        variance: variance !== undefined ? variance : 0,
        invoicesCount: invoices.length,
        settledBy: req.user._id,
        notes: notes || ''
      };

      // Add to settlement history
      if (!branch.settlementHistory) branch.settlementHistory = [];
      branch.settlementHistory.push(settlement);

      // Reset current shift if exists
      if (branch.currentShift && branch.currentShift.startTime) {
        branch.currentShift = {
          startTime: null,
          endTime: null,
          openingBalance: 0,
          closingBalance: 0,
          startedBy: null,
          endedBy: null,
          notes: ''
        };
      }

      await branch.save();

      ApiResponse.success(res, { settlement }, 'تم التسوية بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BranchController();
