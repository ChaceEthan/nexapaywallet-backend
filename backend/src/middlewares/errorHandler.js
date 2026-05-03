function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
}

function globalErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource id";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate resource";
  }

  const response = {
    success: false,
    message: statusCode >= 500 ? "Internal server error" : message
  };

  if (process.env.NODE_ENV !== "production") {
    response.error = error.message;
    response.stack = error.stack;
  }

  console.error("Request error:", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: error.message
  });
  return res.status(statusCode).json(response);
}

module.exports = {
  asyncHandler,
  notFoundHandler,
  globalErrorHandler
};
