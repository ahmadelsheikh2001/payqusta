/**
 * Helper Utilities
 * Common helper functions used across the application
 */

const crypto = require('crypto');

class Helpers {
  /**
   * Generate a unique invoice number
   * Format: INV-YYYYMMDD-XXXX
   */
  static generateInvoiceNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `INV-${dateStr}-${rand}`;
  }

  /**
   * Generate installment schedule
   * @param {number} totalAmount - Total amount to be paid
   * @param {number} downPayment - Down payment amount
   * @param {number} numberOfInstallments - Number of installments
   * @param {string} frequency - Payment frequency (weekly, biweekly, monthly)
   * @param {Date} startDate - First installment date
   * @returns {Array} Array of installment objects
   */
  static generateInstallmentSchedule(
    totalAmount,
    downPayment = 0,
    numberOfInstallments,
    frequency = 'monthly',
    startDate = new Date()
  ) {
    const remainingAmount = totalAmount - downPayment;
    const installmentAmount = Math.ceil(remainingAmount / numberOfInstallments);
    const schedule = [];

    let currentDate = new Date(startDate);

    for (let i = 0; i < numberOfInstallments; i++) {
      // Calculate due date based on frequency
      const dueDate = new Date(currentDate);

      switch (frequency) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + 7 * (i + 1));
          break;
        case 'biweekly':
          dueDate.setDate(dueDate.getDate() + 15 * (i + 1));
          break;
        case 'monthly':
          dueDate.setMonth(dueDate.getMonth() + (i + 1));
          break;
        case 'bimonthly':
          dueDate.setMonth(dueDate.getMonth() + 2 * (i + 1));
          break;
        default:
          dueDate.setMonth(dueDate.getMonth() + (i + 1));
      }

      // Last installment gets the remainder
      const amount = i === numberOfInstallments - 1
        ? remainingAmount - installmentAmount * (numberOfInstallments - 1)
        : installmentAmount;

      schedule.push({
        installmentNumber: i + 1,
        amount: Math.max(amount, 0),
        dueDate,
        status: 'pending',
        paidAmount: 0,
        paidDate: null,
      });
    }

    return schedule;
  }

  /**
   * Calculate days between two dates
   */
  static daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date2 - date1) / oneDay));
  }

  /**
   * Format currency for Arabic display
   */
  static formatCurrency(amount, currency = 'EGP') {
    const symbols = { EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ', USD: '$' };
    return `${amount.toLocaleString('ar-EG')} ${symbols[currency] || currency}`;
  }

  /**
   * Format Egyptian phone number for WhatsApp
   * Egyptian numbers should be: 20XXXXXXXXX (country code 20)
   */
  static formatPhoneForWhatsApp(phone) {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle various Egyptian formats:
    // 01234567890 -> 201234567890
    // 201234567890 -> 201234567890
    // +201234567890 -> 201234567890
    // 1234567890 -> 201234567890
    
    if (cleaned.startsWith('0')) {
      // Starts with 0 (like 01012345678) - replace 0 with 20
      cleaned = '20' + cleaned.substring(1);
    } else if (cleaned.startsWith('2') && cleaned.length === 11) {
      // Already has 2 but not full country code (like 21234567890)
      cleaned = '20' + cleaned.substring(1);
    } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
      // Doesn't have country code (like 1012345678) - add 20
      cleaned = '20' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Generate random strong password
   */
  static generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    return Array.from(crypto.randomBytes(length))
      .map((b) => chars[b % chars.length])
      .join('');
  }

  /**
   * Paginate query helper
   */
  static getPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
    const skip = (page - 1) * limit;
    const sort = query.sort || '-createdAt';

    return { page, limit, skip, sort };
  }

  /**
   * Build search filter for MongoDB
   */
  static buildSearchFilter(query, searchFields = []) {
    const filter = {};

    if (query.search && searchFields.length > 0) {
      filter.$or = searchFields.map((field) => ({
        [field]: { $regex: query.search, $options: 'i' },
      }));
    }

    return filter;
  }

  /**
   * Sanitize output — remove sensitive fields
   */
  static sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.__v;
    return obj;
  }
}

module.exports = Helpers;
