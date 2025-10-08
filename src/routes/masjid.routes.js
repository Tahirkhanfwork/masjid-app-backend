const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/masjid.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../public/uploads/documents');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.post(
  '/',
  upload.fields([
    { name: 'masjid_certificate', maxCount: 1 },
    { name: 'aadhar_card', maxCount: 1 },
    { name: 'electricity_bill', maxCount: 1 }
  ]),
  [
    body('masjid_name')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Masjid name is required')
      .isLength({ max: 100 }),
    body('address').optional().isLength({ max: 100 }),
    body('pincode').optional().isLength({ max: 20 }),
    body('imam_name').optional().isLength({ max: 100 }),
    body('qr_file_url').optional().isString(),
    body('status').optional().isIn(['active', 'inactive']),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isString()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  ctrl.registerMasjid
);

router.put('/:id', ctrl.updateMasjid);
router.get('/:id', ctrl.getMasjidById);

module.exports = router;
