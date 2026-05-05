const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const accountSelect =
  "id, user_id, name, balance, color, notes, created_at, updated_at";
const incomeSelect =
  "id, user_id, source, amount, income_type, frequency, income_date, start_date, end_date, is_active, notes, created_at, updated_at";

const toDateString = (date) => date.toISOString().slice(0, 10);

const getMonthRange = (date = new Date()) => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  );

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const sumAmounts = (items) =>
  items.reduce((total, item) => total + Number(item.amount || 0), 0);

const getIncomeContributionForMonth = (income, range) => {
  const amount = Number(income.amount || 0);

  if (!income.is_active) {
    return 0;
  }

  if (income.income_type === "one-time") {
    return income.income_date >= range.start && income.income_date <= range.end
      ? amount
      : 0;
  }

  const startsBeforeMonthEnds =
    !income.start_date || income.start_date <= range.end;
  const endsAfterMonthStarts =
    !income.end_date || income.end_date >= range.start;

  return startsBeforeMonthEnds && endsAfterMonthStarts ? amount : 0;
};

const toAccountPayload = (body, userId) => ({
  user_id: userId,
  name: String(body.name || "").trim(),
  balance: Number(body.balance),
  color: body.color ? String(body.color).trim() : "#111827",
  notes: body.notes ? String(body.notes).trim() : null,
  updated_at: new Date().toISOString(),
});

const validateAccountPayload = (payload) => {
  if (!payload.name) {
    return "Account name is required.";
  }

  if (payload.name.length > 80) {
    return "Account name must be 80 characters or fewer.";
  }

  if (!Number.isFinite(payload.balance) || payload.balance < 0) {
    return "Balance must be 0 or greater.";
  }

  if (!/^#[0-9a-f]{6}$/i.test(payload.color)) {
    return "Please select a valid tile color.";
  }

  return null;
};

const toIncomePayload = (body, userId) => {
  const incomeType = String(
    body.incomeType || body.income_type || "one-time",
  ).trim();

  return {
    user_id: userId,
    source: String(body.source || "").trim(),
    amount: Number(body.amount),
    income_type: incomeType,
    frequency:
      incomeType === "recurring"
        ? String(body.frequency || "monthly").trim()
        : null,
    income_date:
      incomeType === "one-time" ? body.incomeDate || body.income_date : null,
    start_date:
      incomeType === "recurring" ? body.startDate || body.start_date : null,
    end_date:
      incomeType === "recurring" ? body.endDate || body.end_date || null : null,
    is_active: body.isActive === undefined ? true : Boolean(body.isActive),
    notes: body.notes ? String(body.notes).trim() : null,
    updated_at: new Date().toISOString(),
  };
};

const validateIncomePayload = (payload) => {
  if (!payload.source) {
    return "Income source is required.";
  }

  if (payload.source.length > 120) {
    return "Income source must be 120 characters or fewer.";
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    return "Income amount must be greater than 0.";
  }

  if (!["one-time", "recurring"].includes(payload.income_type)) {
    return "Please select a valid income type.";
  }

  if (payload.income_type === "one-time" && !payload.income_date) {
    return "Income date is required.";
  }

  if (payload.income_type === "recurring" && !payload.start_date) {
    return "Recurring income start date is required.";
  }

  if (payload.frequency && payload.frequency !== "monthly") {
    return "Only monthly recurring income is supported right now.";
  }

  if (
    payload.start_date &&
    payload.end_date &&
    payload.start_date > payload.end_date
  ) {
    return "End date cannot be before start date.";
  }

  return null;
};

router.get("/summary", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const currentMonth = getMonthRange();

    const [accountsResult, incomeResult, expensesResult] = await Promise.all([
      userSupabase
        .from("cash_accounts")
        .select(accountSelect)
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: true }),
      userSupabase
        .from("income_entries")
        .select(incomeSelect)
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false }),
      userSupabase
        .from("expenses")
        .select("amount")
        .eq("user_id", req.user.id)
        .gte("expense_date", currentMonth.start)
        .lte("expense_date", currentMonth.end),
    ]);

    const failedResult = [accountsResult, incomeResult, expensesResult].find(
      (result) => result.error,
    );

    if (failedResult) {
      return next(new AppError(failedResult.error.message, 400));
    }

    const accounts = accountsResult.data || [];
    const incomes = incomeResult.data || [];
    const monthlyIncome = incomes.reduce(
      (total, income) =>
        total + getIncomeContributionForMonth(income, currentMonth),
      0,
    );
    const monthlyExpenses = sumAmounts(expensesResult.data || []);
    const totalBalance = accounts.reduce(
      (total, account) => total + Number(account.balance || 0),
      0,
    );
    const monthlyCashFlow = monthlyIncome - monthlyExpenses;

    res.json({
      success: true,
      data: {
        currentMonth,
        summary: {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          monthlyCashFlow,
          projectedBalance: totalBalance + monthlyCashFlow,
          savingsRate:
            monthlyIncome > 0 ? (monthlyCashFlow / monthlyIncome) * 100 : 0,
        },
        accounts,
        incomeEntries: incomes,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/accounts", async (req, res, next) => {
  try {
    const payload = toAccountPayload(req.body, req.user.id);
    const validationError = validateAccountPayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("cash_accounts")
      .insert(payload)
      .select(accountSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.status(201).json({
      success: true,
      message: "Bank created successfully.",
      data: { account: data },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/accounts/:id", async (req, res, next) => {
  try {
    const payload = toAccountPayload(req.body, req.user.id);
    const validationError = validateAccountPayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    delete payload.user_id;

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("cash_accounts")
      .update(payload)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select(accountSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Bank updated successfully.",
      data: { account: data },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/accounts/:id", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { error } = await userSupabase
      .from("cash_accounts")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({ success: true, message: "Bank deleted successfully." });
  } catch (error) {
    next(error);
  }
});

router.post("/entries", async (req, res, next) => {
  try {
    const payload = toIncomePayload(req.body, req.user.id);
    const validationError = validateIncomePayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("income_entries")
      .insert(payload)
      .select(incomeSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.status(201).json({
      success: true,
      message: "Income entry created successfully.",
      data: { incomeEntry: data },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/entries/:id", async (req, res, next) => {
  try {
    const payload = toIncomePayload(req.body, req.user.id);
    const validationError = validateIncomePayload(payload);

    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    delete payload.user_id;

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase
      .from("income_entries")
      .update(payload)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select(incomeSelect)
      .single();

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({
      success: true,
      message: "Income entry updated successfully.",
      data: { incomeEntry: data },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/entries/:id", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { error } = await userSupabase
      .from("income_entries")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    res.json({ success: true, message: "Income entry deleted successfully." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
