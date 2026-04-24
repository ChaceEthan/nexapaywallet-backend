/**
 * @description Wrapper to handle async errors in express routes
 * @param {Function} requestHandler - The async function to wrap
 * @returns {Function} - The wrapped function with error handling
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

module.exports = { asyncHandler };
