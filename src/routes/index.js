const express = require("express");
const authMiddleware = require("../middleware/auth");

// Import route files (we'll create these next)
// const authRoutes = require('./auth');
// const expenseRoutes = require('./expenses');
// const categoryRoutes = require('./categories');
// const analyticsRoutes = require('./analytics');

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Routes will be added here
// router.use('/auth', authRoutes);
// router.use('/expenses', authMiddleware, expenseRoutes);
// router.use('/categories', authMiddleware, categoryRoutes);
// router.use('/analytics', authMiddleware, analyticsRoutes);

module.exports = router;
