const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validators/auth.validator');

// Public Auth Endpoints
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshTokenHandler);
router.post('/logout', authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);

// Protected Auth Endpoints
router.get('/me', authenticate, authController.getMe);
router.put('/update-profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

module.exports = router;
