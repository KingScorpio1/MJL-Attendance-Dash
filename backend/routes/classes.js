// File: backend/routes/classes.js

const express = require('express');
const pool = require('../utils/database'); //utils/database
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

// Get all classes - using DISTINCT ON approach
router.get('/', requireAuth, async (req, res) => {
  try {
    // This query uses a subquery to count students, which is the most reliable way.
    let query = `
      SELECT 
        c.id, 
        c.name, 
        c.start_time, 
        c.end_time, 
        c.day, 
        c.teacher_id,
        u.username AS teacher_name,
        u.color AS teacher_color,
        r.name AS room_name,
        (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS student_count
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN rooms r ON c.room_id = r.id
    `;
    const params = [];

    if (req.user.role === 'teacher') {
      query += ` WHERE c.teacher_id = $1`;
      params.push(req.user.id);
    }
    
    query += ` ORDER BY c.day, c.start_time`;

    const classes = await pool.query(query, params);
    res.json(classes.rows);
  } catch (error) {
    console.error("Get all classes error:", error);
    res.status(500).json({ error: 'Server error fetching classes.' });
  }
});
// Get single class
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await pool.query(`
      SELECT c.id, c.name, c.start_time, c.end_time, c.day, c.teacher_id, u.username AS teacher_name
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (classData.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    // Check if teacher is accessing their own class
    if (req.user.role === 'teacher' && classData.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(classData.rows[0]);
  } catch (error) {
    console.error("Get single class error:", error);
    res.status(500).json({ error: 'Server error fetching class.' });
  }
});

// Create class (admin only)
router.post('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, start_time, end_time, day, teacher_id, room_id, rate} = req.body;

    // Validate input
    if (!name || !start_time || !end_time || !day || !teacher_id) {
      return res.status(400).json({ error: 'All class fields are required.' });
    }

    const newClass = await pool.query(
      `INSERT INTO classes (name, start_time, end_time, day, teacher_id, room_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, start_time, end_time, day, teacher_id, room_id || null]
    );

    res.status(201).json(newClass.rows[0]);
  } catch (error) {
    console.error("Create class error:", error);
    res.status(500).json({ error: 'Server error creating class.' });
  }
});

// Update class (admin only)
router.put('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, day, teacher_id, room_id} = req.body;

    // Validate input
    if (!name || !start_time || !end_time || !day || !teacher_id) {
      return res.status(400).json({ error: 'All class fields are required.' });
    }

    const updatedClass = await pool.query(
      `UPDATE classes
       SET name = $1, start_time = $2, end_time = $3, day = $4, teacher_id = $5, room_id=$6 
       WHERE id=$7
       RETURNING *`,
      [name, start_time, end_time, day, teacher_id, room_id || null, rate || 0.00, id]
    );

    if (updatedClass.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    res.json(updatedClass.rows[0]);
  } catch (error) {
    console.error("Update class error:", error);
    res.status(500).json({ error: 'Server error updating class.' });
  }
});

// Delete class (admin only)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Delete related attendance records and class_students entries
    // This should ideally be handled by CASCADE DELETE in the database schema.
    // If not, explicitly delete them here:
    await pool.query('DELETE FROM attendance WHERE class_id = $1', [id]);
    await pool.query('DELETE FROM class_students WHERE class_id = $1', [id]);

    const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    res.json({ message: 'Class deleted successfully.' });
  } catch (error) {
    console.error("Delete class error:", error);
    res.status(500).json({ error: 'Server error deleting class.' });
  }
});

// Get students for a class
router.get('/:id/students', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the user has access to this class (teacher_id match or admin)
    const classData = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);

    if (classData.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    if (req.user.role === 'teacher' && classData.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const Class = require('../models/Class');
    const students = await Class.getStudentsInClass(id);
    res.json(students);
  } catch (error) {
    console.error("Get students for class error:", error);
    res.status(500).json({ error: 'Server error fetching students for class.' });
  }
});

// Add student to class (admin only)
router.post('/:id/students', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id: classId } = req.params;
    const { student_id, is_trial } = req.body;

    // Validate input
    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required.' });
    }

    // Check if student is already in class
    const existing = await pool.query(
      'SELECT * FROM class_students WHERE class_id = $1 AND student_id = $2',
      [classId, student_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Student is already in this class.' });
    }

    await pool.query(
      'INSERT INTO class_students (class_id, student_id, is_trial) VALUES ($1, $2, $3)',
      [classId, student_id, is_trial || false]
    );

    res.status(201).json({ message: 'Student added to class successfully.' });
  } catch (error) {
    console.error("Add student to class error:", error);
    res.status(500).json({ error: 'Server error adding student to class.' });
  }
});

// Remove student from class (admin only)
router.delete('/:classId/students/:studentId', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const result = await pool.query(
      'DELETE FROM class_students WHERE class_id = $1 AND student_id = $2 RETURNING *',
      [classId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found in this class.' });
    }

    res.json({ message: 'Student removed from class successfully.' });
  } catch (error) {
    console.error("Remove student from class error:", error);
    res.status(500).json({ error: 'Server error removing student from class.' });
  }
});

module.exports = router;