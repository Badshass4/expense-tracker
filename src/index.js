require("dotenv").config();
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || "http://localhost";
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = allowedOrigins.length
  ? {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
    }
  : {};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Expense Tracker API is running",
  });
});
app.use("/api", routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error Handler Middleware (must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, BASE_URL, () => {
  console.log(`Server running on http://${BASE_URL}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
