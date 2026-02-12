// File: backend/routes/expenses.js

const express = require('express');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const router = express.Router();

// GET a teacher's own expenses
router.get('/my-expenses', requireAuth, requireRole(['teacher']), async (req, res) => {
    try {
        const expenses = await pool.query(
            'SELECT * FROM expenses WHERE teacher_id = $1 ORDER BY submitted_at DESC',
            [req.user.id]
        );
        res.json(expenses.rows);
    } catch (err) { res.status(500).json({ error: 'Server error fetching expenses.' }); }
});

// GET all expenses for admins/accountants
router.get('/all', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
    try {
        const expenses = await pool.query(
            `SELECT e.*, u.username as teacher_name FROM expenses e
             JOIN users u ON e.teacher_id = u.id
             ORDER BY e.submitted_at DESC`
        );
        res.json(expenses.rows);
    } catch (err) { res.status(500).json({ error: 'Server error fetching all expenses.' }); }
});

// POST a new expense claim (for teachers)
router.post('/', requireAuth, requireRole(['teacher']), async (req, res) => {
    try {
        const { description, amount, file_url } = req.body;
        if (!description || !amount) {
            return res.status(400).json({ error: 'Description and amount are required.' });
        }
        const newExpense = await pool.query(
            'INSERT INTO expenses (teacher_id, description, amount, file_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, description, amount, file_url]
        );
        res.status(201).json(newExpense.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error creating expense.' }); }
});

// PUT to update an expense status (for admins/accountants)
router.put('/:id/status', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }
        const updatedExpense = await pool.query(
            'UPDATE expenses SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (updatedExpense.rowCount === 0) return res.status(404).json({ error: 'Expense not found.' });
        res.json(updatedExpense.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error updating expense status.' }); }
});

module.exports = router;