const express = require("express");
const authMiddleware = require("../middleware/auth");

const authRoutes = require("./auth");
const expenseRoutes = require("./expenses");
const categoryRoutes = require("./categories");
const analyticsRoutes = require("./analytics");
const profileRoutes = require("./profile");

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

router.use("/auth", authRoutes);
router.use("/expenses", authMiddleware, expenseRoutes);
router.use("/categories", authMiddleware, categoryRoutes);
router.use("/analytics", authMiddleware, analyticsRoutes);
router.use("/profile", authMiddleware, profileRoutes);

module.exports = router;
