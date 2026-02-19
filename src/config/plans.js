/**
 * Subscription Plans & Limits
 */

const PLANS = {
  free: {
    name: 'مجاني',
    limits: {
      stores: 1,
      products: 50,
      users: 2,
      invoices: 100, // per month
    },
    features: ['basic_reports', 'pos'],
  },
  basic: {
    name: 'أساسي',
    limits: {
      stores: 2,
      products: 500,
      users: 5,
      invoices: 1000,
    },
    features: ['basic_reports', 'pos', 'whatsapp_notifications'],
  },
  professional: {
    name: 'احترافي',
    limits: {
      stores: 5,
      products: 10000, // Effectively unlimited for most
      users: 10,
      invoices: 10000,
    },
    features: ['advanced_reports', 'pos', 'whatsapp_notifications', 'multi_branch'],
  },
  // Alias for backward compatibility
  pro: {
    name: 'احترافي',
    limits: {
      stores: 5,
      products: 10000,
      users: 10,
      invoices: 10000,
    },
    features: ['advanced_reports', 'pos', 'whatsapp_notifications', 'multi_branch'],
  },
  enterprise: {
    name: 'مؤسسي',
    limits: {
      stores: 999, // Unlimited
      products: 999999, // Unlimited
      users: 999, // Unlimited
      invoices: 999999, // Unlimited
    },
    features: ['all'],
  },
};

module.exports = PLANS;
