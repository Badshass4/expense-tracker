const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const savingsGoalSelect =
  "id, user_id, name, target_amount, current_amount, target_date, color, notes, created_at, updated_at";

const toSavingsGoalPayload = (body, userId) => ({
  user_id: userId,
  name: String(body.name || "").trim(),
  target_amount: Number(body.targetAmount ?? body.target_amount),
  current_amount: Number(body.currentAmount ?? body.current_amount ?? 0),
  target_date: body.targetDate || body.target_date || null,
  color: body.color ? String(body.color).trim() : "#2563eb",
  notes: body.notes ? String(body.notes).trim() : null,
  updated_at: new Date().toISOString(),
});

const validateSavingsGoalPayload = (payload) => {
  if (!payload.name) {
    return "Goal name is required.";
  }

  if (payload.name.length > 100) {
    return "Goal name must be 100 characters or fewer.";
  }

  if (!Number.isFinite(payload.target_amount) || payload.target_amount <= 0) {
    return "Target amount must be greater than 0.";
  }

  if (!Number.isFinite(payload.current_amount) || payload.current_amount < 0) {
    return "Current saved amount must be 0 or greater.";
  }

  if (
    Number.isFinite(payload.target_amount) &&
    Number.isFinite(payload.current_amount) &&
    payload.current_amount > payload.target_amount
  ) {
    return "Current saved amount cannot be more than the target amount.";
  }

  if (!/^#[0-9a-f]{6}$/i.test(payload.color)) {
    return "Please select a valid goal color.";
  }

  return null;
};

router.get("/", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("savings_goals")
      .select(savingsGoalSelect)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      data: {
        savingsGoals: data || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = toSavingsGoalPayload(req.body, req.user.id);
    const validationError = validateSavingsGoalPayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("savings_goals")
      .insert(payload)
      .select(savingsGoalSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.status(201).json({
      success: true,
      message: "Savings goal created successfully.",
      data: { savingsGoal: data },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const payload = toSavingsGoalPayload(req.body, req.user.id);
    const validationError = validateSavingsGoalPayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    delete payload.user_id;

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("savings_goals")
      .update(payload)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select(savingsGoalSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Savings goal updated successfully.",
      data: { savingsGoal: data },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { error } = await userSupabase
      .from("savings_goals")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({ success: true, message: "Savings goal deleted successfully." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
