/**
 * =========================================================
 * Lab: SECURE WEATHER DASHBOARD
 * =========================================================
 *
 * ===================================================================
 LAB SETUP INSTRUCTIONS
 * ===================================================================
 * 1) Initialize project and install dependencies:
 *     Run either of these commands:
 *      npm i
 *      OR
 *      npm install
 *      npm install express bcryptjs jsonwebtoken
 *
 *      If your system blocks running npm commands (especially on Windows PowerShell),
 *           run this command first to allow script execution:
 *           Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
 *
 * 2) JWT SECRET (for this lab):
 *    - In REAL projects, secrets come from .env:
 *        JWT_SECRET=someVerySecretString
 *    - For THIS LAB, we will use a fixed secret in code:
 *        const JWT_SECRET = "abc123";
 *      (Already defined for you below. Do NOT change it so tests pass.)
 *
 * 3) Start the server:
 *      node server.js
 *
 * 4) Health check:
 *    - METHOD: GET
 *      URL:    http://localhost:3000/
 *      EXPECT: text "Server is running"
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const JWT_SECRET = "abc123";

app.use(express.json());

// In-memory "database"
let users = [];

// Simple health check
app.get("/", (_req, res) => {
  res.send("Server is running");
});

// =========================
// POST /register
// =========================
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = users.find((u) => u.email === email);

    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    users.push({
      email,
      passwordHash: hash,
    });

    return res.status(201).json({ message: "User registered!" });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error during register" });
  }
});

// =========================
// POST /login
// =========================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
        { email },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login" });
  }
});

// =========================
// Protected Weather API
// GET /weather?city=Riyadh
// =========================
app.get("/weather", async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = auth.split(" ")[1];

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const city = req.query.city;

    if (!city) {
      return res.status(400).json({ error: "City required" });
    }

    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const weatherResponse = await fetch(url);

    if (!weatherResponse.ok) {
      return res.status(500).json({ error: "Error from weather API" });
    }

    const data = await weatherResponse.json();

    return res.json({
      city,
      temp: data.current_condition?.[0]?.temp_C || null,
      description: data.current_condition?.[0]?.weatherDesc?.[0]?.value || null,
      wind: data.current_condition?.[0]?.windspeedKmph || null,
      raw: data
    });
  } catch (err) {
    console.error("Weather error:", err);
    return res.status(500).json({ error: "Server error during weather fetch" });
  }
});

// Start server
app.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
);