require("dotenv").config();
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const HOST = "0.0.0.0";
const BASE_URL = process.env.BASE_URL || `http://localhost`;
const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.CORS_ORIGIN || "").split(","),
]
  .map((origin) => origin?.trim())
  .filter(Boolean);

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

const displayUrl = `${BASE_URL.replace(/\/+$/, "")}:${PORT}`;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || uniqueAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Expense Tracker API is running",
    version: "1.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});
app.use("/api", routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.path} does not exist`,
    path: req.path,
  });
});

// Error Handler Middleware (must be last)
app.use(errorHandler);

const startServer = () => {
  try {
    app.listen(PORT, HOST, () => {
      console.log(`
========================================
 Expense Tracker API - Running
 Environment: ${NODE_ENV}
 Port: ${PORT}
 Bind Host: ${HOST}
 URL: ${displayUrl}
========================================
`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
