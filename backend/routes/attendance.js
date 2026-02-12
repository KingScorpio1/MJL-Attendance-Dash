// File: backend/routes/attendance.js

const express = require('express');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck'); // Assuming you want teachers to record attendance
const { getIo } = require('../socket'); // Import getIo to emit events

const router = express.Router();

// Get attendance for a class on a specific date
router.get('/', requireAuth, async (req, res) => {
  try {
    const { class_id, date } = req.query;

    if (!class_id || !date) {
      return res.status(400).json({ error: 'Class ID and date are required.' });
    }

    // Verify the user has access to this class (teacher_id match or admin)
    const classData = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [class_id]);

    if (classData.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    if (req.user.role === 'teacher' && classData.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get all students for the class, and their attendance for the specified date
    const attendance = await pool.query(`
      SELECT
          s.id AS student_id,
          s.name AS student_name,
          s.is_trial,
          cs.trial_count,
          COALESCE(a.status, 'pending') AS status, -- Default to 'pending' if no record
          a.method,
          a.timestamp, 
          a.notes
      FROM class_students cs
      JOIN students s ON cs.student_id = s.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = cs.class_id AND a.attendance_date = $2
      WHERE cs.class_id = $1
      ORDER BY s.name
    `, [class_id, date]);

    res.json(attendance.rows);
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: 'Server error fetching attendance.' });
  }
});

// Record or update attendance for a single student
router.post('/', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { class_id, student_id, status, method = 'manual', date = new Date().toISOString() } = req.body; // Added date

    if (!class_id || !student_id || !status) {
      return res.status(400).json({ error: 'Class ID, student ID, and status are required.' });
    }

    // Verify the user has access to this class (teacher_id match or admin)
    const classData = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [class_id]);

    if (classData.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    if (req.user.role === 'teacher' && classData.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(`
        SELECT id FROM attendance
        WHERE class_id = $1 AND student_id = $2 AND DATE(timestamp) = DATE($3)
      `, [class_id, student_id, date]);

      let attendanceRecordId;
      if (existing.rows.length > 0) {
        // Update existing attendance
        const updateRes = await client.query(
          'UPDATE attendance SET status = $1, method = $2, timestamp = NOW() WHERE id = $3 RETURNING id',
          [status, method, existing.rows[0].id]
        );
        attendanceRecordId = updateRes.rows[0].id;
      } else {
        // Create new attendance record
        const insertRes = await client.query(
          `INSERT INTO attendance (class_id, student_id, status, method, timestamp)
           VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
          [class_id, student_id, status, method]
        );
        attendanceRecordId = insertRes.rows[0].id;
      }
      await client.query('COMMIT');

      // Emit socket event for real-time update
      const io = getIo();
      if (io) {
        io.to(`class_${class_id}`).emit('attendance_updated', {
          classId: class_id,
          studentId: student_id,
          status: status, // Send the actual status
          method: 'manual',
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({ message: 'Attendance recorded successfully.', attendanceId: attendanceRecordId });
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Record attendance error:", error);
    res.status(500).json({ error: 'Server error recording attendance.' });
  }
});

// Bulk record attendance
router.post('/bulk', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { class_id, attendance_data, date } = req.body;
  if (!class_id || !Array.isArray(attendance_data) || !date) {
    return res.status(400).json({ error: 'Class ID, attendance data, and date are required.' });
  }

  const client = await pool.connect();
  try {
    console.log(`--- Starting Bulk Attendance Save for Class ID: ${class_id} on Date: ${date} ---`);
    await client.query('BEGIN');

    for (const record of attendance_data) {
      const { student_id, status } = record;
      const notes = record.notes || null;

      if (!student_id || !status) {
        console.error("Skipping invalid record:", record);
        continue; // Skip invalid records
      }

      // --- THIS IS THE CLASSIC, RELIABLE LOGIC ---

      // 1. Check if a record already exists for this exact student, class, and date.
      const existing = await client.query(
        'SELECT id FROM attendance WHERE class_id = $1 AND student_id = $2 AND attendance_date = $3',
        [class_id, student_id, date]
      );

      // 2. If it exists, UPDATE the existing record.
      if (existing.rows.length > 0) {
        const existingId = existing.rows[0].id;
        console.log(`  -> Updating existing record for Student ID: ${student_id} (Attendance ID: ${existingId}) with status: ${status}`);
        await client.query(
          'UPDATE attendance SET status = $1, notes = $2, method = $3, timestamp = NOW() WHERE id = $4',
          [status, notes, 'manual', existingId]
        );
      } 
      // 3. If it does NOT exist, INSERT a new record.
      else {
        console.log(`  -> Inserting new record for Student ID: ${student_id} with status: ${status}`);
        await client.query(
          'INSERT INTO attendance (class_id, student_id, attendance_date, status, notes, method, timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [class_id, student_id, date, status, notes, 'manual']
        );
      }
    }
    
    await client.query('COMMIT');
    console.log("--- Bulk Save Committed Successfully ---");
    // --- END OF RELIABLE LOGIC ---

    // Socket emit logic
    const io = getIo();
    attendance_data.forEach(record => {
        io.to(`class_${class_id}`).emit('attendance_updated', {
            classId: parseInt(class_id),
            studentId: record.student_id,
            status: record.status,
        });
    });

    res.status(201).json({ message: 'Attendance recorded successfully.' });
  } catch (transactionError) {
    await client.query('ROLLBACK');
    console.error("--- Bulk Attendance Transaction ROLLED BACK ---");
    console.error("Error during save:", transactionError);
    res.status(500).json({ error: 'Database error while saving attendance.' });
  } finally {
    client.release();
  }
});

// DELETE all attendance records for a specific class on a specific date
router.post('/session/cancel', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { class_id, date } = req.body;
        if (!class_id || !date) {
            return res.status(400).json({ error: 'Class ID and date are required.' });
        }

        // Security check: ensure the teacher is assigned to this class
        if (req.user.role === 'teacher') {
            const classCheck = await pool.query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2', [class_id, req.user.id]);
            if (classCheck.rowCount === 0) {
                return res.status(403).json({ error: "You can only cancel your own class sessions." });
            }
        }

        const result = await pool.query(
            'DELETE FROM attendance WHERE class_id = $1 AND attendance_date = $2',
            [class_id, date]
        );

        console.log(`Deleted ${result.rowCount} attendance records for class ${class_id} on ${date}.`);
        res.status(200).json({ message: `Session canceled and ${result.rowCount} records removed.` });

    } catch (err) {
        console.error("Error canceling session:", err);
        res.status(500).json({ error: 'Server error while canceling session.' });
    }
});

module.exports = router;