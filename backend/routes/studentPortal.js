// File: backend/routes/studentPortal.js

const express = require('express');
const pool = require('../utils/database');
const { requireStudentAuth } = require('../middleware/auth');
const router = express.Router();

/*
// A middleware to check if the logged-in user has the 'student' role from their token
const requireStudentRole = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Access denied. Student role required.' });
    }
    next();
};
*/

// GET the logged-in student's own upcoming classes
router.get('/my-classes', requireStudentAuth, async (req, res) => {
    try {
        const studentId = req.user.id; // Get student ID from their token
        const classes = await pool.query(
            `SELECT c.id, c.name, c.start_time, c.end_time, c.day, u.username as teacher_name
             FROM classes c
             JOIN class_students cs ON c.id = cs.class_id
             LEFT JOIN users u ON c.teacher_id = u.id
             WHERE cs.student_id = $1
             ORDER BY c.day, c.start_time`,
            [studentId]
        );
        res.json(classes.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching classes.' });
    }
});

// GET the logged-in student's own attendance history
router.get('/my-attendance', requireStudentAuth, async (req, res) => {
    try {
        const studentId = req.user.id; // Get student ID from their token
        const attendance = await pool.query(
            `SELECT a.status, a.notes, a.attendance_date, c.name as class_name
             FROM attendance a
             JOIN classes c ON a.class_id = c.id
             WHERE a.student_id = $1
             ORDER BY a.attendance_date DESC
             LIMIT 10`, // Limit to the last 10 for the dashboard
            [studentId]
        );
        res.json(attendance.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching attendance.' });
    }
});

router.get('/my-materials', requireStudentAuth, async (req, res) => {
    try {
        const studentId = req.user.id;
        const materials = await pool.query(
            `SELECT m.id, m.title, m.url, c.name as class_name
             FROM class_materials m
             JOIN classes c ON m.class_id = c.id
             WHERE m.class_id IN (SELECT class_id FROM class_students WHERE student_id = $1)
             ORDER BY c.name, m.created_at DESC`,
            [studentId]
        );
        res.json(materials.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching materials.' });
    }
});

module.exports = router;