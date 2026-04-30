const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const expenseSelect = `
  id,
  user_id,
  category_id,
  description,
  amount,
  expense_date,
  notes,
  receipt_url,
  created_at,
  updated_at,
  categories (
    id,
    name,
    color,
    icon
  )
`;

const toExpensePayload = (body, userId) => ({
  user_id: userId,
  category_id: body.categoryId || body.category_id,
  description: String(body.description || "").trim(),
  amount: Number(body.amount),
  expense_date: body.expenseDate || body.expense_date,
  notes: body.notes ? String(body.notes).trim() : null,
});

const validateExpensePayload = (payload) => {
  if (!payload.description) {
    return "Description is required.";
  }

  if (!payload.category_id) {
    return "Category is required.";
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    return "Amount must be greater than 0.";
  }

  if (!payload.expense_date) {
    return "Expense date is required.";
  }

  return null;
};

router.get("/", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { search, date, categoryId } = req.query;

    let query = userSupabase
      .from("expenses")
      .select(expenseSelect)
      .eq("user_id", req.user.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("description", `%${search}%`);
    }

    if (date) {
      query = query.eq("expense_date", date);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      data: {
        expenses: data,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = toExpensePayload(req.body, req.user.id);
    const validationError = validateExpensePayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("expenses")
      .insert(payload)
      .select(expenseSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.status(201).json({
      success: true,
      message: "Expense created successfully.",
      data: {
        expense: data,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const payload = toExpensePayload(req.body, req.user.id);
    const validationError = validateExpensePayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    delete payload.user_id;

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("expenses")
      .update(payload)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select(expenseSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Expense updated successfully.",
      data: {
        expense: data,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { error } = await userSupabase
      .from("expenses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
