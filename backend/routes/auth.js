// File: backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  console.log("\n--- NEW STAFF LOGIN ATTEMPT ---");
  try {
    const { username, password } = req.body;
    console.log(`[1/5] Login request received for user: '${username}'`);
    
    // 1. Check if username or password was provided
    if (!username || !password) {
      console.log("[FAIL] Username or password was not provided.");
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    
    // 2. Find user in database
    console.log(`[2/5] Searching database for user: '${username}'`);
    const userResult = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    
    // 3. If no user found, send error
    if (userResult.rows.length === 0) {
      console.log("[FAIL] User not found in database.");
      return res.status(400).json({ error: 'Invalid credentials(username).' });
    }
    
    const user = userResult.rows[0];
    console.log(`[3/5] User found in database. ID: ${user.id}, Role: ${user.role}`);
    console.log("[4/5] Comparing provided password with stored hash...");

    // 4. Compare password with hashed one
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    // 5. If password not correct, send error
    if (!isPasswordValid) {
      console.log("[FAIL] Password comparison failed. Passwords do not match.");
      return res.status(400).json({ error: 'Invalid credentials(password).' });
    }

    console.log("[SUCCESS] Password is valid!");
    console.log("[5/5] Creating security token...");

    // 6. If password match, create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role }, // Include role in token
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log("--- LOGIN SUCCEEDED ---");
    // 7. Send the token and user info back to the frontend
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error("--- LOGIN CRASHED ---");
    console.error("Login error:", error); // Log the actual error on the server
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    const validPassword = await bcrypt.compare(currentPassword, user.rows[0].password);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Student Login
router.post('/student/login', async (req, res) => {
  console.log("\n--- NEW STUDENT LOGIN ATTEMPT ---");
  try {
      const { username, password } = req.body;
      console.log(`[1/5] Login request received for user: '${username}'`);
      if (!username || !password) {
          console.log("[FAIL] Username or password was not provided.");
          return res.status(400).json({ error: 'Username and password are required.' });
      }

      console.log(`[2/5] Searching database for student: '${username}'`);
      const studentResult = await pool.query('SELECT * FROM students WHERE username = $1', [username]);

      if (studentResult.rows.length === 0) {
          console.log("[FAIL] User not found in database.");
          return res.status(400).json({ error: 'Invalid credentials.' });
      }
      const student = studentResult.rows[0];
      console.log(`[3/5] User found in database. ID: ${student.id}, Role: ${student.role}`);
      console.log("[4/5] Comparing provided password with stored hash...");

      if (!student.password) {
          return res.status(400).json({ error: 'This account has not been set up for login.' });
      }

      const isPasswordValid = await bcrypt.compare(password, student.password);
      if (!isPasswordValid) {
          console.log("[FAIL] Password comparison failed. Passwords do not match.");
          return res.status(400).json({ error: 'Invalid credentials.' });
      }

      console.log("[SUCCESS] Password is valid!");
      console.log("[5/5] Creating security token...");

      const tokenPayload = { id: student.id, username: student.username, name: student.name, role: 'student' };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

      console.log("--- LOGIN SUCCEEDED ---");

      res.json({ token, user: tokenPayload });
  } catch (error) {
      console.error("--- LOGIN CRASHED ---");
      console.error("Student login error:", error);
      res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

module.exports = router;