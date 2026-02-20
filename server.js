/**
 * PayQusta — Main Server Entry Point
 * Multi-Vendor SaaS CRM System
 * 
 * @author PayQusta Team
 * @version 1.0.0
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./src/config/database');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');
const routes = require('./src/routes');
const swaggerSpec = require('./src/config/swagger');
const swaggerUi = require('swagger-ui-express');

// Import scheduled jobs
const InstallmentScheduler = require('./src/jobs/InstallmentScheduler');
const StockMonitorJob = require('./src/jobs/StockMonitorJob');

class PayQustaServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
  }

  /**
   * Initialize all server configurations
   */
  async initialize() {
    await this._connectDatabase();
    this._configureMiddleware();
    this._configureRoutes();
    this._configureErrorHandling();
    this._startScheduledJobs();
  }

  /**
   * Connect to MongoDB
   */
  async _connectDatabase() {
    await connectDB();

    // One-time Data Migration: Clear legacy whatsapp string fields
    try {
      const Customer = require('./src/models/Customer');
      const Tenant = require('./src/models/Tenant');

      // Clear whatsapp if it's a string in Customer
      await Customer.updateMany(
        { whatsapp: { $type: 'string' } },
        [
          { $set: { whatsappNumber: '$whatsapp' } },
          { $unset: ['whatsapp'] }
        ]
      );

      // Clear whatsapp if it's a string in Tenant
      await Tenant.updateMany(
        { whatsapp: { $type: 'string' } },
        { $unset: { whatsapp: 1 } }
      );

      logger.info('✅ Data migration for WhatsApp fields completed');
    } catch (err) {
      logger.error(`❌ Data migration failed: ${err.message}`);
    }
  }

  /**
   * Configure Express middleware stack
   */
  _configureMiddleware() {
    // Security headers with Helmet
    this.app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      } : false, // Disable CSP in development for easier debugging
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      } : false,
      noSniff: true, // X-Content-Type-Options: nosniff
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY
      xssFilter: true, // X-XSS-Protection: 1; mode=block
    }));

    // CORS configuration
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }

    this.app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
      exposedHeaders: ['Content-Disposition'], // For file downloads
    }));

    // General API Rate limiting
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Strict in production
      message: {
        success: false,
        message: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', apiLimiter);

    // Strict Auth Rate Limiter (5 attempts per 15 mins)
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      skipSuccessfulRequests: true,
      message: {
        success: false,
        message: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة',
      },
    });
    this.app.use('/api/v1/auth/login', authLimiter);
    this.app.use('/api/v1/auth/register', authLimiter);

    // Password Reset Rate Limiter (3 attempts per hour)
    const passwordResetLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 3,
      message: {
        success: false,
        message: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة',
      },
    });
    this.app.use('/api/v1/auth/forgot-password', passwordResetLimiter);
    this.app.use('/api/v1/auth/reset-password', passwordResetLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Sanitize data against NoSQL injection
    this.app.use(mongoSanitize());

    // Prevent HTTP param pollution
    this.app.use(hpp());

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
      }));
    }

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  }

  /**
   * Configure API routes
   */
  _configureRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'PayQusta API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      });
    });

    // Swagger API Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'PayQusta API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
      },
    }));
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // API routes
    this.app.use('/api/v1', routes);

    // Serve frontend in production
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, 'client/dist')));
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/dist/index.html'));
      });
    }
  }

  /**
   * Configure error handling
   */
  _configureErrorHandling() {
    this.app.use(notFound);
    this.app.use(errorHandler);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      this.server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      this.server.close(() => {
        logger.info('Process terminated.');
      });
    });
  }

  /**
   * Start scheduled background jobs
   */
  _startScheduledJobs() {
    const installmentScheduler = new InstallmentScheduler();
    installmentScheduler.start();

    const stockMonitor = new StockMonitorJob();
    stockMonitor.start();

    logger.info('✅ Scheduled jobs started');
  }

  /**
   * Start the server
   */
  async start() {
    await this.initialize();

    this.server = this.app.listen(this.port, () => {
      logger.info(`
╔══════════════════════════════════════════════╗
║         🚀 PayQusta Server Started           ║
║──────────────────────────────────────────────║
║  Environment : ${process.env.NODE_ENV || 'development'}
║  Port        : ${this.port}
║  API URL     : http://localhost:${this.port}/api/v1
║  Health      : http://localhost:${this.port}/api/health
║  API Docs    : http://localhost:${this.port}/api-docs
╚══════════════════════════════════════════════╝
      `);
    });

    return this.server;
  }
}

// Create and start server instance
const server = new PayQustaServer();
server.start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

module.exports = server;
