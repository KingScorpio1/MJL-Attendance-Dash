// File: backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const pool = require('../utils/database');

// Middleware to verify JWT token
const requireAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication failed. No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Get user from database
    const userResult = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireStudentAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Security check: ensure the token is specifically for a student
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student authentication required.' });
    }

    // This is the key difference: We trust the token and attach its payload directly.
    // We DO NOT query the database here.
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token.' });
  }
};

// Middleware to require specific roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

// Optional: Admin-only middleware
const requireAdmin = requireRole(['admin']);

// Optional: Teacher-or-admin middleware  
const requireTeacherOrAdmin = requireRole(['teacher', 'admin']);

module.exports = {
  requireAuth,
  requireStudentAuth,
  requireRole,
  requireAdmin,
  requireTeacherOrAdmin
};