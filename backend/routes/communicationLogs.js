// File: backend/routes/communicationLogs.js

const express = require('express');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get all logs for students in a specific class
router.get('/class/:classId', requireAuth, async (req, res) => {
    try {
        const { classId } = req.params;
        const logs = await pool.query(
            `SELECT cl.id, cl.note, cl.created_at, s.name as student_name, u.username as user_name 
             FROM communication_logs cl 
             JOIN students s ON cl.student_id = s.id 
             JOIN users u ON cl.user_id = u.id
             WHERE cl.student_id IN (SELECT student_id FROM class_students WHERE class_id = $1)
             ORDER BY cl.created_at DESC`, 
            [classId]
        );
        res.json(logs.rows);
    } catch (err) {
        console.error("Error fetching logs for class:", err);
        res.status(500).json({ error: "Server error fetching communication logs." });
    }
});

// POST a new log for a student
router.post('/', requireAuth, async (req, res) => {
    try {
        const { student_id, note } = req.body;
        const { id: user_id } = req.user; // Get the logged-in user's ID from the token

        if (!student_id || !note) {
            return res.status(400).json({ error: "Student ID and note are required." });
        }

        // Insert the new log
        const newLogResult = await pool.query(
            'INSERT INTO communication_logs (student_id, user_id, note) VALUES ($1, $2, $3) RETURNING id',
            [student_id, user_id, note]
        );
        
        // Fetch the full log details (with names) to return to the frontend for an instant UI update
        const newLog = await pool.query(
             `SELECT cl.id, cl.note, cl.created_at, s.name as student_name, u.username as user_name 
              FROM communication_logs cl
              JOIN students s ON cl.student_id = s.id
              JOIN users u ON cl.user_id = u.id
              WHERE cl.id = $1`,
              [newLogResult.rows[0].id]
        );

        res.status(201).json(newLog.rows[0]);
    } catch (err) {
        console.error("Error creating communication log:", err);
        res.status(500).json({ error: "Server error creating communication log." });
    }
});
module.exports = router;