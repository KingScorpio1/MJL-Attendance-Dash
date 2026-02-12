// File: backend/routes/reports.js

const express = require('express');
const router = express.Router();
const pool = require('../utils/database'); // Corrected path to database utility
const { requireAuth } = require('../middleware/auth'); // Use your auth middleware
const { requireRole } = require('../middleware/roleCheck'); // To restrict report access if needed
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');
const { sendEmail } = require('../utils/emailService'); // Use the new email service

// Helper function to build report query and fetch data
async function getReportData(classId, fromDate, toDate, includeTrial, userId, userRole) {
  let query = `
    SELECT
        s.id AS student_id,
        s.name AS student_name,
        c.id AS class_id,
        c.name AS class_name,
        a.status AS attendance_status,
        a.timestamp AS attendance_timestamp,
        s.is_trial AS student_is_trial,
        u.username AS teacher_name,
        a.method AS attendance_method
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON a.class_id = c.id
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (classId) {
    query += ` AND c.id = $${paramIndex++}`;
    params.push(classId);
  }
  if (fromDate) {
    query += ` AND DATE(a.timestamp) >= $${paramIndex++}`;
    params.push(fromDate);
  }
  if (toDate) {
    query += ` AND DATE(a.timestamp) <= $${paramIndex++}`;
    params.push(toDate);
  }
  if (!includeTrial) { // If includeTrial is false, filter out trial students
    query += ` AND s.is_trial = FALSE`;
  }

  // Teachers can only see reports for their own classes
  if (userRole === 'teacher') {
    query += ` AND c.teacher_id = $${paramIndex++}`;
    params.push(userId);
  }

  query += ` ORDER BY class_name, student_name, attendance_timestamp ASC`;

  const result = await pool.query(query, params);
  return result.rows;
}

// Route to get attendance summary for dashboard charts
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        let query = `
            SELECT c.name AS class, a.attendance_date AS day,
                   COUNT(*) FILTER (WHERE a.status='present') AS present,
                   COUNT(*) FILTER (WHERE a.status='absent') AS absent,
                   COUNT(*) FILTER (WHERE a.status='late') AS late
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
        `;
        const params = [];

        if (role === 'teacher') {
            query += ` WHERE c.teacher_id = $1`;
            params.push(userId);
        }

        query += ` GROUP BY a.attendance_date, c.name ORDER BY day ASC, c.name ASC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching attendance summary:", err);
        res.status(500).json({ error: 'Server error fetching attendance summary.' });
    }
});

// Get overall attendance statistics (Today vs. Weekly)
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        let queryConditions = '';
        const params = [];

        if (role === 'teacher') {
            queryConditions = `WHERE c.teacher_id = $1`;
            params.push(userId);
        }

        const todayStats = await pool.query(
            `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'present') AS present
             FROM attendance a
             LEFT JOIN classes c ON a.class_id = c.id
             ${queryConditions ? `${queryConditions} AND` : 'WHERE'} a.attendance_date = CURRENT_DATE`,
            params
        );

        const weekStats = await pool.query(
            `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'present') AS present
             FROM attendance a
             LEFT JOIN classes c ON a.class_id = c.id
             ${queryConditions ? `${queryConditions} AND` : 'WHERE'} a.attendance_date >= CURRENT_DATE - INTERVAL '7 days'`,
            params
        );
        
        const todayPercentage = (todayStats.rows[0].total > 0) ? Math.round((todayStats.rows[0].present / todayStats.rows[0].total) * 100) : 0;
        const weekPercentage = (weekStats.rows[0].total > 0) ? Math.round((weekStats.rows[0].present / weekStats.rows[0].total) * 100) : 0;
            
        res.json({ today: todayPercentage, week: weekPercentage });
    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ error: 'Server error fetching stats.' });
    }
});

// Get the count of trial students
router.get('/stats/trial-count', requireAuth, async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        let query;
        const params = [];
        
        // If teacher, only count trial students in their classes
        if (role === 'teacher') {
            query = `
                SELECT COUNT(DISTINCT s.id) 
                FROM students s
                JOIN class_students cs ON s.id = cs.student_id
                JOIN classes c ON cs.class_id = c.id
                WHERE s.is_trial = TRUE AND c.teacher_id = $1
            `;
            params.push(userId);
        } else {
            // Admins see all trial students
            query = "SELECT COUNT(*) FROM students WHERE is_trial = TRUE";
        }
        
        const result = await pool.query(query, params);
        res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        console.error("Error fetching trial count:", err);
        res.status(500).json({ error: 'Server error fetching trial count.' });
    }
});

