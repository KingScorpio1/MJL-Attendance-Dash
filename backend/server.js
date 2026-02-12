//File: backend/server.js

require('dotenv').config();

// --- THIS IS THE DEBUGGER ---
console.log("--- SERVER STARTING ---");
// console.log("DATABASE_URL being used:", process.env.DATABASE_URL);
console.log("-----------------------");
// --- END DEBUGGER ---

const express = require('express');
const cors = require('cors');
const http = require('http');
const { initSocket } = require('./socket'); // Only initSocket here
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const reportRoutes = require('./routes/reports');
const roomRoutes = require('./routes/rooms');
const materialRoutes = require('./routes/materials');
const communicationLogRoutes = require('./routes/communicationLogs');
const payrollRoutes = require('./routes/payroll');
const studentPortalRoutes = require('./routes/studentPortal');
const expenseRoutes = require('./routes/expenses');
const uploadRoutes = require('./routes/uploads');
const path = require('path'); // For serving static frontend files

const app = express();
const server = http.createServer(app);

// Initialize Socket.io (getIo will be used by other modules)
initSocket(server);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' })); // Configure CORS
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/logs', communicationLogRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  // THE FIX: Go up one level (..) then into frontend/build
  const buildPath = path.join(__dirname, '../frontend/build');

  app.use(express.static(buildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.FRONTEND_URL) {
    console.log(`CORS enabled for: ${process.env.FRONTEND_URL}`);
  }
});

module.exports = app;