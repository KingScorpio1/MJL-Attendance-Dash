const pool = require('../utils/database');

class Student {
  static async findById(id) {
    const result = await pool.query('SELECT id, name, email, phone, is_trial FROM students WHERE id = $1', [id]);
    return result.rows[0];
  }

  // ... other student-related methods
}

module.exports = Student;