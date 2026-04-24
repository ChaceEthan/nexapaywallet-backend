const { ApiError } = require("../utils/apiError");

/**
 * @description Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Check if error is an instance of ApiError, if not, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === "ValidationError" ? 400 : 500);
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

module.exports = { errorHandler };
