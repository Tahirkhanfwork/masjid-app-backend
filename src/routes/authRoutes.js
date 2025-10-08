const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);
router.post('/forgot-password', [body('email').isEmail()], authController.forgotPassword);
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isNumeric().withMessage('OTP must be a number')
  ],
  authController.verifyOtp
);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
