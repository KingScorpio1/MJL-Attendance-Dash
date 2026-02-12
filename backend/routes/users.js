// File: backend/routes/users.js

const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

// Get all users (admin only)
router.get('/', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
  try {
    const users = await pool.query(
      'SELECT id, username, role, color, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users.rows);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: 'Server error fetching users.' });
  }
});

// Create new user (admin only)
router.post('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { username, password, role, color, hourly_rate } = req.body;

    // Validate input
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required.' });
    }
    if (!['admin', 'teacher', 'accountant'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified. Must be "admin", "teacher", or "accountant".' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this username.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      'INSERT INTO users (username, password, role, color, hourly_rate) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, color, hourly_rate, created_at',
      [username, hashedPassword, role, color, hourly_rate]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: 'Server error creating user.' });
  }
});

// Update user (admin only)
router.put('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, password, color, hourly_rate } = req.body; // Added password for optional update

    // Validate input
    if (!username || !role) {
      return res.status(400).json({ error: 'Username and role are required.' });
    }
    if (!['admin', 'teacher', 'accountant'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified. Must be "admin", "teacher", or "accountant".' });
    }

    const fields = [];
    const params = [];
    let paramIndex = 1;

    fields.push(`username = $${paramIndex++}`);
    params.push(username);

    fields.push(`role = $${paramIndex++}`);
    params.push(role);

    fields.push(`color = $${paramIndex++}`);
    params.push(color || null);

    fields.push(`hourly_rate = $${paramIndex++}`);
    params.push(hourly_rate || 0.00);

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push(`password = $${paramIndex++}`);
      params.push(hashedPassword);
    }

    // Add the final ID parameter for the WHERE clause
    params.push(id);

    const updateQuery = `
      UPDATE users 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, username, role, color, created_at`;

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: 'Server error updating user.' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    // Optional: Reassign classes if deleting a teacher (or prevent deletion)
    const assignedClasses = await pool.query('SELECT id FROM classes WHERE teacher_id = $1', [id]);
    if (assignedClasses.rows.length > 0) {
        return res.status(400).json({ error: 'Cannot delete user. This user is assigned to one or more classes. Please reassign their classes first.' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: 'Server error deleting user.' });
  }
});

module.exports = router;