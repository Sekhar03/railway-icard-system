const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Determine upload base path
// Use memory storage to keep files in RAM as Buffer objects
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!file || !file.mimetype) {
    return cb(new Error('Invalid file upload'));
  }
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WEBP)'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: err.message || 'File upload error' });
  } else if (err) {
    return res.status(500).json({ success: false, error: err.message || 'Error uploading file' });
  }
  next();
};

module.exports = {
  upload,
  handleUploadErrors
};
