// src/middleware/errorHandler.js
// Centralized error handling middleware for Express

/**
 * Global error handler middleware
 * Catches all errors from routes and sends appropriate response
 *
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error("Error occurred:");
  console.error("Path:", req.path);
  console.error("Method:", req.method);
  console.error("Error:", err);

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Determine error message
  const message = err.message || "Internal Server Error";

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
};

export { errorHandler, notFoundHandler };
