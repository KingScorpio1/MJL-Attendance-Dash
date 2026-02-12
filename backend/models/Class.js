const pool = require('../utils/database');

class Class {
  static async findById(id) {
    const result = await pool.query('SELECT id, name, start_time, end_time, day, teacher_id FROM classes WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async getStudentsInClass(classId) {
    const result = await pool.query(`
      SELECT s.id, s.name, s.email, s.phone, s.is_trial, cs.is_trial as class_student_is_trial
      FROM students s
      JOIN class_students cs ON s.id = cs.student_id
      WHERE cs.class_id = $1
      ORDER BY s.name
    `, [classId]);
    return result.rows;
  }
  // ... other class-related methods
}

module.exports = Class;