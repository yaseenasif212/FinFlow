
const jwt = require('jsonwebtoken');


const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'fallback_secret');
        req.user = verified; 
        next(); 
    } catch (err) {
        res.status(400).json({ success: false, message: 'Invalid Token.' });
    }
};


const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next(); 
    } else {
        res.status(403).json({ success: false, message: 'Access Denied. Admin privileges required.' });
    }
};

module.exports = { verifyToken, verifyAdmin };