const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');

/**
 * Security Middleware Configuration
 * Provides protection against common attacks
 */

// ============ Rate Limiting ============

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Strict Rate Limiter for Auth endpoints
 * 5 login attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60), // minutes
    });
  },
});

/**
 * Password Reset Rate Limiter
 * 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة',
    });
  },
});

/**
 * File Upload Rate Limiter
 * 20 uploads per 15 minutes per user
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'تم تجاوز عدد مرات رفع الملفات. يرجى المحاولة لاحقاً',
});

// ============ CORS Configuration ============

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // Alternative dev port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

    // In production, add your domain
    if (process.env.NODE_ENV === 'production' && process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'], // For file downloads
  maxAge: 86400, // 24 hours
};

// ============ Helmet Configuration ============

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (for React)
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (for React)
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'], // Allow images from anywhere
      connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'], // Allow API calls
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
});

// ============ Mongo Sanitization ============

/**
 * MongoDB Injection Protection
 * Removes $ and . from user input
 */
const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_', // Replace prohibited characters with _
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ Potential MongoDB injection attempt detected in ${key}`);
  },
});

// ============ Export ============

module.exports = {
  // Rate Limiters
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,

  // CORS
  corsOptions,
  corsMiddleware: cors(corsOptions),

  // Helmet
  helmetConfig,

  // Mongo Sanitization
  mongoSanitizeConfig,
};