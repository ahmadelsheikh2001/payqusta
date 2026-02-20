/**
 * File Upload Middleware - Multer Configuration
 * Handles image uploads with validation and processing
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

// File signature validation (Magic Numbers)
const FILE_SIGNATURES = {
  'image/jpeg': [['ff', 'd8', 'ff']],
  'image/png': [['89', '50', '4e', '47']],
  'image/webp': [['52', '49', '46', '46']], // RIFF
  'image/gif': [['47', '49', '46', '38']], // GIF8
};

/**
 * Validate file signature (Magic Number)
 * Prevents file type spoofing
 */
const validateFileSignature = (buffer, mimetype) => {
  if (!FILE_SIGNATURES[mimetype]) return false;

  const signatures = FILE_SIGNATURES[mimetype];
  const hex = buffer.toString('hex', 0, 8);

  return signatures.some(sig => {
    const sigHex = sig.join('');
    return hex.startsWith(sigHex);
  });
};

/**
 * Sanitize filename to prevent path traversal attacks
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100);
};

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Memory storage (we'll process with Sharp before saving)
const storage = multer.memoryStorage();

// File filter - enhanced security
const fileFilter = (req, file, cb) => {
  // Check extension
  const allowedExtensions = /jpeg|jpg|png|webp|gif/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  // Check mimetype
  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const validMimetype = allowedMimetypes.includes(file.mimetype);

  // Sanitize filename
  file.originalname = sanitizeFilename(file.originalname);

  if (!extname || !validMimetype) {
    return cb(AppError.badRequest('الصور فقط مسموحة (JPEG, PNG, WebP, GIF)'), false);
  }

  // Additional validation will be done in processImage with magic number check
  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

/**
 * Process and save uploaded image
 * @param {Buffer} buffer - Image buffer from multer
 * @param {String} filename - Desired filename
 * @param {String} folder - Upload folder (products, avatars, etc.)
 * @param {String} mimetype - Original file mimetype for validation
 * @returns {String} - Saved file path
 */
const processImage = async (buffer, filename, folder = 'products', mimetype = 'image/jpeg') => {
  // Validate file signature (magic number check)
  if (!validateFileSignature(buffer, mimetype)) {
    throw AppError.badRequest('ملف غير صالح - فشل التحقق من نوع الملف');
  }

  const uploadDir = path.join(__dirname, '../../uploads', folder);
  ensureDirectoryExists(uploadDir);

  // Generate secure random filename
  const randomName = crypto.randomBytes(16).toString('hex');
  const ext = '.webp'; // Always convert to webp for consistency and security
  const secureFilename = `${randomName}${ext}`;
  const filepath = path.join(uploadDir, secureFilename);

  try {
    // Process image with Sharp (resize, optimize, convert to webp)
    // Sharp also acts as additional validation - will fail on corrupted/malicious files
    await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    return `/uploads/${folder}/${secureFilename}`;
  } catch (error) {
    console.error('Image processing error:', error);
    throw AppError.badRequest('فشل معالجة الصورة - الملف قد يكون تالفاً');
  }
};

/**
 * Delete uploaded file
 */
const deleteFile = (filepath) => {
  try {
    const fullPath = path.join(__dirname, '../..', filepath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

module.exports = {
  upload,
  processImage,
  deleteFile,
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 5),
};
