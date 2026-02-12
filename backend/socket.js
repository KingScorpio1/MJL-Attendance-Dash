// File: backend/socket.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('./utils/database'); // Ensure this points to your db.js file

let io; // This will hold the io instance

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // No Redis for now to simplify and eliminate it as a source of errors
  // const pubClient = new Redis(process.env.REDIS_URL);
  // const subClient = pubClient.duplicate();
  // io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      // Use your middleware's logic: the payload just has the ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Attach the decoded token payload ({ userId, role })
      next();
    } catch(err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id, 'user', socket.user.userId);

    socket.on('join_class', (classId) => {
        // Simplified join for debugging
        console.log(`Socket ${socket.id} is joining class room: class_${classId}`);
        socket.join(`class_${classId}`);
    });

    socket.on('leave_class', (classId) => {
        console.log(`Socket ${socket.id} is leaving class room: class_${classId}`);
        socket.leave(`class_${classId}`);
    });

    socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
  });

  return io;
}

// THIS IS THE CRUCIAL EXPORT that was missing
function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = { initSocket, getIo };