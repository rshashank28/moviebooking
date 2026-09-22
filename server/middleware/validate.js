const ApiResponse = require('../utils/apiResponse');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      return ApiResponse.error(
        res,
        'Input validation failed',
        400,
        'VALIDATION_ERROR',
        formattedErrors
      );
    }

    req[property] = value;
    next();
  };
};

module.exports = validate;
