/**
 * Settings Controller — Tenant & User Settings Management
 * Save store info, WhatsApp settings, notification preferences
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');

class SettingsController {
  /**
   * GET /api/v1/settings
   * Get all settings for current tenant
   */
  async getSettings(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.tenantId);
      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      const user = await User.findById(req.user._id).select('-password');

      ApiResponse.success(res, {
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          businessInfo: tenant.businessInfo,
          settings: tenant.settings,
          branding: tenant.branding,
          subscription: tenant.subscription,
        },
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/settings/store
   * Update store/business info
   */
  async updateStore(req, res, next) {
    try {
      const { name, businessInfo } = req.body;

      const tenant = await Tenant.findByIdAndUpdate(
        req.tenantId,
        {
          ...(name && { name }),
          ...(businessInfo && { businessInfo }),
        },
        { new: true, runValidators: true }
      );

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      ApiResponse.success(res, { tenant }, 'تم تحديث بيانات المتجر بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/settings/whatsapp
   * Update WhatsApp settings
   */
  async updateWhatsApp(req, res, next) {
    try {
      const { whatsappNumber, whatsappToken, whatsappPhoneId, notifications } = req.body;

      const updateData = {
        'whatsapp.enabled': !!(whatsappToken && whatsappPhoneId),
        'whatsapp.phoneNumberId': whatsappPhoneId || '',
        'whatsapp.accessToken': whatsappToken || '',
        'whatsapp.phoneNumber': whatsappNumber || '',
        'whatsapp.notifications.installmentReminder': notifications?.installmentReminder ?? true,
        'whatsapp.notifications.invoiceCreated': notifications?.invoiceCreated ?? true,
        'whatsapp.notifications.lowStockAlert': notifications?.lowStock ?? true,
        'whatsapp.notifications.supplierPaymentDue': notifications?.supplierReminder ?? true,
      };

      const tenant = await Tenant.findByIdAndUpdate(
        req.tenantId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      // Update environment variables in memory for immediate effect
      if (whatsappToken) process.env.WHATSAPP_ACCESS_TOKEN = whatsappToken;
      if (whatsappPhoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = whatsappPhoneId;

      // Force WhatsApp service to reload credentials
      const WhatsAppService = require('../services/WhatsAppService');
      if (WhatsAppService.refreshCredentials) {
        WhatsAppService.refreshCredentials();
      }

      ApiResponse.success(res, { 
        whatsapp: tenant.whatsapp,
        configured: !!(whatsappToken && whatsappPhoneId),
      }, 'تم تحديث إعدادات WhatsApp بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/settings/branding
   * Update branding settings (colors, logo)
   */
  async updateBranding(req, res, next) {
    try {
      const { primaryColor, secondaryColor, logo, darkMode } = req.body;

      const tenant = await Tenant.findByIdAndUpdate(
        req.tenantId,
        {
          branding: {
            primaryColor: primaryColor || '#6366f1',
            secondaryColor: secondaryColor || '#10b981',
            logo,
            darkMode: darkMode || false,
          },
        },
        { new: true, runValidators: true }
      );

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      ApiResponse.success(res, { branding: tenant.branding }, 'تم تحديث الهوية البصرية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/settings/user
   * Update current user profile
   */
  async updateUser(req, res, next) {
    try {
      const { name, email, phone } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { name, email, phone },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) return next(AppError.notFound('المستخدم غير موجود'));

      ApiResponse.success(res, { user }, 'تم تحديث بيانات المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/settings/password
   * Change user password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return next(AppError.badRequest('كلمة المرور الحالية والجديدة مطلوبتين'));
      }

      const user = await User.findById(req.user._id).select('+password');
      if (!user) return next(AppError.notFound('المستخدم غير موجود'));

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) return next(AppError.badRequest('كلمة المرور الحالية غير صحيحة'));

      user.password = newPassword;
      await user.save();

      ApiResponse.success(res, null, 'تم تغيير كلمة المرور بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/settings/whatsapp/test
   * Test WhatsApp configuration by sending a test message
   */
  async testWhatsApp(req, res, next) {
    try {
      const { phone } = req.body;
      if (!phone) return next(AppError.badRequest('رقم الهاتف مطلوب للاختبار'));

      const WhatsAppService = require('../services/WhatsAppService');
      
      // Check if configured
      if (!WhatsAppService.isConfigured()) {
        return ApiResponse.success(res, {
          success: false,
          configured: false,
          message: 'WhatsApp غير مُهيأ. يرجى إدخال Access Token و Phone Number ID في الإعدادات',
        }, 'WhatsApp غير مُهيأ');
      }

      // Get current config info
      const tenant = await Tenant.findById(req.tenantId);
      const configInfo = {
        phoneNumberId: tenant?.whatsapp?.phoneNumberId ? `${tenant.whatsapp.phoneNumberId.substring(0, 8)}...` : 'غير موجود',
        tokenSet: !!tenant?.whatsapp?.accessToken,
        enabled: tenant?.whatsapp?.enabled,
      };

      // Send test message
      const testMessage = `✅ رسالة اختبار من PayQusta\n\nإعدادات WhatsApp تعمل بنجاح!\n\n📅 ${new Date().toLocaleString('ar-EG')}`;
      const result = await WhatsAppService.sendMessage(phone, testMessage);

      if (result.success) {
        ApiResponse.success(res, {
          success: true,
          configured: true,
          config: configInfo,
          messageId: result.messageId,
          message: 'تم إرسال رسالة الاختبار بنجاح ✅',
        }, 'تم إرسال رسالة الاختبار');
      } else {
        ApiResponse.success(res, {
          success: false,
          configured: true,
          config: configInfo,
          error: result.error,
          message: 'فشل إرسال الرسالة. تحقق من صحة البيانات',
        }, 'فشل إرسال رسالة الاختبار');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/settings/whatsapp/templates
   * Check WhatsApp Templates status
   */
  async checkWhatsAppTemplates(req, res, next) {
    try {
      const WhatsAppService = require('../services/WhatsAppService');

      // Check if WhatsApp is configured
      if (!WhatsAppService.isConfigured()) {
        return ApiResponse.success(res, {
          success: false,
          configured: false,
          message: 'WhatsApp غير مُهيأ. يرجى إدخال Access Token و Phone Number ID في الإعدادات',
          instructions: 'اذهب إلى الإعدادات → WhatsApp → أدخل Phone Number ID و Access Token',
        }, 'WhatsApp غير مُهيأ');
      }

      // Get template status
      const result = await WhatsAppService.checkTemplateStatus();

      ApiResponse.success(res, result, 'تم التحقق من حالة القوالب');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
