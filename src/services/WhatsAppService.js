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

// Default Template Names (create these in Meta Business Suite)
const TEMPLATES = {
  STATEMENT: 'customer_statement',      // كشف حساب
  PAYMENT_REMINDER: 'payment_reminder', // تذكير بالقسط
  INVOICE: 'invoice_notification',      // فاتورة جديدة
  RESTOCK: 'restock_request',           // طلب إعادة تخزين
  WELCOME: 'welcome_message',           // رسالة ترحيب
  PAYMENT_RECEIVED: 'payment_received', // تأكيد استلام دفعة
};

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.templates = TEMPLATES;
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
   * Template: customer_statement
   * Params: {{1}} = customer_name, {{2}} = total_purchases, {{3}} = total_paid, {{4}} = outstanding
   */
  async sendStatementTemplate(phone, customer) {
    const params = [
      customer.name,
      Helpers.formatCurrency(customer.financials?.totalPurchases || 0),
      Helpers.formatCurrency(customer.financials?.totalPaid || 0),
      Helpers.formatCurrency(customer.financials?.outstandingBalance || 0),
    ];
    
    return this.sendTemplate(phone, this.templates.STATEMENT, 'ar', params);
  }

  /**
   * Send payment reminder using template
   * Template: payment_reminder
   * Params: {{1}} = customer_name, {{2}} = amount, {{3}} = due_date, {{4}} = invoice_number
   */
  async sendPaymentReminderTemplate(phone, customer, amount, dueDate, invoiceNumber) {
    const params = [
      customer.name,
      Helpers.formatCurrency(amount),
      new Date(dueDate).toLocaleDateString('ar-EG'),
      invoiceNumber,
    ];
    
    return this.sendTemplate(phone, this.templates.PAYMENT_REMINDER, 'ar', params);
  }

  /**
   * Send invoice notification using template
   * Template: invoice_notification
   * Params: {{1}} = customer_name, {{2}} = invoice_number, {{3}} = total_amount, {{4}} = payment_method
   */
  async sendInvoiceTemplate(phone, customer, invoice) {
    const paymentMethods = { cash: 'نقداً', installment: 'بالتقسيط', deferred: 'آجل' };
    const params = [
      customer.name,
      invoice.invoiceNumber,
      Helpers.formatCurrency(invoice.totalAmount),
      paymentMethods[invoice.paymentMethod] || 'نقداً',
    ];
    
    return this.sendTemplate(phone, this.templates.INVOICE, 'ar', params);
  }

  /**
   * Send restock request to supplier using template
   * Template: restock_request
   * Params: {{1}} = store_name, {{2}} = product_name, {{3}} = quantity, {{4}} = current_stock
   */
  async sendRestockTemplate(phone, storeName, product, quantity) {
    const params = [
      storeName,
      product.name,
      `${quantity} ${product.stock?.unit || 'قطعة'}`,
      `${product.stock?.quantity || 0} ${product.stock?.unit || 'قطعة'}`,
    ];
    
    return this.sendTemplate(phone, this.templates.RESTOCK, 'ar', params);
  }

  /**
   * Send payment received confirmation using template
   * Template: payment_received
   * Params: {{1}} = customer_name, {{2}} = amount, {{3}} = remaining, {{4}} = invoice_number
   */
  async sendPaymentReceivedTemplate(phone, customer, amount, remaining, invoiceNumber) {
    const params = [
      customer.name,
      Helpers.formatCurrency(amount),
      Helpers.formatCurrency(remaining),
      invoiceNumber,
    ];
    
    return this.sendTemplate(phone, this.templates.PAYMENT_RECEIVED, 'ar', params);
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
   * Get list of available templates from Meta
   */
  async getTemplates() {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    try {
      // Get business account ID from phone number
      const phoneInfoResponse = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          params: { fields: 'verified_name,display_phone_number' },
        }
      );

      logger.info(`[WhatsApp] Phone Info: ${JSON.stringify(phoneInfoResponse.data)}`);

      // Get templates requires WABA ID, which we might not have directly
      // Return configured templates instead
      return {
        success: true,
        phoneInfo: phoneInfoResponse.data,
        configuredTemplates: this.templates,
        hint: 'قم بإنشاء هذه القوالب في Meta Business Suite',
      };
    } catch (error) {
      logger.error(`[WhatsApp] Get templates failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check template status by trying to send to a test number
   * Returns which templates are working and which are missing
   */
  async checkTemplateStatus() {
    this.refreshCredentials();
    if (!this.isConfigured()) {
      return {
        success: false,
        reason: 'not_configured',
        message: 'WhatsApp غير مُعد بعد. يرجى إضافة Phone Number ID و Access Token في الإعدادات.'
      };
    }

    const results = {};
    const templateNames = Object.values(this.templates);

    // We can't actually test without sending, so we just return the configured templates
    // and provide instructions
    for (const templateName of templateNames) {
      results[templateName] = {
        configured: true,
        status: 'unknown',
        message: 'للتحقق من حالة القالب، حاول إرساله لرقم اختبار',
      };
    }

    return {
      success: true,
      templates: results,
      totalConfigured: templateNames.length,
      instructions: {
        ar: 'لإنشاء القوالب، اذهب إلى Meta Business Suite → WhatsApp Manager → Message Templates',
        en: 'To create templates, go to Meta Business Suite → WhatsApp Manager → Message Templates',
        url: 'https://business.facebook.com/wa/manage/message-templates/',
      },
      requiredTemplates: [
        {
          name: 'invoice_notification',
          priority: 'high',
          description: 'فاتورة جديدة',
          params: '{{1}}=customer_name, {{2}}=invoice_number, {{3}}=total_amount, {{4}}=payment_method',
        },
        {
          name: 'customer_statement',
          priority: 'medium',
          description: 'كشف حساب العميل',
          params: '{{1}}=customer_name, {{2}}=total_purchases, {{3}}=total_paid, {{4}}=outstanding',
        },
        {
          name: 'payment_reminder',
          priority: 'high',
          description: 'تذكير بالقسط',
          params: '{{1}}=customer_name, {{2}}=amount, {{3}}=due_date, {{4}}=invoice_number',
        },
        {
          name: 'restock_request',
          priority: 'low',
          description: 'طلب إعادة تخزين',
          params: '{{1}}=store_name, {{2}}=product_name, {{3}}=quantity, {{4}}=current_stock',
        },
        {
          name: 'payment_received',
          priority: 'medium',
          description: 'تأكيد استلام دفعة',
          params: '{{1}}=customer_name, {{2}}=amount, {{3}}=remaining, {{4}}=invoice_number',
        },
      ],
    };
  }

  /**
   * =====================================================
   * LEGACY METHODS (kept for backwards compatibility)
   * Now with smart fallback to templates
   * =====================================================
   */

  async sendInvoiceNotification(phone, invoice, customer) {
    // Try template first
    const templateResult = await this.sendInvoiceTemplate(phone, customer, invoice);
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

  async sendInstallmentReminder(phone, customer, invoice, installment) {
    // Try template first
    const templateResult = await this.sendPaymentReminderTemplate(
      phone, 
      customer, 
      installment.amount - installment.paidAmount,
      installment.dueDate,
      invoice.invoiceNumber
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

  async sendRestockRequest(coordinatorPhone, product, requestedQuantity) {
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

  async sendTransactionHistory(phone, customer, invoices) {
    // Try statement template first
    const templateResult = await this.sendStatementTemplate(phone, customer);
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
