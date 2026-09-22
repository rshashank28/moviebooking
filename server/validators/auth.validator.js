const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.empty': 'Password is required'
  }),
  phone: Joi.string().allow('', null),
  role: Joi.string().valid('CUSTOMER', 'ORGANIZER').default('CUSTOMER'),
  organizationName: Joi.when('role', {
    is: 'ORGANIZER',
    then: Joi.string().min(2).required().messages({
      'string.empty': 'Organization Name is required for Organizer accounts'
    }),
    otherwise: Joi.forbidden()
  }),
  referralCode: Joi.string().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required'
  })
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().allow('', null),
  avatar: Joi.string().allow('', null),
  preferredCity: Joi.string().allow('', null)
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
