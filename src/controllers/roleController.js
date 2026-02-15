/**
 * Role Controller — Manage Custom Roles
 */

const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

class RoleController {
  /**
   * GET /api/v1/roles
   * Get all roles for current tenant
   */
  async getAll(req, res, next) {
    try {
      const roles = await Role.find({ tenant: req.tenantId }).sort('name');
      ApiResponse.success(res, roles);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/:id
   */
  async getById(req, res, next) {
    try {
      const role = await Role.findOne({ _id: req.params.id, tenant: req.tenantId });
      if (!role) return next(AppError.notFound('الدور غير موجود'));
      ApiResponse.success(res, role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/roles
   * Create new custom role
   */
  async create(req, res, next) {
    try {
      const { name, permissions, description } = req.body;

      const role = await Role.create({
        name,
        permissions,
        description,
        tenant: req.tenantId,
        isSystem: false,
      });

      ApiResponse.created(res, role, 'تم إنشاء الدور بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/roles/:id
   * Update role
   */
  async update(req, res, next) {
    try {
      const { name, permissions, description } = req.body;

      const role = await Role.findOne({ _id: req.params.id, tenant: req.tenantId });
      if (!role) return next(AppError.notFound('الدور غير موجود'));

      if (role.isSystem) {
        return next(AppError.badRequest('لا يمكن تعديل الأدوار الافتراضية'));
      }

      if (name) role.name = name;
      if (permissions) role.permissions = permissions;
      if (description !== undefined) role.description = description;

      await role.save();

      ApiResponse.success(res, role, 'تم تحديث الدور');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/roles/:id
   */
  async delete(req, res, next) {
    try {
      const role = await Role.findOne({ _id: req.params.id, tenant: req.tenantId });
      if (!role) return next(AppError.notFound('الدور غير موجود'));

      if (role.isSystem) {
        return next(AppError.badRequest('لا يمكن حذف الأدوار الافتراضية'));
      }

      // Check if any users have this role
      const User = require('../models/User');
      const usersWithRole = await User.countDocuments({ customRole: role._id });
      if (usersWithRole > 0) {
        return next(AppError.badRequest(`لا يمكن حذف الدور. يوجد ${usersWithRole} مستخدم بهذا الدور`));
      }

      await role.deleteOne();

      ApiResponse.success(res, null, 'تم حذف الدور');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();