// Get the top 5 most absent students in the last 30 days
router.get('/stats/most-absent', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.name, COUNT(*) AS absent_count
            FROM attendance a
            JOIN students s ON s.id = a.student_id
            WHERE a.status = 'absent' AND a.timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY s.name
            ORDER BY absent_count DESC
            LIMIT 5;
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching absent stats.' });
    }
});

// CSV export
router.get('/attendance/csv', requireAuth, async (req, res) => {
  try {
    const { classId, fromDate, toDate, includeTrial = 'true' } = req.query; // includeTrial is string from query
    const reportData = await getReportData(
      classId,
      fromDate,
      toDate,
      includeTrial === 'true', // Convert back to boolean
      req.user.id,
      req.user.role
    );

    const fields = [
      { label: 'Student ID', value: 'student_id' },
      { label: 'Student Name', value: 'student_name' },
      { label: 'Class ID', value: 'class_id' },
      { label: 'Class Name', value: 'class_name' },
      { label: 'Teacher', value: 'teacher_name' },
      { label: 'Attendance Status', value: 'attendance_status' },
      { label: 'Timestamp', value: 'attendance_timestamp' },
      { label: 'Method', value: 'attendance_method' },
      { label: 'Is Trial Student', value: 'student_is_trial' }
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(reportData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`attendance_report_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("Error generating CSV report:", err);
    res.status(500).json({ error: 'Server error generating CSV report.' });
  }
});

// PDF export
router.get('/attendance/pdf', requireAuth, async (req, res) => {
  try {
    const { classId, fromDate, toDate, includeTrial = 'true' } = req.query;
    const reportData = await getReportData(
      classId,
      fromDate,
      toDate,
      includeTrial === 'true',
      req.user.id,
      req.user.role
    );

    const doc = new PDFDocument();
    const pdfBuffer = new streamBuffers.WritableStreamBuffer();
    doc.pipe(pdfBuffer);

    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated On: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    if (reportData.length === 0) {
      doc.fontSize(14).text('No attendance records found for the selected criteria.', { align: 'center' });
    } else {
      let currentClass = '';
      reportData.forEach(row => {
        if (row.class_name !== currentClass) {
          doc.moveDown();
          doc.fontSize(16).text(`Class: ${row.class_name} (Teacher: ${row.teacher_name || 'N/A'})`, { underline: true });
          doc.moveDown(0.5);
          currentClass = row.class_name;
        }
        const trialMark = row.student_is_trial ? ' (Trial)' : '';
        const timestamp = new Date(row.attendance_timestamp).toLocaleString();
        doc.fontSize(12).text(`  - ${row.student_name}${trialMark}: ${row.attendance_status} on ${timestamp} (${row.attendance_method})`);
      });
    }

    doc.end();
    await new Promise(resolve => pdfBuffer.on('finish', resolve));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${Date.now()}.pdf`);
    res.send(pdfBuffer.getContents());
  } catch (err) {
    console.error("Error generating PDF report:", err);
    res.status(500).json({ error: 'Server error generating PDF report.' });
  }
});

router.get('/student/:studentId/history', requireAuth, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Security Check: A teacher should only be able to see the history of students in their own classes.
        if (req.user.role === 'teacher') {
            const permissionCheck = await pool.query(
                `SELECT 1 FROM class_students cs
                 JOIN classes c ON cs.class_id = c.id
                 WHERE cs.student_id = $1 AND c.teacher_id = $2`,
                [studentId, req.user.id]
            );
            if (permissionCheck.rowCount === 0) {
                return res.status(403).json({ error: "You are not authorized to view this student's history." });
            }
        }

        const history = await pool.query(
            `SELECT 
                a.status AS attendance_status, 
                a.timestamp AS attendance_timestamp, 
                a.notes,
                c.name AS class_name
             FROM attendance a
             JOIN classes c ON a.class_id = c.id
             WHERE a.student_id = $1
             ORDER BY a.timestamp DESC`,
            [studentId]
        );
        res.json(history.rows);
    } catch (err) {
        console.error("Error fetching student history:", err);
        res.status(500).json({ error: 'Server error fetching student history.' });
    }
});

