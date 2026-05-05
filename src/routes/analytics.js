const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const expenseSelect = `
  id,
  description,
  amount,
  expense_date,
  created_at,
  categories (
    id,
    name,
    color,
    icon
  )
`;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDateString = (date) => date.toISOString().slice(0, 10);

const parseDateString = (date) => {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

const getMonthRange = (date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const nextStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const end = new Date(nextStart);
  end.setUTCDate(end.getUTCDate() - 1);

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
};

const getMonthKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const getLastFiveMonthRange = (date) => {
  const months = Array.from({ length: 5 }, (_, index) => {
    const monthDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 4 + index, 1));

    return getMonthKey(monthDate);
  });
  const startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 4, 1));

  return {
    months,
    start: getMonthRange(startDate).start,
    end: getMonthRange(date).end,
  };
};

const sumExpenses = (expenses) =>
  expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);

const getInclusiveDayCount = (startDate, endDate) =>
  Math.floor((parseDateString(endDate) - parseDateString(startDate)) / MS_PER_DAY) + 1;

const getAverageDailyExpense = (totalAmount, range, currentDate = new Date()) => {
  const today = toDateString(currentDate);
  const effectiveEnd = range.end > today ? today : range.end;

  if (range.start > effectiveEnd) {
    return 0;
  }

  return totalAmount / getInclusiveDayCount(range.start, effectiveEnd);
};

const getPercentChange = (currentTotal, previousTotal) => {
  if (previousTotal === 0) {
    return currentTotal > 0 ? 100 : 0;
  }

  return ((currentTotal - previousTotal) / previousTotal) * 100;
};

const getCategoryBreakdown = (expenses) => {
  const totals = expenses.reduce((acc, expense) => {
    const category = expense.categories || {};
    const categoryId = category.id || "uncategorized";

    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryId,
        categoryName: category.name || "Uncategorized",
        color: category.color || "#3b82f6",
        totalAmount: 0,
        expenseCount: 0,
      };
    }

    acc[categoryId].totalAmount += Number(expense.amount || 0);
    acc[categoryId].expenseCount += 1;
    return acc;
  }, {});

  return Object.values(totals).sort((a, b) => b.totalAmount - a.totalAmount);
};

const getDailyBreakdown = (expenses) => {
  const totals = expenses.reduce((acc, expense) => {
    const date = expense.expense_date;

    if (!acc[date]) {
      acc[date] = {
        date,
        totalAmount: 0,
        expenseCount: 0,
      };
    }

    acc[date].totalAmount += Number(expense.amount || 0);
    acc[date].expenseCount += 1;
    return acc;
  }, {});

  return Object.values(totals).sort((a, b) => a.date.localeCompare(b.date));
};

const getMonthlyBreakdown = (expenses, monthKeys = []) => {
  const initialTotals = monthKeys.reduce((acc, month) => {
    acc[month] = {
      month,
      totalAmount: 0,
      expenseCount: 0,
    };

    return acc;
  }, {});

  const totals = expenses.reduce((acc, expense) => {
    const month = expense.expense_date.slice(0, 7);

    if (!acc[month]) {
      acc[month] = {
        month,
        totalAmount: 0,
        expenseCount: 0,
      };
    }

    acc[month].totalAmount += Number(expense.amount || 0);
    acc[month].expenseCount += 1;
    return acc;
  }, initialTotals);

  return Object.values(totals).sort((a, b) => a.month.localeCompare(b.month));
};

const isDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

