/**
 * Payment Gateway Configuration
 * Manages API credentials and settings for all payment gateways
 */

module.exports = {
  // Paymob (Visa/Mastercard + Mobile Wallets)
  paymob: {
    apiKey: process.env.PAYMOB_API_KEY || '',
    integrationId: process.env.PAYMOB_INTEGRATION_ID || '',
    iframeId: process.env.PAYMOB_IFRAME_ID || '',
    hmacSecret: process.env.PAYMOB_HMAC_SECRET || '',
    apiUrl: process.env.PAYMOB_API_URL || 'https://accept.paymob.com/api',
    enabled: process.env.PAYMOB_ENABLED === 'true',
    fees: parseFloat(process.env.PAYMOB_FEES || '2.5'), // %
  },

  // Fawry (Cash payment at stores)
  fawry: {
    merchantCode: process.env.FAWRY_MERCHANT_CODE || '',
    securityKey: process.env.FAWRY_SECURITY_KEY || '',
    apiUrl: process.env.FAWRY_API_URL || 'https://www.atfawry.com/fawrypay-api/api',
    enabled: process.env.FAWRY_ENABLED === 'true',
    fees: parseFloat(process.env.FAWRY_FEES || '1.5'), // %
  },

  // Vodafone Cash
  vodafoneCash: {
    merchantId: process.env.VODAFONE_MERCHANT_ID || '',
    apiKey: process.env.VODAFONE_API_KEY || '',
    apiUrl: process.env.VODAFONE_API_URL || 'https://api.vodafonecash.com.eg',
    enabled: process.env.VODAFONE_ENABLED === 'true',
    fees: parseFloat(process.env.VODAFONE_FEES || '2.0'), // %
  },

  // InstaPay
  instaPay: {
    merchantId: process.env.INSTAPAY_MERCHANT_ID || '',
    apiKey: process.env.INSTAPAY_API_KEY || '',
    apiUrl: process.env.INSTAPAY_API_URL || 'https://api.instapay.com.eg',
    enabled: process.env.INSTAPAY_ENABLED === 'true',
    fees: parseFloat(process.env.INSTAPAY_FEES || '0.5'), // %
  },

  // General Settings
  settings: {
    feesOnCustomer: process.env.PAYMENT_FEES_ON_CUSTOMER === 'true',
    earlyPaymentDiscount: parseFloat(process.env.EARLY_PAYMENT_DISCOUNT || '3'), // %
    linkExpiryHours: parseInt(process.env.PAYMENT_LINK_EXPIRY_HOURS || '24', 10),
    currency: process.env.PAYMENT_CURRENCY || 'EGP',
    successUrl: process.env.PAYMENT_SUCCESS_URL || `${process.env.APP_URL || 'http://localhost:5173'}/payment/success`,
    failureUrl: process.env.PAYMENT_FAILURE_URL || `${process.env.APP_URL || 'http://localhost:5173'}/payment/failure`,
  },

  // Helper: Check if any gateway is enabled
  hasEnabledGateway() {
    return this.paymob.enabled || this.fawry.enabled || 
           this.vodafoneCash.enabled || this.instaPay.enabled;
  },

  // Helper: Get all enabled gateways
  getEnabledGateways() {
    const gateways = [];
    if (this.paymob.enabled) gateways.push({ id: 'paymob', name: 'Paymob', fees: this.paymob.fees });
    if (this.fawry.enabled) gateways.push({ id: 'fawry', name: 'Fawry', fees: this.fawry.fees });
    if (this.vodafoneCash.enabled) gateways.push({ id: 'vodafone', name: 'Vodafone Cash', fees: this.vodafoneCash.fees });
    if (this.instaPay.enabled) gateways.push({ id: 'instapay', name: 'InstaPay', fees: this.instaPay.fees });
    return gateways;
  },
};
