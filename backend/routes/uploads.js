// File: backend/routes/uploads.js
const express = require('express');
const cloudinary = require('cloudinary').v2;
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

CLOUDINARY_API_KEY = 223687556945912;

// Configure Cloudinary with your credentials from the .env file
cloudinary.config({
    cloud_name: process.env.disyeindv,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.nceyLiMIwNmZJFduwZfgryb7FVk,
});

// This endpoint generates a signature for a secure, direct upload
router.get('/signature', requireAuth, (req, res) => {
    const timestamp = Math.round((new Date).getTime()/1000);
    
    // Use the API secret to create a signature
    const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
    }, process.env.CLOUDINARY_API_SECRET);

    res.json({ timestamp, signature });
});

module.exports = router;