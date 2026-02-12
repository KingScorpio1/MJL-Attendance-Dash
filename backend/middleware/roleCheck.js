// File: backend/middleware/roleCheck.js
const { requireRole } = require('./auth');

// Convenience middleware for common role checks
const requireAdmin = requireRole(['admin']);
const requireTeacher = requireRole(['teacher']);
const requireTeacherOrAdmin = requireRole(['teacher', 'admin']);

module.exports = {
  requireAdmin,
  requireTeacher, 
  requireTeacherOrAdmin,
  requireRole
};