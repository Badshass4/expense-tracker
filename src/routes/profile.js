const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const profileSelect =
  "id, full_name, avatar_url, default_currency, monthly_budget, theme, created_at, updated_at";

const normalizeProfilePayload = (body) => ({
  full_name: String(body.fullName || body.full_name || "").trim(),
  avatar_url: body.avatarUrl || body.avatar_url ? String(body.avatarUrl || body.avatar_url).trim() : null,
  default_currency: String(body.defaultCurrency || body.default_currency || "INR").trim().toUpperCase(),
  monthly_budget:
    body.monthlyBudget === "" || body.monthly_budget === "" || body.monthlyBudget === null
      ? null
      : Number(body.monthlyBudget ?? body.monthly_budget),
  theme: String(body.theme || "light").trim().toLowerCase(),
});

const validateProfilePayload = (payload) => {
  if (!payload.full_name) {
    return "Full name is required.";
  }

  if (payload.full_name.length > 100) {
    return "Full name must be 100 characters or fewer.";
  }

  if (!["INR", "USD", "EUR", "GBP"].includes(payload.default_currency)) {
    return "Please select a valid currency.";
  }

  if (
    payload.monthly_budget !== null &&
    (!Number.isFinite(payload.monthly_budget) || payload.monthly_budget < 0)
  ) {
    return "Monthly budget must be 0 or greater.";
  }

  if (!["light", "dark"].includes(payload.theme)) {
    return "Please select a valid theme.";
  }

  return null;
};

router.get("/", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("user_profiles")
      .select(profileSelect)
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          createdAt: req.user.created_at,
        },
        profile: data || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const payload = normalizeProfilePayload(req.body);
    const validationError = validateProfilePayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("user_profiles")
      .upsert(
        {
          id: req.user.id,
          ...payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select(profileSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        profile: data,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
