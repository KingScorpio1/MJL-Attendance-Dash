const pool = require('../utils/database');

class Attendance {
  static async getForClassAndDate(classId, date) {
    const result = await pool.query(`
      SELECT
          s.id AS student_id,
          s.name AS student_name,
          s.is_trial,
          COALESCE(a.status, 'pending') AS status,
          a.method,
          a.timestamp
      FROM class_students cs
      JOIN students s ON cs.student_id = s.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = cs.class_id AND DATE(a.timestamp) = $2
      WHERE cs.class_id = $1
      ORDER BY s.name
    `, [classId, date]);
    return result.rows;
  }

  // ... other attendance-related methods
}

module.exports = Attendance;