/**
 * Standardized API Response Class
 * Ensures consistent response format across all endpoints
 */

class ApiResponse {
  /**
   * Success response
   */
  static success(res, data = null, message = 'تمت العملية بنجاح', statusCode = 200) {
    const response = {
      success: true,
      message,
      ...(data !== null && { data }),
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Created response (201)
   */
  static created(res, data, message = 'تم الإنشاء بنجاح') {
    return this.success(res, data, message, 201);
  }

  /**
   * Paginated response
   */
  static paginated(res, data, pagination, message = 'تم جلب البيانات بنجاح') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        totalItems: pagination.total,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrevPage: pagination.page > 1,
      },
    });
  }

  /**
   * Error response
   */
  static error(res, message = 'حدث خطأ', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      ...(errors && { errors }),
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Validation error response
   */
  static validationError(res, errors) {
    return res.status(422).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors: errors.map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }

  /**
   * No content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;