// Email CSV + PDF Report
router.post('/attendance/email', requireAuth, async (req, res) => {
  try {
    const { to, subject = 'Attendance Report', body = 'Please find the attached attendance report.', classId, fromDate, toDate, includeTrial = 'true' } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }

    const reportData = await getReportData(
      classId,
      fromDate,
      toDate,
      includeTrial === 'true',
      req.user.id,
      req.user.role
    );

    // Generate CSV
    const fields = [
      { label: 'Student Name', value: 'student_name' },
      { label: 'Class Name', value: 'class_name' },
      { label: 'Teacher', value: 'teacher_name' },
      { label: 'Attendance Status', value: 'attendance_status' },
      { label: 'Timestamp', value: 'attendance_timestamp' },
      { label: 'Method', value: 'attendance_method' },
      { label: 'Is Trial Student', value: 'student_is_trial' }
    ];
    const parser = new Parser({ fields });
    const csvContent = parser.parse(reportData);

    // Generate PDF in memory
    const pdfBuffer = new streamBuffers.WritableStreamBuffer();
    const doc = new PDFDocument();
    doc.pipe(pdfBuffer);

    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated On: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    if (reportData.length === 0) {
      doc.fontSize(14).text('No attendance records found for the selected criteria.', { align: 'center' });
    } else {
      let currentClass = '';
      reportData.forEach(row => {
        if (row.class_name !== currentClass) {
          doc.moveDown();
          doc.fontSize(16).text(`Class: ${row.class_name} (Teacher: ${row.teacher_name || 'N/A'})`, { underline: true });
          doc.moveDown(0.5);
          currentClass = row.class_name;
        }
        const trialMark = row.student_is_trial ? ' (Trial)' : '';
        const timestamp = new Date(row.attendance_timestamp).toLocaleString();
        doc.fontSize(12).text(`  - ${row.student_name}${trialMark}: ${row.attendance_status} on ${timestamp} (${row.attendance_method})`);
      });
    }
    doc.end();
    await new Promise(resolve => pdfBuffer.on('finish', resolve));

    // Send email using the utility service
    await sendEmail({
      to,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p><p>Please find the attached attendance report(s).</p>`,
      attachments: [
        { filename: 'attendance_report.csv', content: csvContent, contentType: 'text/csv' },
        { filename: 'attendance_report.pdf', content: pdfBuffer.getContents(), contentType: 'application/pdf' }
      ]
    });

    res.json({ success: true, message: 'Report emailed successfully!' });
  } catch (err) {
    console.error("Error emailing report:", err);
    res.status(500).json({ error: err.message || 'Server error emailing report.' });
  }
});

router.get('/super-admin-stats', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        // --- 1. Revenue Projections (for the current month) ---
        // This calculates the total value of all classes that will run this month, based on their rate and number of enrolled students.
        const revenueProjectionResult = await pool.query(`
            SELECT 
                SUM(c.rate * cs.student_count) AS projected_revenue
            FROM classes c
            JOIN (
                SELECT class_id, COUNT(student_id) AS student_count
                FROM class_students
                GROUP BY class_id
            ) cs ON c.id = cs.class_id;
        `);

        // --- 2. Teacher Performance (Attendance Rate per Teacher) ---
        // This calculates the percentage of 'present' or 'late' statuses for each teacher.
        const teacherPerformanceResult = await pool.query(`
            SELECT 
                u.username AS teacher_name,
                ROUND(
                    (COUNT(*) FILTER (WHERE a.status IN ('present', 'late')) * 100.0) / COUNT(*)
                ) AS attendance_rate
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            JOIN users u ON c.teacher_id = u.id
            WHERE u.role = 'teacher'
            GROUP BY u.username
            ORDER BY attendance_rate DESC;
        `);

        // --- 3. Student Retention (New vs. Retained This Month) ---
        // This is a simplified retention metric.
        // New Students = Created in the last 30 days.
        // Total Active Students = Attended at least one class in the last 30 days.
        const newStudentsResult = await pool.query(
            "SELECT COUNT(*) FROM students WHERE created_at >= NOW() - INTERVAL '30 days'"
        );
        const activeStudentsResult = await pool.query(
            "SELECT COUNT(DISTINCT student_id) FROM attendance WHERE timestamp >= NOW() - INTERVAL '30 days'"
        );
        
        const newStudents = parseInt(newStudentsResult.rows[0].count, 10);
        const totalActive = parseInt(activeStudentsResult.rows[0].count, 10);
        const retainedStudents = totalActive - newStudents;

        res.json({
            revenueProjection: parseFloat(revenueProjectionResult.rows[0].projected_revenue || 0).toFixed(2),
            teacherPerformance: teacherPerformanceResult.rows,
            studentRetention: {
                new: newStudents,
                retained: retainedStudents > 0 ? retainedStudents : 0,
                totalActive: totalActive
            }
        });

    } catch (err) {
        console.error("Error fetching super admin stats:", err);
        res.status(500).json({ error: 'Server error fetching super admin stats.' });
    }
});

module.exports = router;