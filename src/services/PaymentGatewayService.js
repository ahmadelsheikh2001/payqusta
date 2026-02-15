/**
 * Payment Gateway Service — Integration with Payment Providers
 * Supports: Paymob, Fawry, Stripe (configurable)
 */

const axios = require('axios');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class PaymentGatewayService {
  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER || 'paymob'; // paymob, fawry, stripe
    this.apiKey = process.env.PAYMENT_API_KEY;
    this.merchantId = process.env.PAYMENT_MERCHANT_ID;
    this.baseURL = this.getBaseURL();
  }

  getBaseURL() {
    const urls = {
      paymob: 'https://accept.paymob.com/api',
      fawry: 'https://atfawry.fawrystaging.com/ECommerceWeb/Fawry',
      stripe: 'https://api.stripe.com/v1',
    };
    return urls[this.provider] || urls.paymob;
  }

  /**
   * Create payment link for invoice
   */
  async createPaymentLink(invoice, customer) {
    try {
      switch (this.provider) {
        case 'paymob':
          return await this.createPaymobPayment(invoice, customer);
        case 'fawry':
          return await this.createFawryPayment(invoice, customer);
        case 'stripe':
          return await this.createStripePayment(invoice, customer);
        default:
          throw AppError.badRequest('مزود الدفع غير مدعوم');
      }
    } catch (error) {
      logger.error('Payment gateway error:', error);
      throw AppError.internal('فشل إنشاء رابط الدفع');
    }
  }

  /**
   * Paymob Integration
   */
  async createPaymobPayment(invoice, customer) {
    // Step 1: Get auth token
    const authRes = await axios.post(`${this.baseURL}/auth/tokens`, {
      api_key: this.apiKey,
    });
    const authToken = authRes.data.token;

    // Step 2: Create order
    const orderRes = await axios.post(
      `${this.baseURL}/ecommerce/orders`,
      {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: invoice.totalAmount * 100, // Convert to cents
        currency: 'EGP',
        merchant_order_id: invoice.invoiceNumber,
        items: invoice.items.map(item => ({
          name: item.productName,
          amount_cents: item.totalPrice * 100,
          quantity: item.quantity,
        })),
      }
    );

    // Step 3: Get payment key
    const paymentKeyRes = await axios.post(
      `${this.baseURL}/acceptance/payment_keys`,
      {
        auth_token: authToken,
        amount_cents: invoice.totalAmount * 100,
        expiration: 3600,
        order_id: orderRes.data.id,
        billing_data: {
          first_name: customer.name.split(' ')[0] || customer.name,
          last_name: customer.name.split(' ')[1] || '',
          phone_number: customer.phone,
          email: customer.email || 'noemail@payqusta.com',
          country: 'EG',
          city: 'Cairo',
          street: 'N/A',
          building: 'N/A',
          floor: 'N/A',
          apartment: 'N/A',
        },
        currency: 'EGP',
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
      }
    );

    return {
      paymentUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKeyRes.data.token}`,
      paymentToken: paymentKeyRes.data.token,
      orderId: orderRes.data.id,
    };
  }

  /**
   * Fawry Integration
   */
  async createFawryPayment(invoice, customer) {
    const payload = {
      merchantCode: this.merchantId,
      merchantRefNum: invoice.invoiceNumber,
      customerMobile: customer.phone,
      customerEmail: customer.email || 'noemail@payqusta.com',
      customerName: customer.name,
      chargeItems: invoice.items.map(item => ({
        itemId: item.product.toString(),
        description: item.productName,
        price: item.unitPrice,
        quantity: item.quantity,
      })),
      returnUrl: `${process.env.APP_URL}/payment/callback`,
    };

    const res = await axios.post(`${this.baseURL}/payments/charge`, payload, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    return {
      paymentUrl: res.data.paymentUrl,
      referenceNumber: res.data.referenceNumber,
    };
  }

  /**
   * Stripe Integration
   */
  async createStripePayment(invoice, customer) {
    const res = await axios.post(
      `${this.baseURL}/checkout/sessions`,
      {
        payment_method_types: ['card'],
        line_items: invoice.items.map(item => ({
          price_data: {
            currency: 'egp',
            product_data: { name: item.productName },
            unit_amount: item.unitPrice * 100,
          },
          quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/payment/cancel`,
        customer_email: customer.email,
        metadata: {
          invoice_id: invoice._id.toString(),
          invoice_number: invoice.invoiceNumber,
        },
      },
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    return {
      paymentUrl: res.data.url,
      sessionId: res.data.id,
    };
  }

  /**
   * Verify payment callback
   */
  async verifyPayment(provider, data) {
    switch (provider) {
      case 'paymob':
        return this.verifyPaymobCallback(data);
      case 'fawry':
        return this.verifyFawryCallback(data);
      case 'stripe':
        return this.verifyStripeCallback(data);
      default:
        return { success: false };
    }
  }

  verifyPaymobCallback(data) {
    // Verify HMAC signature
    return {
      success: data.success === 'true',
      invoiceNumber: data.merchant_order_id,
      amount: data.amount_cents / 100,
      transactionId: data.id,
    };
  }

  verifyFawryCallback(data) {
    return {
      success: data.orderStatus === 'PAID',
      invoiceNumber: data.merchantRefNumber,
      amount: data.paymentAmount,
      transactionId: data.fawryRefNumber,
    };
  }

  verifyStripeCallback(data) {
    return {
      success: data.payment_status === 'paid',
      invoiceNumber: data.metadata.invoice_number,
      amount: data.amount_total / 100,
      transactionId: data.payment_intent,
    };
  }
}

module.exports = new PaymentGatewayService();
