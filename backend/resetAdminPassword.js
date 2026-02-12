// File: backend/resetAdminPassword.js

require('dotenv').config(); // Load environment variables from .env
const bcrypt = require('bcryptjs');
const pool = require('./utils/database'); // Make sure this path points to your main db connection file

async function resetPassword() {
  const newPassword = 'admin123';
  const usernameToUpdate = 'admin';

  try {
    console.log('Hashing new password...');
    // Hash the new password using the same library as your login route
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`Updating password for user: ${usernameToUpdate}`);
    // Update the user's password in the database
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPassword, usernameToUpdate]
    );

    if (result.rowCount === 0) {
      console.error(`Error: User '${usernameToUpdate}' not found. Please ensure the admin user exists.`);
    } else {
      console.log('Admin password has been reset successfully.');
    }
  } catch (err) {
    console.error('An error occurred during password reset:', err);
  } finally {
    // End the connection pool to allow the script to exit
    pool.end();
  }
}

// Run the function
resetPassword();