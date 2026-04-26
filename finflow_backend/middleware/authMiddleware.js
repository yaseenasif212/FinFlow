// finflow_backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware 1: Verify they are logged in AT ALL
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
    }

    try {
        // Strip the "Bearer " part from the token string
        const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'fallback_secret');
        req.user = verified; // Attach the decoded user payload to the request
        next(); // Move to the actual controller
    } catch (err) {
        res.status(400).json({ success: false, message: 'Invalid Token.' });
    }
};

// Middleware 2: Verify they are specifically an ADMIN
const verifyAdmin = (req, res, next) => {
    // This runs AFTER verifyToken, so req.user already exists
    if (req.user && req.user.role === 'Admin') {
        next(); // They are an Admin, let them through!
    } else {
        res.status(403).json({ success: false, message: 'Access Denied. Admin privileges required.' });
    }
};

module.exports = { verifyToken, verifyAdmin };