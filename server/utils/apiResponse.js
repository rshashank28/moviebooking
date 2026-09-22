class ApiResponse {
  static success(res, message = 'Success', data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static created(res, message = 'Resource created successfully', data = {}) {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  static paginated(res, message = 'Fetched successfully', data = [], page = 1, limit = 10, total = 0) {
    const totalPages = Math.ceil(total / limit) || 1;
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  }

  static error(res, message = 'Internal server error', statusCode = 500, code = 'INTERNAL_ERROR', errors = null) {
    const response = {
      success: false,
      message,
      code
    };
    if (errors) {
      response.errors = errors;
    }
    return res.status(statusCode).json(response);
  }
}

module.exports = ApiResponse;
