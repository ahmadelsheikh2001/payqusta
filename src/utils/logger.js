/**
 * Logger Configuration — Winston + Morgan
 * Structured logging with file transports and console output
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists at startup
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, tenant, user }) => {
    const ctx = [tenant && `T:${tenant}`, user && `U:${user}`].filter(Boolean).join(' ');
    return `[${timestamp}] ${level.toUpperCase()}${ctx ? ` [${ctx}]` : ''}: ${stack || message}`;
  })
);

// JSON format for production (machine-parseable)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: { service: 'payqusta' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
      silent: process.env.LOG_SILENT === 'true',
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: isProduction ? jsonFormat : logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
    // Combined log file (all levels)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: isProduction ? jsonFormat : logFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    // HTTP access log (for Morgan)
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      format: logFormat,
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

/** Morgan-compatible stream — writes HTTP logs to Winston */
logger.morganStream = {
  write: (message) => logger.info(message.trim(), { type: 'http' }),
};

/** Create a child logger with tenant/user context attached */
logger.withContext = (tenantId, userId) =>
  logger.child({ tenant: tenantId?.toString(), user: userId?.toString() });

/** Log an API error with request context */
logger.apiError = (err, req) => {
  logger.error(err.message, {
    stack: err.stack,
    method: req?.method,
    url: req?.originalUrl,
    tenant: req?.tenantId?.toString(),
    user: req?.user?._id?.toString(),
    ip: req?.ip,
  });
};

module.exports = logger;
