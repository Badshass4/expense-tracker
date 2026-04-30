const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const categorySelect = "id, name, color, icon, description, created_at, updated_at";
const allowedIcons = new Set([
  "activity",
  "book-open",
  "briefcase",
  "coffee",
  "credit-card",
  "dollar-sign",
  "file-text",
  "gift",
  "heart",
  "home",
  "more-horizontal",
  "navigation",
  "scissors",
  "shopping-bag",
  "shopping-cart",
  "tag",
  "truck",
  "zap",
]);

const toCategoryPayload = (body, userId) => ({
  user_id: userId,
  name: String(body.name || "").trim(),
  color: body.color || "#3b82f6",
  icon: String(body.icon || "tag").trim(),
  description: body.description ? String(body.description).trim() : null,
});

const validateCategoryPayload = (payload) => {
  if (!payload.name) {
    return "Category name is required.";
  }

  if (payload.name.length > 50) {
    return "Category name must be 50 characters or fewer.";
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(payload.color)) {
    return "Category color must be a valid hex color.";
  }

  if (!allowedIcons.has(payload.icon)) {
    return "Please select a valid free icon.";
  }

  return null;
};

router.get("/", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("categories")
      .select(categorySelect)
      .order("name", { ascending: true });

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      data: {
        categories: data,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = toCategoryPayload(req.body, req.user.id);
    const validationError = validateCategoryPayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("categories")
      .insert(payload)
      .select(categorySelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: {
        category: data,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const payload = toCategoryPayload(req.body, req.user.id);
    const validationError = validateCategoryPayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    delete payload.user_id;

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("categories")
      .update(payload)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select(categorySelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Category updated successfully.",
      data: {
        category: data,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { count, error: countError } = await userSupabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("category_id", req.params.id)
      .eq("user_id", req.user.id);

    if (countError) {
      return next(new AppError(countError.message, 400));
    }

    if (count > 0) {
      return next(
        new AppError("This category is used by expenses. Move or delete those expenses first.", 409),
      );
    }

    const { error } = await userSupabase
      .from("categories")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
