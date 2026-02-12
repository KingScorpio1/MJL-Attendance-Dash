// File: backend/routes/materials.js

const express = require('express');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const router = express.Router();

// --- Get materials for a specific class ---
router.get('/class/:classId', requireAuth, async (req, res) => {
    try {
        const { classId } = req.params;
        const materials = await pool.query(
            'SELECT * FROM class_materials WHERE class_id = $1 ORDER BY created_at DESC',
            [classId]
        );
        res.json(materials.rows);
    } catch (err) {
        console.error("Error fetching materials for class:", err);
        res.status(500).json({ error: "Server error fetching class materials." });
    }
});

// --- Add new material ---
router.post('/', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { class_id, title, url, file_url } = req.body;

        if (!class_id || !title) {
            return res.status(400).json({ error: "Class ID and title are required." });
        }
        // A material must have EITHER a URL or a file_url
        if (!url && !file_url) {
            return res.status(400).json({ error: "A URL or an uploaded file is required." });
        }

        // Optional Security Check: Ensure the teacher is assigned to this class
        if (req.user.role === 'teacher') {
            const classCheck = await pool.query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2', [class_id, req.user.id]);
            if (classCheck.rowCount === 0) {
                return res.status(403).json({ error: "You can only add materials to your own classes." });
            }
        }

        const newMaterial = await pool.query(
            'INSERT INTO class_materials (class_id, title, url, file_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [class_id, title, url || null, file_url || null]
        );
        res.status(201).json(newMaterial.rows[0]);
    } catch (err) {
        console.error("Error creating material:", err);
        res.status(500).json({ error: "Server error creating material." });
    }
});

// --- PUT (update) a material ---
router.put('/:materialId', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { materialId } = req.params;
        const { title, url, file_url } = req.body;

        if (!title) return res.status(400).json({ error: "Title is required." });
        if (!url && !file_url) return res.status(400).json({ error: "A URL or an uploaded file is required." });

        const updatedMaterial = await pool.query(
            'UPDATE class_materials SET title = $1, url = $2, file_url = $3 WHERE id = $4 RETURNING *',
            [title, url || null, file_url || null, materialId]
        );

        if (updatedMaterial.rowCount === 0) {
            return res.status(404).json({ error: 'Material not found.' });
        }
        res.json(updatedMaterial.rows[0]);
    } catch (err) {
        console.error("Error updating material:", err);
        res.status(500).json({ error: 'Server error updating material.' });
    }
});


// ---DELETE a material ---
router.delete('/:materialId', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { materialId } = req.params;

        const result = await pool.query(
            'DELETE FROM class_materials WHERE id = $1', 
            [materialId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Material not found.' });
        }
        res.status(204).send(); // Success, no content to return
    } catch (err) {
        console.error("Error deleting material:", err);
        res.status(500).json({ error: 'Server error deleting material.' });
    }
});
module.exports = router;