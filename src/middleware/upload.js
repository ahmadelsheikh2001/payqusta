/**
 * File Upload Middleware - Multer Configuration
 * Handles image uploads with validation and processing
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Memory storage (we'll process with Sharp before saving)
const storage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(AppError.badRequest('الصور فقط مسموحة (JPEG, PNG, WebP, GIF)'), false);
  }
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
 * @returns {String} - Saved file path
 */
const processImage = async (buffer, filename, folder = 'products') => {
  const uploadDir = path.join(__dirname, '../../uploads', folder);
  ensureDirectoryExists(uploadDir);

  const filepath = path.join(uploadDir, filename);

  // Process image with Sharp (resize, optimize, convert to webp)
  await sharp(buffer)
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toFile(filepath);

  return `/uploads/${folder}/${filename}`;
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
