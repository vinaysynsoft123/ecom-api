const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");

/**
 * REGISTER
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body; // destructuring

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // check existing user
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert user
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role || "user", status || "active"],
    );

    // generate token
    const token = generateToken({
      id: result.insertId,
      email,
      role: role || "user",
      status: status || "active",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Register failed",
      error: error.message,
    });
  }
};

/**
 * LOGIN
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email & password required",
      });
    }

    // find user
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // check status
    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        message: "Your account is not active. Please contact admin.",
      });
    }

    // generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

module.exports = { register, login };
