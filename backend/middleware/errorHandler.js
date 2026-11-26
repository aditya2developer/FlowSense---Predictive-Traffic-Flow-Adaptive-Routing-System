// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error('FlowSense Error:', err.message);
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
}

module.exports = errorHandler;
