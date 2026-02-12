//File: backend/worker.js

const { createClient } = require('ioredis');
const { io: emitter } = require('socket.io-emitter');
const db = require('./utils/database');
const cron = require('node-cron');
const pool = require('./utils/database');

const pub = new createClient(process.env.REDIS_URL);
pub.on('error', err => console.error('Redis Worker Client Error', err));

const ioEmitter = emitter(pub);

cron.schedule('* * * * *', async () => {
  console.log('Worker file loaded. Cron jobs will be scheduled here in the future.');
  const now = new Date();
  const classes = await db.query(
    'SELECT id FROM classes WHERE start_time BETWEEN $1 AND $2',
    [new Date(now - 30000), new Date(now + 60000)]
  );

  for (const cls of classes.rows) {
    const students = await db.query(
      'SELECT student_id FROM class_students WHERE class_id=$1',
      [cls.id]
    );

    for (const s of students.rows) {
      const exists = await db.query(
        'SELECT id FROM attendance WHERE class_id=$1 AND student_id=$2',
        [cls.id, s.student_id]
      );
      if (exists.rowCount === 0) {
        const insert = await db.query(
          'INSERT INTO attendance (class_id, student_id, timestamp, method) VALUES ($1,$2,$3,$4) RETURNING id',
          [cls.id, s.student_id, 'absent', now.toISOString(), 'auto']
        );

        const payload = { classId: cls.id, studentId: s.student_id, method: 'auto', timestamp: now.toISOString() };
        ioEmitter.to(`class_${cls.id}`).emit('attendance_updated', payload);
      }
    }
  }
});