const getReportRange = (query) => {
  if (query.month) {
    const [year, month] = String(query.month).split("-").map(Number);

    if (!year || !month || month < 1 || month > 12) {
      return { error: "Month must use YYYY-MM format." };
    }

    return getMonthRange(new Date(Date.UTC(year, month - 1, 1)));
  }

  if (!isDateString(query.startDate) || !isDateString(query.endDate)) {
    return { error: "Start date and end date are required." };
  }

  if (query.startDate > query.endDate) {
    return { error: "Start date cannot be after end date." };
  }

  return {
    start: query.startDate,
    end: query.endDate,
  };
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

router.get("/summary", async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = getMonthRange(now);
    const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const previousMonth = getMonthRange(previousMonthDate);
    const userSupabase = createUserSupabaseClient(req.accessToken);

    const [
      currentExpensesResult,
      previousExpensesResult,
      recentExpensesResult,
      profileResult,
      categoriesResult,
    ] = await Promise.all([
      userSupabase
        .from("expenses")
        .select(expenseSelect)
        .eq("user_id", req.user.id)
        .gte("expense_date", currentMonth.start)
        .lte("expense_date", currentMonth.end)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),
      userSupabase
        .from("expenses")
        .select("id, amount")
        .eq("user_id", req.user.id)
        .gte("expense_date", previousMonth.start)
        .lte("expense_date", previousMonth.end),
      userSupabase
        .from("expenses")
        .select(expenseSelect)
        .eq("user_id", req.user.id)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      userSupabase
        .from("user_profiles")
        .select("monthly_budget, default_currency")
        .eq("id", req.user.id)
        .maybeSingle(),
      userSupabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.user.id),
    ]);

    const results = [
      currentExpensesResult,
      previousExpensesResult,
      recentExpensesResult,
      profileResult,
      categoriesResult,
    ];
    const failedResult = results.find((result) => result.error);

    if (failedResult) {
      return next(new AppError(failedResult.error.message, 400));
    }

    const currentExpenses = currentExpensesResult.data || [];
    const previousExpenses = previousExpensesResult.data || [];
    const totalSpentThisMonth = sumExpenses(currentExpenses);
    const previousMonthTotal = sumExpenses(previousExpenses);
    const monthlyBudget = profileResult.data?.monthly_budget
      ? Number(profileResult.data.monthly_budget)
      : null;

    res.json({
      success: true,
      data: {
        summary: {
          totalSpentThisMonth,
          previousMonthTotal,
          percentChangeFromLastMonth: getPercentChange(totalSpentThisMonth, previousMonthTotal),
          totalExpensesThisMonth: currentExpenses.length,
          totalCategories: categoriesResult.count || 0,
          monthlyBudget,
          budgetRemaining: monthlyBudget === null ? null : monthlyBudget - totalSpentThisMonth,
          currency: profileResult.data?.default_currency || "INR",
          currentMonth,
          previousMonth,
        },
        recentExpenses: recentExpensesResult.data || [],
        spendingByCategory: getCategoryBreakdown(currentExpenses),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/expenses", async (req, res, next) => {
  try {
    const range = getReportRange(req.query);

    if (range.error) {
      return next(new AppError(range.error, 400));
    }

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const monthlyTrendRange = getLastFiveMonthRange(new Date());
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const buildReportQuery = () =>
      userSupabase
      .from("expenses")
      .select(expenseSelect, { count: "exact" })
      .eq("user_id", req.user.id)
      .gte("expense_date", range.start)
      .lte("expense_date", range.end)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    let reportQuery = buildReportQuery();
    let monthlyTrendQuery = userSupabase
      .from("expenses")
      .select("id, amount, expense_date")
      .eq("user_id", req.user.id)
      .gte("expense_date", monthlyTrendRange.start)
      .lte("expense_date", monthlyTrendRange.end);

    if (req.query.search) {
      reportQuery = reportQuery.ilike("description", `%${req.query.search}%`);
      monthlyTrendQuery = monthlyTrendQuery.ilike("description", `%${req.query.search}%`);
    }

    if (req.query.categoryId) {
      reportQuery = reportQuery.eq("category_id", req.query.categoryId);
      monthlyTrendQuery = monthlyTrendQuery.eq("category_id", req.query.categoryId);
    }

    let pagedReportQuery = buildReportQuery()
      .range(from, to);

    if (req.query.search) {
      pagedReportQuery = pagedReportQuery.ilike("description", `%${req.query.search}%`);
    }

    if (req.query.categoryId) {
      pagedReportQuery = pagedReportQuery.eq("category_id", req.query.categoryId);
    }

    const [summaryResult, reportResult, monthlyTrendResult] = await Promise.all([
      reportQuery,
      pagedReportQuery,
      monthlyTrendQuery,
    ]);
    const failedResult = [summaryResult, reportResult, monthlyTrendResult].find((result) => result.error);

    if (failedResult) {
      return next(new AppError(failedResult.error.message, 400));
    }

    const summaryExpenses = summaryResult.data || [];
    const expenses = reportResult.data || [];
    const monthlyTrendExpenses = monthlyTrendResult.data || [];
    const totalAmount = sumExpenses(summaryExpenses);
    const averageDailyExpense = getAverageDailyExpense(totalAmount, range);
    const total = summaryResult.count || 0;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        range,
        summary: {
          totalAmount,
          totalExpenses: total,
          averageDailyExpense,
          averageExpense: averageDailyExpense,
        },
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        spendingByCategory: getCategoryBreakdown(summaryExpenses),
        spendingByDate: getDailyBreakdown(summaryExpenses),
        spendingByMonth: getMonthlyBreakdown(monthlyTrendExpenses, monthlyTrendRange.months),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
