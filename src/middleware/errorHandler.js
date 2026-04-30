const AppError = require("../utils/errors");

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Wrong JWT error
  if (err.name === "JsonWebTokenError") {
    const message = `Invalid token`;
    err = new AppError(message, 400);
  }

  // JWT Expired
  if (err.name === "TokenExpiredError") {
    const message = `Token has expired`;
    err = new AppError(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
