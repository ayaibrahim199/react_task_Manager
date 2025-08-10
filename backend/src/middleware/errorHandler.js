// Centralized error handler
// Ensures all errors return a consistent JSON shape

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // Avoid leaking internals
  const isProd = process.env.NODE_ENV === 'production';
  const message = err.message || 'Internal Server Error';

  // Handle common cases (mongoose, jwt, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => ({ field: e.path, message: e.message }))
    });
  }

  return res.status(status).json({
    message,
    ...(isProd ? {} : { stack: err.stack })
  });
}

module.exports = errorHandler; 