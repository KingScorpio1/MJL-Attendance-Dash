// File: backend/routes/rooms.js
const express = require('express');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const rooms = await pool.query('SELECT * FROM rooms ORDER BY name');
        res.json(rooms.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching rooms.' });
    }
});

// POST a new room (admin only)
router.post('/', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Room name is required.' });

        const newRoom = await pool.query(
            'INSERT INTO rooms (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(newRoom.rows[0]);
    } catch (err) {
        // Handle potential duplicate name error
        if (err.code === '23505') {
            return res.status(400).json({ error: 'A room with this name already exists.' });
        }
        res.status(500).json({ error: 'Server error creating room.' });
    }
});

// PUT (update) a room (admin only)
router.put('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Room name is required.' });

        const updatedRoom = await pool.query(
            'UPDATE rooms SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        if (updatedRoom.rowCount === 0) return res.status(404).json({ error: 'Room not found.' });
        res.json(updatedRoom.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'A room with this name already exists.' });
        }
        res.status(500).json({ error: 'Server error updating room.' });
    }
});

// DELETE a room (admin only)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Room not found.' });
        res.status(204).send(); // 204 No Content is standard for a successful delete
    } catch (err) {
        res.status(500).json({ error: 'Server error deleting room.' });
    }
});
module.exports = router;