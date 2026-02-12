// File: backend/routes/students.js

const express = require('express');
const pool = require('../utils/database');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();
const studentFields = 'id, name, email, phone, is_trial, birthday, parent_info, username';

// Get all or necessary students
router.get('/', requireAuth, async (req, res) => {
  try {
    let query;
    const params = [];
    const studentFieldsWithAlias = 's.id, s.name, s.email, s.phone, s.is_trial, s.birthday, s.parent_info, s.username';

    if (req.user.role === 'teacher') {
      query = `
        SELECT DISTINCT ${studentFieldsWithAlias}
        FROM students s
        JOIN class_students cs ON s.id = cs.student_id
        JOIN classes c ON cs.class_id = c.id
        WHERE c.teacher_id = $1
        ORDER BY s.name;
      `;
      params.push(req.user.id);
    } else {
      // THE FIX: Use the alias 's' for the admin query as well for consistency
      // and ensure we are selecting from the 'students' table aliased as 's'.
      query = `SELECT ${studentFieldsWithAlias} FROM students s ORDER BY s.name`;
    }

    const students = await pool.query(query, params);
    res.json(students.rows);

  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({ error: 'Server error fetching students.' });
  }
});

// Get single` student
router.get('/:id', requireAuth,  async (req, res) => {
  try {
    const { id } = req.params;

    const student = await pool.query('SELECT id, name, email, phone, is_trial FROM students WHERE id = $1', [id]);

    if (student.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.json(student.rows[0]);
  } catch (error) {
    console.error("Get single student error:", error);
    res.status(500).json({ error: 'Server error fetching student.' });
  }
});

// Create student (admin only)
router.post('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, phone, is_trial, birthday, parent_info } = req.body; // ADDED parent_info
    const newStudent = await pool.query(
      `INSERT INTO students (name, email, phone, is_trial, birthday, parent_info) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${studentFields}`,
      [name, email, phone, is_trial || false, birthday || null, parent_info || null] // ADDED parent_info
    );
    res.status(201).json(newStudent.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Server error creating student.' }); }
});

// Update student (admin only)
router.put('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, is_trial, birthday, parent_info, username, password } = req.body;

    // Build the query dynamically
    const fields = [];
    const params = [];
    let paramIndex = 1;

    // Helper function to add fields to the query
    const addField = (name, value) => {
        fields.push(`${name} = $${paramIndex++}`);
        params.push(value);
    };

    if (name) addField('name', name);
    if (email) addField('email', email);
    if (phone) addField('phone', phone);
    if (is_trial !== undefined) addField('is_trial', is_trial);
    if (birthday) addField('birthday', birthday);
    if (parent_info) addField('parent_info', parent_info);
    if (username) addField('username', username);

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        fields.push(`password = $${paramIndex++}`);
        params.push(hashedPassword);
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
    }

    params.push(id);
    const updateQuery = `UPDATE students SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING ${studentFields}`;
    const result = await pool.query(updateQuery, params);  

    res.json(result.rows[0]);
  } catch (error) { 
    console.error("Update student error:", err);
    res.status(500).json({ error: 'Server error updating student.' }); 
  }
});


// Delete student (admin only)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student is enrolled in any classes
    const enrollments = await pool.query(
      'SELECT * FROM class_students WHERE student_id = $1',
      [id]
    );

    if (enrollments.rows.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete student. Please remove student from all classes first.'
      });
    }

    // Also delete any historical attendance records for this student
    await pool.query('DELETE FROM attendance WHERE student_id = $1', [id]);

    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ error: 'Server error deleting student.' });
  }
});

router.post('/bulk', requireAuth, requireRole(['admin']), async (req, res) => {
    const { students } = req.body; // Expect an array of student objects

    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: 'A non-empty array of students is required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let createdCount = 0;
        for (const student of students) {
            // Basic validation for each student
            if (!student.name || !student.email) {
                console.warn('Skipping invalid student record:', student);
                continue; // Skip this record and move to the next
            }
            
            await client.query(
                'INSERT INTO students (name, email, phone, is_trial, birthday) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
                [
                    student.name,
                    student.email,
                    student.phone || null,
                    student.is_trial || false,
                    student.birthday || null,
                ]
            );
            createdCount++;
        }
        await client.query('COMMIT');
        res.status(201).json({ message: `Successfully imported ${createdCount} students.` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Bulk student import error:", err);
        res.status(500).json({ error: 'An error occurred during the bulk import.' });
    } finally {
        client.release();
    }
});

// Make a student a regular student
router.post('/:id/make-regular', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { class_id } = req.body;
        
        await pool.query('UPDATE students SET is_trial = FALSE WHERE id = $1', [id]);
        
        // Also reset their trial count for this specific class
        await pool.query('UPDATE class_students SET trial_count = 0 WHERE student_id = $1 AND class_id = $2', [id, class_id]);
        
        res.json({ message: 'Student has been updated to regular status.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error updating student status.' });
    }
});

// Acknowledge and continue a trial
router.post('/:id/continue-trial', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    // This route doesn't need to do anything on the backend, as the trial_count was
    // already incremented when attendance was saved. We just need an endpoint to call.
    res.json({ message: 'Trial acknowledged.' });
});

module.exports = router;