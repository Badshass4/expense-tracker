const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const profileSelect =
  "id, full_name, avatar_url, default_currency, monthly_budget, theme, created_at, updated_at";
const categoryBudgetSelect = `
  id,
  category_id,
  limit_amount,
  alert_threshold,
  start_date,
  end_date,
  categories (
    id,
    name,
    color,
    icon
  )
`;

const DEFAULT_BUDGET_START = "1970-01-01";

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

const normalizeCategoryBudgetPayload = (budgets = []) =>
  budgets
    .filter((budget) => budget?.categoryId)
    .map((budget) => ({
      user_id: budget.userId,
      category_id: budget.categoryId,
      limit_amount: Number(budget.limitAmount),
      alert_threshold:
        budget.alertThreshold === undefined || budget.alertThreshold === null
          ? 0.8
          : Number(budget.alertThreshold),
      start_date: budget.startDate || DEFAULT_BUDGET_START,
      end_date: budget.endDate || null,
    }));

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

const validateCategoryBudgets = (budgets) => {
  for (const budget of budgets) {
    if (!budget.category_id) {
      return "Category is required for each budget.";
    }

    if (!Number.isFinite(budget.limit_amount) || budget.limit_amount <= 0) {
      return "Each category budget must be greater than 0.";
    }

    if (
      !Number.isFinite(budget.alert_threshold) ||
      budget.alert_threshold <= 0 ||
      budget.alert_threshold > 1
    ) {
      return "Budget alert threshold must be between 0 and 1.";
    }
  }

  return null;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const getBudgetStatus = (spentAmount, limitAmount, alertThreshold = 0.8) => {
  const safeLimit = Number(limitAmount || 0);
  const safeSpent = Number(spentAmount || 0);

  if (safeLimit <= 0) {
    return {
      spentAmount: safeSpent,
      limitAmount: safeLimit,
      remainingAmount: 0,
      usageRatio: 0,
      thresholdAmount: 0,
      isNearLimit: false,
      isOverLimit: false,
    };
  }

  const usageRatio = safeSpent / safeLimit;

  return {
    spentAmount: safeSpent,
    limitAmount: safeLimit,
    remainingAmount: safeLimit - safeSpent,
    usageRatio,
    thresholdAmount: safeLimit * alertThreshold,
    isNearLimit: usageRatio >= alertThreshold && usageRatio < 1,
    isOverLimit: usageRatio >= 1,
  };
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

router.get("/category-budgets", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const currentMonth = getCurrentMonthRange();

    const [categoriesResult, budgetsResult, spendingResult] = await Promise.all([
      userSupabase
        .from("categories")
        .select("id, name, color, icon")
        .order("name", { ascending: true }),
      userSupabase
        .from("budgets")
        .select(categoryBudgetSelect)
        .eq("user_id", req.user.id)
        .eq("start_date", DEFAULT_BUDGET_START),
      userSupabase
        .from("expenses")
        .select("category_id, amount")
        .eq("user_id", req.user.id)
        .gte("expense_date", currentMonth.start)
        .lte("expense_date", currentMonth.end),
    ]);

    const failedResult = [categoriesResult, budgetsResult, spendingResult].find((result) => result.error);

    if (failedResult) {
      return next(new AppError(failedResult.error.message, 400));
    }

    const budgetsByCategoryId = (budgetsResult.data || []).reduce((acc, budget) => {
      acc[budget.category_id] = budget;
      return acc;
    }, {});
    const spentByCategoryId = (spendingResult.data || []).reduce((acc, expense) => {
      const categoryId = expense.category_id;

      acc[categoryId] = (acc[categoryId] || 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    const categoryBudgets = (categoriesResult.data || []).map((category) => {
      const budget = budgetsByCategoryId[category.id] || null;
      const spentAmount = spentByCategoryId[category.id] || 0;
      const status = getBudgetStatus(spentAmount, budget?.limit_amount, budget?.alert_threshold || 0.8);

      return {
        categoryId: category.id,
        categoryName: category.name,
        color: category.color || "#3b82f6",
        icon: category.icon || "tag",
        budgetId: budget?.id || null,
        limitAmount: budget ? Number(budget.limit_amount) : null,
        alertThreshold: budget ? Number(budget.alert_threshold || 0.8) : 0.8,
        currentMonthSpent: spentAmount,
        ...status,
      };
    });

    res.json({
      success: true,
      data: {
        currentMonth,
        categoryBudgets,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/category-budgets", async (req, res, next) => {
  try {
    const budgets = normalizeCategoryBudgetPayload(
      (req.body?.categoryBudgets || []).map((budget) => ({
        ...budget,
        userId: req.user.id,
      })),
    );
    const validationError = validateCategoryBudgets(budgets);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { error: deleteAllError } = await userSupabase
      .from("budgets")
      .delete()
      .eq("user_id", req.user.id)
      .eq("start_date", DEFAULT_BUDGET_START);

    if (deleteAllError) {
      return next(new AppError(deleteAllError.message, 400));
    }

    if (budgets.length > 0) {
      const { error: upsertError } = await userSupabase
        .from("budgets")
        .upsert(
          budgets.map((budget) => ({
            ...budget,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,category_id,start_date" },
        );

      if (upsertError) {
        return next(new AppError(upsertError.message, 400));
      }
    }

    const { data, error } = await userSupabase
      .from("budgets")
      .select(categoryBudgetSelect)
      .eq("user_id", req.user.id)
      .eq("start_date", DEFAULT_BUDGET_START);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Category budgets updated successfully.",
      data: {
        categoryBudgets: data || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
