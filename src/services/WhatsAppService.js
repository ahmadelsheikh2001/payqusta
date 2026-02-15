/**
 * WhatsApp Business API Service
 * Handles all WhatsApp notifications: invoices, installments, stock alerts
 * Supports both regular messages AND Message Templates for 24h+ messaging
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');

// Default Template Names — fallback when no tenant config is set
const DEFAULT_TEMPLATES = {
  STATEMENT: 'payqusta_statement',
  PAYMENT_REMINDER: 'payqusta_reminder',
  INVOICE: 'payqusta_invoice',
  RESTOCK: 'payqusta_restock',
  PAYMENT_RECEIVED: 'payqusta_payment',
};

// Default Language codes per template
const DEFAULT_TEMPLATE_LANGUAGES = {
  invoice: 'ar_EG',
  statement: 'ar_EG',
  reminder: 'ar_EG',
  payment: 'ar_EG',
  restock: 'en',
};

// Known template name patterns for auto-detection
const TEMPLATE_PATTERNS = {
  invoice: ['invoice', 'فاتورة'],
  statement: ['statement', 'كشف'],
  reminder: ['reminder', 'تذكير'],
  payment: ['payment', 'دفع', 'استلام'],
  restock: ['restock', 'تخزين', 'stock'],
};

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.templates = DEFAULT_TEMPLATES;
  }

  /**
   * Get template name for a purpose, using tenant config or fallback to defaults
   * @param {string} purpose - 'invoice', 'statement', 'reminder', 'payment', 'restock'
   * @param {object} tenantWhatsapp - tenant.whatsapp config (optional)
   */
  getTemplateName(purpose, tenantWhatsapp = null) {
    // Check tenant-specific template name first
    if (tenantWhatsapp?.templateNames?.[purpose]) {
      return tenantWhatsapp.templateNames[purpose];
    }
    // Fallback to defaults
    const purposeMap = {
      invoice: DEFAULT_TEMPLATES.INVOICE,
      statement: DEFAULT_TEMPLATES.STATEMENT,
      reminder: DEFAULT_TEMPLATES.PAYMENT_REMINDER,
      payment: DEFAULT_TEMPLATES.PAYMENT_RECEIVED,
      restock: DEFAULT_TEMPLATES.RESTOCK,
    };
    return purposeMap[purpose] || DEFAULT_TEMPLATES.INVOICE;
  }

  /**
   * Get template language for a purpose, using tenant config or fallback
   */
  getTemplateLanguage(purpose, tenantWhatsapp = null) {
    if (tenantWhatsapp?.templateLanguages?.[purpose]) {
      return tenantWhatsapp.templateLanguages[purpose];
    }
    return DEFAULT_TEMPLATE_LANGUAGES[purpose] || 'ar_EG';
  }

  /**
   * Get WABA ID — from tenant config or fallback to env
   */
  getWabaId(tenantWhatsapp = null) {
    return tenantWhatsapp?.wabaId || (process.env.WABA_ID || '').trim();
  }

  /**
   * Auto-detect and map templates from a WABA
   * Fetches all templates and matches them to purposes by name patterns
   */
  async autoDetectTemplates(wabaId) {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    if (!wabaId) {
      return { success: false, message: 'WABA_ID مطلوب' };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/${wabaId}/message_templates`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          params: { limit: 100 },
        }
      );

      const templates = response.data?.data || [];
      const approvedTemplates = templates.filter(t => t.status === 'APPROVED');

      // Auto-map by matching template name against known patterns
      const detectedMap = {};
      const detectedLanguages = {};

      for (const [purpose, patterns] of Object.entries(TEMPLATE_PATTERNS)) {
        // Find first approved template matching any pattern for this purpose
        const match = approvedTemplates.find(t =>
          patterns.some(p => t.name.toLowerCase().includes(p))
        );
        if (match) {
          detectedMap[purpose] = match.name;
          detectedLanguages[purpose] = match.language || DEFAULT_TEMPLATE_LANGUAGES[purpose];
        }
      }

      return {
        success: true,
        wabaId,
        totalTemplates: templates.length,
        approvedCount: approvedTemplates.length,
        allTemplates: templates.map(t => ({
          name: t.name,
          status: t.status,
          category: t.category,
          language: t.language,
          id: t.id,
        })),
        detectedMap,
        detectedLanguages,
        unmapped: Object.keys(TEMPLATE_PATTERNS).filter(p => !detectedMap[p]),
      };
    } catch (error) {
      const errData = error.response?.data?.error;
      logger.error(`[WhatsApp] Auto-detect failed: ${JSON.stringify(errData || error.message)}`);
      return { success: false, error: errData || error.message };
    }
  }

  /**
   * Check if WhatsApp is properly configured
   */
  isConfigured() {
    this.refreshCredentials();
    return !!(this.phoneNumberId && this.accessToken && this.accessToken !== 'your_access_token');
  }

  /**
   * Refresh credentials from environment (after settings update)
   */
  refreshCredentials() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }

  /**
   * =====================================================
   * MESSAGE TEMPLATES — Main method for 24h+ messaging
   * =====================================================
   */
  
  /**
   * Send a pre-approved Message Template
   * @param {string} to - Phone number
   * @param {string} templateName - Template name (must be approved in Meta)
   * @param {string} languageCode - Language code (ar, en, etc.)
   * @param {Array} bodyParams - Array of parameter values for template body
   * @param {Array} headerParams - Array of parameter values for header (optional)
   * @param {Array} buttonParams - Array of parameter values for buttons (optional)
   */
  async sendTemplate(to, templateName, languageCode = 'ar', bodyParams = [], headerParams = [], buttonParams = []) {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      logger.warn('[WhatsApp] Not configured — skipping template message');
      return { success: false, skipped: true, reason: 'not_configured' };
    }

    try {
      const phone = Helpers.formatPhoneForWhatsApp(to);
      logger.info(`[WhatsApp] 📤 Sending template "${templateName}" to ${phone}`);

      // Build components array
      const components = [];
      
      // Header parameters (if any)
      if (headerParams.length > 0) {
        components.push({
          type: 'header',
          parameters: headerParams.map(p => ({ type: 'text', text: String(p) })),
        });
      }

      // Body parameters (if any)
      if (bodyParams.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParams.map(p => ({ type: 'text', text: String(p) })),
        });
      }

      // Button parameters (if any)
      if (buttonParams.length > 0) {
        buttonParams.forEach((param, idx) => {
          components.push({
            type: 'button',
            sub_type: 'quick_reply',
            index: idx,
            parameters: [{ type: 'payload', payload: String(param) }],
          });
        });
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      };

      // Add components if we have any parameters
      if (components.length > 0) {
        payload.template.components = components;
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const messageId = response.data?.messages?.[0]?.id;
      logger.info(`[WhatsApp] ✅ Template sent successfully!`);
      logger.info(`[WhatsApp] Template: ${templateName}, Message ID: ${messageId}`);
      
      return { 
        success: true, 
        data: response.data, 
        messageId,
        templateUsed: templateName,
      };
    } catch (error) {
      const errorData = error.response?.data?.error;
      logger.error(`[WhatsApp] ❌ Template send failed: ${JSON.stringify(errorData || error.message)}`);
      
      // Handle specific template errors
      if (errorData?.code === 132000) {
        logger.error(`[WhatsApp] Template "${templateName}" not found or not approved`);
      } else if (errorData?.code === 132001) {
        logger.error('[WhatsApp] Template parameters mismatch');
      } else if (errorData?.code === 132005) {
        logger.error('[WhatsApp] Template paused - quality issues');
      } else if (errorData?.code === 132007) {
        logger.error('[WhatsApp] Template disabled');
      } else if (errorData?.code === 132015) {
        logger.error('[WhatsApp] Template not available for this language');
      }
      
      return { success: false, error: errorData || error.message, templateName };
    }
  }

  /**
   * =====================================================
   * SMART SEND — Tries template first, falls back to regular
   * =====================================================
   */
  
  /**
   * Smart send - tries template first, then regular message
   * @param {string} to - Phone number
   * @param {string} message - Fallback message text
   * @param {string} templateName - Template to try first
   * @param {Array} templateParams - Template parameters
   */
  async smartSend(to, message, templateName, templateParams = []) {
    // Try template first (works outside 24h window)
    if (templateName) {
      const templateResult = await this.sendTemplate(to, templateName, 'ar', templateParams);
      if (templateResult.success) {
        return { ...templateResult, method: 'template' };
      }
      logger.warn(`[WhatsApp] Template failed, trying regular message...`);
    }
    
    // Fallback to regular message (only works in 24h window)
    const messageResult = await this.sendMessage(to, message);
    return { ...messageResult, method: 'message' };
  }

  /**
   * =====================================================
   * PRE-BUILT TEMPLATE SENDERS
   * =====================================================
   */

  /**
   * Send customer statement using template
   * Params: {{1}} = customer_name, {{2}} = total_purchases, {{3}} = total_paid, {{4}} = outstanding
   * @param {object} tenantWhatsapp - tenant.whatsapp config (optional, for dynamic template names)
   */
  async sendStatementTemplate(phone, customer, tenantWhatsapp = null) {
    const params = [
      customer.name,
      Helpers.formatCurrency(customer.financials?.totalPurchases || 0),
      Helpers.formatCurrency(customer.financials?.totalPaid || 0),
      Helpers.formatCurrency(customer.financials?.outstandingBalance || 0),
    ];

    const templateName = this.getTemplateName('statement', tenantWhatsapp);
    const lang = this.getTemplateLanguage('statement', tenantWhatsapp);
    return this.sendTemplate(phone, templateName, lang, params);
  }

  /**
   * Send payment reminder using template
   * Params: {{1}} = customer_name, {{2}} = amount, {{3}} = due_date, {{4}} = invoice_number
   */
  async sendPaymentReminderTemplate(phone, customer, amount, dueDate, invoiceNumber, tenantWhatsapp = null) {
    const params = [
      customer.name,
      Helpers.formatCurrency(amount),
      new Date(dueDate).toLocaleDateString('ar-EG'),
      invoiceNumber,
    ];

    const templateName = this.getTemplateName('reminder', tenantWhatsapp);
    const lang = this.getTemplateLanguage('reminder', tenantWhatsapp);
    return this.sendTemplate(phone, templateName, lang, params);
  }

  /**
   * Send invoice notification using template
   * Params: {{1}} = customer_name, {{2}} = invoice_number, {{3}} = total_amount, {{4}} = payment_method
   */
  async sendInvoiceTemplate(phone, customer, invoice, tenantWhatsapp = null) {
    const paymentMethods = { cash: 'نقداً', installment: 'بالتقسيط', deferred: 'آجل' };
    const params = [
      customer.name,
      invoice.invoiceNumber,
      Helpers.formatCurrency(invoice.totalAmount),
      paymentMethods[invoice.paymentMethod] || 'نقداً',
    ];

    const templateName = this.getTemplateName('invoice', tenantWhatsapp);
    const lang = this.getTemplateLanguage('invoice', tenantWhatsapp);
    return this.sendTemplate(phone, templateName, lang, params);
  }

  /**
   * Send restock request to supplier using template
   * Params: {{1}} = store_name, {{2}} = product_name, {{3}} = quantity, {{4}} = current_stock
   */
  async sendRestockTemplate(phone, storeName, product, quantity, tenantWhatsapp = null) {
    const params = [
      storeName,
      product.name,
      `${quantity} ${product.stock?.unit || 'unit'}`,
      `${product.stock?.quantity || 0} ${product.stock?.unit || 'unit'}`,
    ];

    const templateName = this.getTemplateName('restock', tenantWhatsapp);
    const lang = this.getTemplateLanguage('restock', tenantWhatsapp);
    return this.sendTemplate(phone, templateName, lang, params);
  }

  /**
   * Send payment received confirmation using template
   * Params: {{1}} = customer_name, {{2}} = amount, {{3}} = remaining, {{4}} = invoice_number
   */
  async sendPaymentReceivedTemplate(phone, customer, amount, remaining, invoiceNumber, tenantWhatsapp = null) {
    const params = [
      customer.name,
      Helpers.formatCurrency(amount),
      Helpers.formatCurrency(remaining),
      invoiceNumber,
    ];

    const templateName = this.getTemplateName('payment', tenantWhatsapp);
    const lang = this.getTemplateLanguage('payment', tenantWhatsapp);
    return this.sendTemplate(phone, templateName, lang, params);
  }

  /**
   * =====================================================
   * REGULAR MESSAGES (within 24h window only)
   * =====================================================
   */

  async sendMessage(to, message) {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      logger.warn('WhatsApp not configured — skipping message');
      return { success: false, skipped: true, reason: 'not_configured' };
    }

    try {
      const phone = Helpers.formatPhoneForWhatsApp(to);
      logger.info(`[WhatsApp] Attempting to send message to ${phone}`);

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      logger.info(`[WhatsApp] ✅ Message sent to ${phone}`);
      return { success: true, data: response.data, messageId: response.data?.messages?.[0]?.id };
    } catch (error) {
      const errorDetails = error.response?.data?.error || error.message;
      logger.error(`[WhatsApp] ❌ Send failed to ${to}: ${JSON.stringify(errorDetails)}`);
      
      // Check if it's a 24h window error
      if (error.response?.data?.error?.code === 131047) {
        logger.info('[WhatsApp] 24h window expired - use Message Template instead');
        return { 
          success: false, 
          failed: true, 
          error: errorDetails,
          needsTemplate: true,
          hint: 'استخدم Message Template للإرسال خارج نافذة 24 ساعة',
        };
      }
      
      return { success: false, failed: true, error: errorDetails };
    }
  }

  /**
   * Upload media to WhatsApp and get media ID
   */
  async uploadMedia(filepath, mimeType = 'application/pdf') {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filepath));
      form.append('messaging_product', 'whatsapp');
      form.append('type', mimeType);

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${this.accessToken}`,
          },
          timeout: 30000,
        }
      );

      return { success: true, mediaId: response.data.id };
    } catch (error) {
      logger.error(`WhatsApp media upload failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send document (PDF) via WhatsApp
   */
  async sendDocument(to, filepath, filename, caption = '') {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return { success: false, skipped: true, reason: 'not_configured' };
    }

    try {
      const uploadResult = await this.uploadMedia(filepath, 'application/pdf');
      if (!uploadResult.success) {
        return uploadResult;
      }

      const phone = Helpers.formatPhoneForWhatsApp(to);
      logger.info(`[WhatsApp] Sending document to ${phone}: ${filename}`);

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'document',
          document: {
            id: uploadResult.mediaId,
            filename: filename,
            caption: caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const messageId = response.data?.messages?.[0]?.id;
      logger.info(`[WhatsApp] ✅ Document queued: ${filename}`);
      logger.info(`[WhatsApp] Message ID: ${messageId}`);
      
      return { 
        success: true, 
        data: response.data,
        messageId,
      };
    } catch (error) {
      const errorData = error.response?.data?.error;
      logger.error(`[WhatsApp] ❌ Document send failed: ${JSON.stringify(errorData || error.message)}`);
      
      // Check if 24h window expired
      if (errorData?.code === 131047) {
        return { 
          success: false, 
          error: errorData,
          needsTemplate: true,
          hint: 'استخدم Message Template للإرسال خارج نافذة 24 ساعة',
        };
      }
      
      return { success: false, error: errorData || error.message };
    }
  }

  /**
   * =====================================================
   * UTILITY METHODS
   * =====================================================
   */

  /**
   * Get list of available templates from Meta Business Account
   * @param {string} overrideWabaId - Optional WABA ID override (from tenant settings)
   * @param {object} tenantWhatsapp - Optional tenant whatsapp config for template name resolution
   */
  async getTemplates(overrideWabaId = null, tenantWhatsapp = null) {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured', message: 'WhatsApp غير مُعد' };
    }

    try {
      let wabaId = overrideWabaId || this.getWabaId(tenantWhatsapp);

      if (!wabaId) {
        return {
          success: false,
          message: 'WABA_ID غير موجود. أضفه في الإعدادات أو ملف .env',
          hint: 'يمكنك إيجاده في Meta Business Suite → WhatsApp → Business Account Settings',
        };
      }

      wabaId = wabaId.trim();

      // Fetch all templates from Meta
      const response = await axios.get(
        `${this.apiUrl}/${wabaId}/message_templates`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          params: { limit: 100 },
        }
      );

      const templates = response.data?.data || [];
      logger.info(`[WhatsApp] Found ${templates.length} templates on WABA ${wabaId}`);

      // Get currently mapped template names (from tenant or defaults)
      const currentMap = {
        invoice: this.getTemplateName('invoice', tenantWhatsapp),
        statement: this.getTemplateName('statement', tenantWhatsapp),
        reminder: this.getTemplateName('reminder', tenantWhatsapp),
        payment: this.getTemplateName('payment', tenantWhatsapp),
        restock: this.getTemplateName('restock', tenantWhatsapp),
      };

      const templateIndex = {};
      for (const t of templates) {
        templateIndex[t.name] = {
          name: t.name,
          status: t.status,
          category: t.category,
          language: t.language,
          id: t.id,
        };
      }

      // Check status of currently mapped templates
      const required = Object.entries(currentMap).map(([purpose, name]) => ({
        purpose,
        name,
        exists: !!templateIndex[name],
        status: templateIndex[name]?.status || 'NOT_FOUND',
        category: templateIndex[name]?.category || '-',
        language: templateIndex[name]?.language || '-',
      }));

      return {
        success: true,
        wabaId,
        totalOnAccount: templates.length,
        allTemplates: templates.map(t => ({
          name: t.name,
          status: t.status,
          category: t.category,
          language: t.language,
          id: t.id,
        })),
        requiredTemplates: required,
        missingCount: required.filter(r => !r.exists).length,
      };
    } catch (error) {
      const errData = error.response?.data?.error;
      logger.error(`[WhatsApp] Get templates failed: ${JSON.stringify(errData || error.message)}`);
      return { success: false, error: errData || error.message };
    }
  }

  /**
   * Create all required templates on Meta (MARKETING category for faster approval)
   * Call this after deleting old templates and waiting for deletion to complete
   */
  async createAllTemplates(overrideWabaId = null) {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    const wabaId = (overrideWabaId || process.env.WABA_ID || '').trim();
    if (!wabaId) {
      return { success: false, message: 'WABA_ID غير موجود في .env' };
    }

    const templateDefs = [
      {
        name: 'payqusta_invoice',
        category: 'MARKETING',
        language: 'ar_EG',
        body: 'مرحباً {{1}} 👋\n\nتم إنشاء فاتورة جديدة رقم {{2}}\n💰 الإجمالي: {{3}}\n💳 طريقة الدفع: {{4}}\n\nشكراً لثقتكم — PayQusta 💙',
        example: [['أحمد', 'INV-001', '1,500.00 ج.م', 'نقداً']],
      },
      {
        name: 'payqusta_statement',
        category: 'MARKETING',
        language: 'ar_EG',
        body: 'مرحباً {{1}} 👋\n\nكشف حسابك:\n💰 إجمالي المشتريات: {{2}}\n✅ المسدد: {{3}}\n⚠️ المتبقي: {{4}}\n\n— PayQusta 💙',
        example: [['أحمد', '10,000.00 ج.م', '7,500.00 ج.م', '2,500.00 ج.م']],
      },
      {
        name: 'payqusta_reminder',
        category: 'MARKETING',
        language: 'ar_EG',
        body: 'مرحباً {{1}} 👋\n\n⏰ تذكير بموعد القسط\n💰 المبلغ: {{2}}\n📅 تاريخ الاستحقاق: {{3}}\n📄 فاتورة رقم: {{4}}\n\nشكراً لالتزامكم — PayQusta 💙',
        example: [['أحمد', '500.00 ج.م', '15/3/2026', 'INV-001']],
      },
      {
        name: 'payqusta_payment',
        category: 'MARKETING',
        language: 'ar_EG',
        body: 'مرحباً {{1}} 👋\n\n✅ تم استلام دفعة\n💰 المبلغ: {{2}}\n📊 المتبقي: {{3}}\n📄 فاتورة رقم: {{4}}\n\nشكراً لالتزامكم — PayQusta 💙',
        example: [['أحمد', '500.00 ج.م', '1,000.00 ج.م', 'INV-001']],
      },
      {
        name: 'payqusta_restock',
        category: 'MARKETING',
        language: 'en',
        body: 'Restock Request from {{1}}\n\nProduct: {{2}}\nQuantity needed: {{3}}\nCurrent stock: {{4}}\n\nPlease contact the supplier to reorder.',
        example: [['PayQusta Store', 'iPhone 15', '50 units', '5 units']],
      },
    ];

    const results = [];
    for (const def of templateDefs) {
      try {
        const response = await axios.post(
          `${this.apiUrl}/${wabaId}/message_templates`,
          {
            name: def.name,
            category: def.category,
            language: def.language,
            components: [{
              type: 'BODY',
              text: def.body,
              example: { body_text: def.example },
            }],
          },
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        results.push({ name: def.name, success: true, id: response.data?.id, status: response.data?.status });
        logger.info(`[WhatsApp] ✅ Template "${def.name}" created: ${response.data?.id}`);
      } catch (error) {
        const errData = error.response?.data?.error;
        results.push({ name: def.name, success: false, error: errData?.error_user_msg || errData?.message || error.message });
        logger.error(`[WhatsApp] ❌ Template "${def.name}" failed: ${JSON.stringify(errData || error.message)}`);
      }
    }

    return {
      success: true,
      results,
      created: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  }

  /**
   * Check template status by trying to send to a test number
   * Returns which templates are working and which are missing
   */
  async checkTemplateStatus(tenantWhatsapp = null) {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return {
        success: false,
        reason: 'not_configured',
        message: 'WhatsApp غير مُعد بعد. يرجى إضافة Phone Number ID و Access Token في الإعدادات.'
      };
    }

    const purposes = ['invoice', 'statement', 'reminder', 'payment', 'restock'];
    const results = {};

    for (const purpose of purposes) {
      const templateName = this.getTemplateName(purpose, tenantWhatsapp);
      const lang = this.getTemplateLanguage(purpose, tenantWhatsapp);
      results[purpose] = {
        templateName,
        language: lang,
        configured: true,
        status: 'unknown',
        message: 'للتحقق من حالة القالب، حاول إرساله لرقم اختبار',
      };
    }

    return {
      success: true,
      templates: results,
      totalConfigured: purposes.length,
      wabaId: this.getWabaId(tenantWhatsapp),
      instructions: {
        ar: 'لإنشاء القوالب، اذهب إلى Meta Business Suite → WhatsApp Manager → Message Templates',
        en: 'To create templates, go to Meta Business Suite → WhatsApp Manager → Message Templates',
        url: 'https://business.facebook.com/wa/manage/message-templates/',
      },
    };
  }

  /**
   * =====================================================
   * LEGACY METHODS (kept for backwards compatibility)
   * Now with smart fallback to templates
   * =====================================================
   */

  async sendInvoiceNotification(phone, invoice, customer, tenantWhatsapp = null) {
    // Try template first
    const templateResult = await this.sendInvoiceTemplate(phone, customer, invoice, tenantWhatsapp);
    if (templateResult.success) {
      return templateResult;
    }

    // Fallback to regular message
    const items = invoice.items
      .map((item) => `• ${item.productName} × ${item.quantity} = ${Helpers.formatCurrency(item.totalPrice)}`)
      .join('\n');

    let message = `🧾 *فاتورة جديدة — ${invoice.invoiceNumber}*\n\n`;
    message += `مرحباً ${customer.name} 👋\n\n`;
    message += `📋 *تفاصيل الفاتورة:*\n${items}\n\n`;
    message += `💰 *الإجمالي:* ${Helpers.formatCurrency(invoice.totalAmount)}\n`;

    if (invoice.paymentMethod === 'cash') {
      message += `✅ *الحالة:* مدفوع بالكامل\n`;
    } else if (invoice.paymentMethod === 'installment') {
      message += `💳 *المقدم:* ${Helpers.formatCurrency(invoice.installmentConfig.downPayment)}\n`;
      message += `📊 *المتبقي:* ${Helpers.formatCurrency(invoice.remainingAmount)}\n`;
      message += `📅 *عدد الأقساط:* ${invoice.installmentConfig.numberOfInstallments} قسط\n`;
    }

    message += `\nشكراً لثقتكم — PayQusta 💙`;

    return this.sendMessage(phone, message);
  }

  async sendInstallmentReminder(phone, customer, invoice, installment, tenantWhatsapp = null) {
    // Try template first
    const templateResult = await this.sendPaymentReminderTemplate(
      phone,
      customer,
      installment.amount - installment.paidAmount,
      installment.dueDate,
      invoice.invoiceNumber,
      tenantWhatsapp
    );
    if (templateResult.success) {
      return templateResult;
    }

    // Fallback to regular message
    let message = `⏰ *تذكير بموعد القسط*\n\n`;
    message += `مرحباً ${customer.name} 👋\n\n`;
    message += `📄 فاتورة رقم: *${invoice.invoiceNumber}*\n`;
    message += `💳 القسط رقم: *${installment.installmentNumber}*\n`;
    message += `📅 تاريخ الاستحقاق: *${new Date(installment.dueDate).toLocaleDateString('ar-EG')}*\n`;
    message += `💰 المبلغ المطلوب: *${Helpers.formatCurrency(installment.amount - installment.paidAmount)}*\n\n`;
    message += `\nشكراً لالتزامكم — PayQusta 💙`;

    return this.sendMessage(phone, message);
  }

  async sendVendorSupplierPaymentReminder(vendorPhone, supplier, payment) {
    let message = `⚠️ *تذكير — قسط مورد مستحق*\n\n`;
    message += `خلي بالك! انت عليك قسط للمورد *${supplier.name}* ⏳\n\n`;
    message += `💰 المبلغ المطلوب: *${Helpers.formatCurrency(payment.amount - payment.paidAmount)}*\n`;
    message += `📅 تاريخ الاستحقاق: *${new Date(payment.dueDate).toLocaleDateString('ar-EG')}*\n\n`;
    message += `\n— PayQusta 💙`;

    return this.sendMessage(vendorPhone, message);
  }

  async sendLowStockAlert(phone, product, isOutOfStock = false) {
    const emoji = isOutOfStock ? '🚨' : '⚠️';
    const status = isOutOfStock ? 'نفذ من المخزون!' : 'المخزون منخفض';

    let message = `${emoji} *تنبيه مخزون — ${status}*\n\n`;
    message += `المنتج: *${product.name}*\n`;
    message += `الكود: ${product.sku || 'غير محدد'}\n`;
    message += `الكمية الحالية: *${product.stock.quantity}* ${product.stock.unit}\n`;
    message += `الحد الأدنى: ${product.stock.minQuantity} ${product.stock.unit}\n`;
    message += `\n— PayQusta`;

    return this.sendMessage(phone, message);
  }

  async sendRestockRequest(coordinatorPhone, product, requestedQuantity, storeName = 'PayQusta', tenantWhatsapp = null) {
    // Try restock_request template first (English)
    const templateResult = await this.sendRestockTemplate(
      coordinatorPhone, storeName, product, requestedQuantity, tenantWhatsapp
    );
    if (templateResult.success) {
      return templateResult;
    }

    // Fallback to regular message
    let message = `📦 *طلب إعادة تخزين*\n\n`;
    message += `المنتج: *${product.name}*\n`;
    message += `الكمية المطلوبة: *${requestedQuantity}* ${product.stock.unit}\n`;
    message += `الكمية الحالية: ${product.stock.quantity} ${product.stock.unit}\n`;

    if (product.supplier) {
      message += `المورد: ${product.supplier.name}\n`;
      message += `هاتف المورد: ${product.supplier.phone}\n`;
    }

    message += `\nيرجى التواصل مع المورد لطلب الكمية.\n`;
    message += `— PayQusta`;

    return this.sendMessage(coordinatorPhone, message);
  }

  async sendTransactionHistory(phone, customer, invoices, tenantWhatsapp = null) {
    // Try statement template first
    const templateResult = await this.sendStatementTemplate(phone, customer, tenantWhatsapp);
    if (templateResult.success) {
      return templateResult;
    }

    // Fallback to regular message
    let message = `📊 *سجل معاملات — ${customer.name}*\n\n`;

    invoices.slice(0, 10).forEach((inv) => {
      const statusEmoji = inv.status === 'paid' ? '✅' : inv.status === 'overdue' ? '🔴' : '🟡';
      message += `${statusEmoji} ${inv.invoiceNumber} — ${Helpers.formatCurrency(inv.totalAmount)}`;
      if (inv.remainingAmount > 0) {
        message += ` (متبقي: ${Helpers.formatCurrency(inv.remainingAmount)})`;
      }
      message += `\n`;
    });

    message += `\n💰 إجمالي المشتريات: ${Helpers.formatCurrency(customer.financials.totalPurchases)}\n`;
    message += `✅ إجمالي المسدد: ${Helpers.formatCurrency(customer.financials.totalPaid)}\n`;
    if (customer.financials.outstandingBalance > 0) {
      message += `⚠️ المتبقي: ${Helpers.formatCurrency(customer.financials.outstandingBalance)}\n`;
    }
    message += `\n— PayQusta 💙`;

    return this.sendMessage(phone, message);
  }
}

module.exports = new WhatsAppService();
