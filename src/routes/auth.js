const express = require("express");
const supabase = require("../config/supabase");
const { supabaseAdmin } = require("../config/supabase");
const AppError = require("../utils/errors");
const authMiddleware = require("../middleware/auth");
const {
  decryptPasswordForAuth,
  hashLegacyPasswordForAuth,
} = require("../utils/passwordEncryption");

const router = express.Router();

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();
const normalizeFullName = (fullName) => String(fullName || "").trim();
const decryptRequestPassword = (encryptedPassword) => {
  try {
    return decryptPasswordForAuth(encryptedPassword);
  } catch (error) {
    if (error.message === "Password decryption is not configured.") {
      throw new AppError(error.message, 500);
    }

    throw new AppError("Invalid encrypted password.", 400);
  }
};

const formatAuthResponse = (data) => ({
  user: data.user
    ? {
        id: data.user.id,
        email: data.user.email,
        emailConfirmedAt: data.user.email_confirmed_at,
        createdAt: data.user.created_at,
        userMetadata: data.user.user_metadata,
      }
    : null,
  session: data.session
    ? {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        tokenType: data.session.token_type,
      }
    : null,
  token: data.session?.access_token || null,
});

router.post("/register", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { encryptedPassword } = req.body;
    const fullName = normalizeFullName(req.body.fullName);

    if (!email || !encryptedPassword) {
      return next(new AppError("Email and encrypted password are required.", 400));
    }

    const password = decryptRequestPassword(encryptedPassword);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email,
        },
      },
    });

    if (error) {
      return next(new AppError(error.message, error.status || 400));
    }

    res.status(201).json({
      success: true,
      message: data.session
        ? "Registration successful."
        : "Registration successful. Please check your email to confirm your account.",
      data: formatAuthResponse(data),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { encryptedPassword } = req.body;

    if (!email || !encryptedPassword) {
      return next(new AppError("Email and encrypted password are required.", 400));
    }

    const password = decryptRequestPassword(encryptedPassword);

    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const legacyPasswordHash = hashLegacyPasswordForAuth({ email, password });
      const legacyLogin = await supabase.auth.signInWithPassword({
        email,
        password: legacyPasswordHash,
      });

      data = legacyLogin.data;
      error = legacyLogin.error;

      if (!error && supabaseAdmin && data.user?.id) {
        const { error: migrationError } = await supabaseAdmin.auth.admin.updateUserById(
          data.user.id,
          { password },
        );

        if (migrationError) {
          return next(new AppError(migrationError.message, migrationError.status || 500));
        }
      }
    }

    if (error) {
      return next(new AppError(error.message, error.status || 401));
    }

    res.json({
      success: true,
      message: "Login successful.",
      data: formatAuthResponse(data),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    if (!supabaseAdmin) {
      return next(
        new AppError(
          "Logout is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the backend environment.",
          500,
        ),
      );
    }

    const { error } = await supabaseAdmin.auth.admin.signOut(req.accessToken);

    if (error) {
      return next(new AppError(error.message, error.status || 400));
    }

    res.json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
