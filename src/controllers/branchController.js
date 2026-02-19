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
}

module.exports = new BranchController();
