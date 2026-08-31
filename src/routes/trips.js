const express = require("express");
const { createUserSupabaseClient } = require("../config/supabase");
const AppError = require("../utils/errors");

const router = express.Router();

const tripSelect = "id, user_id, name, destination, start_date, end_date, notes, created_at, updated_at";

const toTripPayload = (body, userId) => ({
  user_id: userId,
  name: String(body.name || "").trim(),
  destination: body.destination ? String(body.destination).trim() : null,
  start_date: body.startDate || body.start_date || null,
  end_date: body.endDate || body.end_date || null,
  notes: body.notes ? String(body.notes).trim() : null,
  updated_at: new Date().toISOString(),
});

const validateTripPayload = (payload) => {
  if (!payload.name) return "Trip name is required.";
  if (payload.name.length > 100) return "Trip name must be 100 characters or fewer.";
  if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
    return "End date cannot be before the start date.";
  }
  return null;
};

router.get("/", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const [tripsResult, expensesResult] = await Promise.all([
      userSupabase.from("trips").select(tripSelect).eq("user_id", req.user.id).order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      userSupabase.from("expenses").select("trip_id, amount").eq("user_id", req.user.id).not("trip_id", "is", null),
    ]);

    const failedResult = [tripsResult, expensesResult].find((result) => result.error);
    if (failedResult) return next(new AppError(failedResult.error.message, 400));

    const totals = (expensesResult.data || []).reduce((summary, expense) => {
      const current = summary[expense.trip_id] || { totalAmount: 0, expenseCount: 0 };
      current.totalAmount += Number(expense.amount || 0);
      current.expenseCount += 1;
      summary[expense.trip_id] = current;
      return summary;
    }, {});

    res.json({
      success: true,
      data: {
        trips: (tripsResult.data || []).map((trip) => ({
          ...trip,
          totalAmount: totals[trip.id]?.totalAmount || 0,
          expenseCount: totals[trip.id]?.expenseCount || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = toTripPayload(req.body, req.user.id);
    const validationError = validateTripPayload(payload);
    if (validationError) return next(new AppError(validationError, 400));

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase.from("trips").insert(payload).select(tripSelect).single();
    if (error) return next(new AppError(error.message, 400));
    res.status(201).json({ success: true, message: "Trip created successfully.", data: { trip: data } });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const payload = toTripPayload(req.body, req.user.id);
    const validationError = validateTripPayload(payload);
    if (validationError) return next(new AppError(validationError, 400));
    delete payload.user_id;

    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { data, error } = await userSupabase.from("trips").update(payload).eq("id", req.params.id).eq("user_id", req.user.id).select(tripSelect).single();
    if (error) return next(new AppError(error.message, 400));
    res.json({ success: true, message: "Trip updated successfully.", data: { trip: data } });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userSupabase = createUserSupabaseClient(req.accessToken);
    const { error } = await userSupabase.from("trips").delete().eq("id", req.params.id).eq("user_id", req.user.id);
    if (error) return next(new AppError(error.message, 400));
    res.json({ success: true, message: "Trip deleted successfully." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
