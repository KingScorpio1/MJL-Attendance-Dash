const pool = require('../utils/database');

class User {
  static async findById(id) {
    const result = await pool.query('SELECT id, username, role, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]); // Select all for password check
    return result.rows[0];
  }

  static async create(username, hashedPassword, role) {
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, hashedPassword, role]
    );
    return result.rows[0];
  }

  // Add more static methods for update, delete, get all etc., if desired.
  // For now, routes directly use pool.query for these, which is also fine.
}

module.exports = User;