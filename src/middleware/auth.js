const AppError = require("../utils/errors");

const supabase = require("../config/supabase");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new AppError("No token provided. Please log in.", 401));
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return next(new AppError("Invalid or expired token. Please log in again.", 401));
    }

    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
