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

      const user = req.user ? await User.findById(req.user._id).select('-password') : null;

      ApiResponse.success(res, {
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          businessInfo: tenant.businessInfo,
          settings: tenant.settings,
          branding: tenant.branding,
          subscription: tenant.subscription,
          whatsapp: req.user ? tenant.whatsapp : undefined, // Only show WhatsApp full config to logged in users
        },
        user: user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/storefront/settings
   * Get public settings for the storefront
   */
  async getStorefrontSettings(req, res, next) {
    try {
      // Find the first active tenant or by slug if provided
      const tenantId = req.query.tenant || req.headers['x-tenant-id'];
      let tenant;
      
      if (tenantId) {
        tenant = await Tenant.findById(tenantId);
      } else {
        tenant = await Tenant.findOne(); // Get default for now
      }

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      ApiResponse.success(res, {
        name: tenant.name,
        businessInfo: tenant.businessInfo,
        branding: tenant.branding,
        currency: 'EGP', // Default
        taxRate: 14 // Default
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
      const { whatsappNumber, whatsappToken, whatsappPhoneId, wabaId, notifications, templateNames, templateLanguages } = req.body;

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

      // Save WABA ID if provided
      if (wabaId !== undefined) {
        updateData['whatsapp.wabaId'] = wabaId;
      }

      // Save template name mappings if provided
      if (templateNames) {
        for (const [purpose, name] of Object.entries(templateNames)) {
          if (['invoice', 'statement', 'reminder', 'payment', 'restock'].includes(purpose)) {
            updateData[`whatsapp.templateNames.${purpose}`] = name;
          }
        }
      }

      // Save template language mappings if provided
      if (templateLanguages) {
        for (const [purpose, lang] of Object.entries(templateLanguages)) {
          if (['invoice', 'statement', 'reminder', 'payment', 'restock'].includes(purpose)) {
            updateData[`whatsapp.templateLanguages.${purpose}`] = lang;
          }
        }
      }

      const tenant = await Tenant.findByIdAndUpdate(
        req.tenantId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      // Update environment variables in memory for immediate effect
      if (whatsappToken) process.env.WHATSAPP_ACCESS_TOKEN = whatsappToken;
      if (whatsappPhoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = whatsappPhoneId;
      if (wabaId) process.env.WABA_ID = wabaId;

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
   * Get all WhatsApp Templates from Meta account
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
        }, 'WhatsApp غير مُهيأ');
      }

      // Get tenant whatsapp config for dynamic WABA_ID and template names
      const tenant = await Tenant.findById(req.tenantId);
      const tenantWhatsapp = tenant?.whatsapp;
      const wabaId = tenantWhatsapp?.wabaId || process.env.WABA_ID;

      // Fetch real templates from Meta
      const result = await WhatsAppService.getTemplates(wabaId, tenantWhatsapp);

      if (result.success) {
        ApiResponse.success(res, result, `تم جلب ${result.totalOnAccount} قالب من WABA ${result.wabaId}`);
      } else {
        ApiResponse.success(res, result, result.message || 'فشل جلب القوالب');
      }
    } catch (error) {
      next(error);
    }
  }
  /**
   * POST /api/v1/settings/whatsapp/create-templates
   * Create all required WhatsApp templates on Meta
   */
  async createWhatsAppTemplates(req, res, next) {
    try {
      const WhatsAppService = require('../services/WhatsAppService');

      if (!WhatsAppService.isConfigured()) {
        return ApiResponse.success(res, {
          success: false,
          configured: false,
          message: 'WhatsApp غير مُهيأ',
        }, 'WhatsApp غير مُهيأ');
      }

      const tenant = await Tenant.findById(req.tenantId);
      const wabaId = tenant?.whatsapp?.wabaId || process.env.WABA_ID;

      const result = await WhatsAppService.createAllTemplates(wabaId);
      ApiResponse.success(res, result, `تم إنشاء ${result.created} قالب من ${result.created + result.failed}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/settings/whatsapp/detect-templates
   * Auto-detect templates from a WABA and return mapping
   */
  async detectTemplates(req, res, next) {
    try {
      const WhatsAppService = require('../services/WhatsAppService');

      if (!WhatsAppService.isConfigured()) {
        return ApiResponse.success(res, {
          success: false,
          configured: false,
          message: 'WhatsApp غير مُهيأ',
        }, 'WhatsApp غير مُهيأ');
      }

      const { wabaId } = req.body;
      const tenant = await Tenant.findById(req.tenantId);
      const targetWabaId = wabaId || tenant?.whatsapp?.wabaId || process.env.WABA_ID;

      if (!targetWabaId) {
        return ApiResponse.success(res, {
          success: false,
          message: 'WABA_ID مطلوب — أضفه في حقل WABA ID أو .env',
        }, 'WABA_ID مطلوب');
      }

      const result = await WhatsAppService.autoDetectTemplates(targetWabaId);

      if (result.success) {
        ApiResponse.success(res, result, `تم جلب ${result.totalTemplates} قالب — ${result.approvedCount} معتمد`);
      } else {
        ApiResponse.success(res, result, result.message || 'فشل جلب القوالب');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/settings/whatsapp/apply-templates
   * Apply auto-detected template mapping to tenant settings
   */
  async applyTemplateMapping(req, res, next) {
    try {
      const { wabaId, templateNames, templateLanguages } = req.body;

      const updateData = {};
      if (wabaId) updateData['whatsapp.wabaId'] = wabaId;

      if (templateNames) {
        for (const [purpose, name] of Object.entries(templateNames)) {
          if (['invoice', 'statement', 'reminder', 'payment', 'restock'].includes(purpose)) {
            updateData[`whatsapp.templateNames.${purpose}`] = name;
          }
        }
      }

      if (templateLanguages) {
        for (const [purpose, lang] of Object.entries(templateLanguages)) {
          if (['invoice', 'statement', 'reminder', 'payment', 'restock'].includes(purpose)) {
            updateData[`whatsapp.templateLanguages.${purpose}`] = lang;
          }
        }
      }

      const tenant = await Tenant.findByIdAndUpdate(
        req.tenantId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      // Update env for immediate effect
      if (wabaId) process.env.WABA_ID = wabaId;

      ApiResponse.success(res, {
        whatsapp: tenant.whatsapp,
      }, 'تم تطبيق إعدادات القوالب بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
